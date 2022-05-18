import { Injectable, NotFoundException } from '@nestjs/common'
import { FindOptionsWhere } from 'typeorm'
import * as shortid from 'shortid'
import { Issue, IssueAddData, IssueUpdateData, IssueREST, Comment } from 'productboard-common'
import { CommentRepository, IssueEntity, IssueRepository } from 'productboard-database'

@Injectable()
export class IssueService implements IssueREST {
    async findIssues(productId: string, milestoneId?: string, state?: 'open' | 'closed') : Promise<Issue[]> {
        const result: Issue[] = []
        const where: FindOptionsWhere<IssueEntity>[] = [{ productId }]
        milestoneId && where.push({ milestoneId })
        state && where.push({ state })
        for (const issue of await IssueRepository.find({ where })) {
            result.push(this.convert(issue))
        }
        return result
    }
  
    async addIssue(data: IssueAddData): Promise<Issue> {
        const issue = await IssueRepository.save({ id: shortid(), deleted: false, ...data })
        return this.convert(issue)
    }

    async getIssue(id: string): Promise<Issue> {
        const issue = await IssueRepository.findOne({ where: { id } })
        if (!issue) {
            throw new NotFoundException()
        }
        return this.convert(issue)
    }

    async updateIssue(id: string, data: IssueUpdateData): Promise<Issue> {
        const issue = await IssueRepository.findOne({ where: { id } })
        if (!issue) {
            throw new NotFoundException()
        }
        issue.assigneeIds = data.assigneeIds
        issue.label = data.label
        issue.milestoneId =  data.milestoneId
        issue.state = data.state
        issue.text = data.text
        await IssueRepository.save(issue)
        return this.convert(issue)
    }

    async deleteIssue(id: string): Promise<Issue> {
        const issue = await IssueRepository.findOne({ where: { id } })
        if (!issue) {
            throw new NotFoundException()
        }
        await CommentRepository.update({ issueId: issue.id }, { deleted: true })
        issue.deleted = true
        await IssueRepository.save(issue)
        return this.convert(issue)
    }

    private convert(issue: IssueEntity) {
        return {id: issue.id, deleted: issue.deleted, userId: issue.userId, productId: issue.productId, time: issue.time, label: issue.label, text: issue.text, state: issue.state, assigneeIds: issue.assigneeIds, milestoneId: issue.milestoneId }
    }
}