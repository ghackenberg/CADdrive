import { existsSync, mkdirSync } from 'fs'

import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import shortid from 'shortid'
import { FindOptionsWhere, IsNull } from 'typeorm'

import { Issue, IssueAddData, IssueUpdateData, IssueREST, TagAssignment } from 'productboard-common'
import { Database, IssueEntity } from 'productboard-database'

import { convertIssue } from '../../../functions/convert'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class IssueService implements IssueREST {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {
        if (!existsSync('./uploads')) {
            mkdirSync('./uploads')
        }
    }

    async findIssues(productId: string, milestoneId?: string, state?: 'open' | 'closed', tagIds?: string[]): Promise<Issue[]> {
        const result: Issue[] = []
        let where: FindOptionsWhere<IssueEntity>
        if (productId && milestoneId && state)
            where = { productId, milestoneId, state, deleted: IsNull() }
        else if (productId && milestoneId)
            where = { productId, milestoneId, deleted: IsNull() }
        else if (productId && state)
            where = { productId, state, deleted: IsNull() }
        else if (productId)
            where = { productId, deleted: IsNull() }
        if (tagIds) {
            // TODO: Optimize Performence
            const tagAssignments: TagAssignment[] = []
            for (const tagId of tagIds) {
                for (const tagAssignment of await Database.get().tagAssignmentRepository.findBy({ tagId, deleted: IsNull() })) {
                    tagAssignments.push(tagAssignment)
                }
            }
            for (const tagAssignment of tagAssignments) {
                if (!result.find(res => res.id == tagAssignment.issueId)) {
                    const allTagIdsPresent = tagIds.every(tagId => tagAssignments.filter(assignment => assignment.issueId == tagAssignment.issueId).some(assignment => assignment.tagId === tagId));
                    if (allTagIdsPresent) {
                        const mergedWhere = { id: tagAssignment.issueId, ...where  }
                        const issue = await Database.get().issueRepository.findOneBy(mergedWhere)
                        issue && result.push(convertIssue(issue))
                    }
                }
            }
        }
        else if (!tagIds) {
            for (const issue of await Database.get().issueRepository.findBy(where))
                result.push(convertIssue(issue))
        }
        return result
    }

    async addIssue(data: IssueAddData): Promise<Issue> {
        console.table('service')
        console.table(data)
        const id = shortid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.id
        const state = 'open'
        const issue = await Database.get().issueRepository.save({ id, created, updated, userId, state, ...data })
        return convertIssue(issue)
    }

    async getIssue(id: string): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        return convertIssue(issue)
    }

    async updateIssue(id: string, data: IssueUpdateData): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        issue.updated = Date.now()
        issue.assigneeIds = data.assigneeIds
        issue.name = data.name
        issue.milestoneId = data.milestoneId
        issue.description = data.description
        await Database.get().issueRepository.save(issue)
        return convertIssue(issue)
    }

    async deleteIssue(id: string): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        issue.deleted = Date.now()
        issue.updated = issue.deleted
        await Database.get().commentRepository.update({ issueId: issue.id }, { deleted: issue.deleted, updated: issue.updated })
        await Database.get().tagAssignmentRepository.update({ issueId: issue.id }, {  deleted: issue.deleted, updated: issue.updated })
        await Database.get().issueRepository.save(issue)
        return convertIssue(issue)
    }
}