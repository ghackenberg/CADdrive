import { existsSync, mkdirSync, writeFileSync } from 'fs'

import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import shortid from 'shortid'
import { FindOptionsWhere, IsNull } from 'typeorm'

import { Issue, IssueAddData, IssueUpdateData, IssueREST } from 'productboard-common'
import { Database, IssueEntity } from 'productboard-database'

import { convertIssue } from '../../../functions/convert'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class IssueService implements IssueREST<IssueAddData, IssueUpdateData, Express.Multer.File[]> {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {
        if (!existsSync('./uploads')) {
            mkdirSync('./uploads')
        }
    }

    async findIssues(productId: string, milestoneId?: string, state?: 'open' | 'closed') : Promise<Issue[]> {
        let where: FindOptionsWhere<IssueEntity>
        if (productId && milestoneId && state)
            where = { productId, milestoneId, state, deleted: IsNull() }
        else if (productId && milestoneId)
            where = { productId, milestoneId, deleted: IsNull() }
        else if (productId && state)
            where = { productId, state, deleted: IsNull() }
        else if (productId)
            where = { productId, deleted: IsNull() }
        const result: Issue[] = []
        for (const issue of await Database.get().issueRepository.findBy(where))
            result.push(convertIssue(issue))
        return result
    }
  
    async addIssue(data: IssueAddData, files: { audio?: Express.Multer.File[] }): Promise<Issue> {
        const id = shortid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.id
        const state = 'open'
        let issue: IssueEntity
        if (files && files.audio && files.audio.length == 1 && files.audio[0].mimetype.endsWith('/webm')) {
            const audioId = shortid()
            issue = await Database.get().issueRepository.save({ id, created, updated, userId, audioId, state, ...data })
            writeFileSync(`./uploads/${issue.audioId}.webm`, files.audio[0].buffer)
        } else {
            issue = await Database.get().issueRepository.save({ id, created, updated, userId, state, ...data })
        }
        return convertIssue(issue)
    }

    async getIssue(id: string): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        return convertIssue(issue)
    }

    async updateIssue(id: string, data: IssueUpdateData, files?: { audio?: Express.Multer.File[] }): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        issue.updated = Date.now()
        issue.assigneeIds = data.assigneeIds
        issue.label = data.label
        issue.milestoneId =  data.milestoneId
        issue.text = data.text
        await Database.get().issueRepository.save(issue)
        if (files && files.audio && files.audio.length == 1 && files.audio[0].mimetype.endsWith('/webm')) {
            writeFileSync(`./uploads/${issue.audioId}.webm`, files.audio[0].buffer)
        }
        return convertIssue(issue)
    }

    async deleteIssue(id: string): Promise<Issue> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ id })
        issue.deleted = Date.now()
        issue.updated = issue.deleted
        await Database.get().commentRepository.update({ issueId: issue.id }, { deleted: issue.deleted, updated: issue.updated })
        await Database.get().issueRepository.save(issue)
        return convertIssue(issue)
    }
}