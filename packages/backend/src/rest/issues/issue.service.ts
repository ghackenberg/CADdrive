import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common'
import * as shortid from 'shortid'
import { Issue, IssueAddData, IssueUpdateData, IssueREST } from 'productboard-common'
import { CommentService } from '../comments/comment.service'



@Injectable()
export class IssueService implements IssueREST {
    private static readonly issues: Issue[] = [
        { id: 'demo-1', userId: 'demo-1', productId: 'demo-1', time: new Date('2022-04-10').toISOString(), label: 'Design vehicle that can be used in summer and winter.', text: '**Description**\n\n* In winter, the vehicle has to deal with cold temperatures and icy roads.\n* In summer, the vehicle has to deal with warm temperatures, rain, and mud.\n\n**Validation**\n\nWe plan to conduct test drives under winter and summer conditions to validate the product design.', state: 'closed', deleted: false, assigneeIds: ['demo-4', 'demo-3', 'demo-2'], milestoneId: 'demo-1' },
        { id: 'demo-2', userId: 'demo-2', productId: 'demo-1', time: new Date('2022-04-10').toISOString(), label: 'Use different wheel profile in winter version.', text: 'Please change the wheel profile (see [body_115_instance_2](/products/demo-1/versions/demo-3/objects/body_115_instance_2)). We need a stronger profile to handle winter conditions properly.', state: 'open', deleted: false ,assigneeIds: ['demo-4', 'demo-3'], milestoneId: 'demo-1' },
        { id: 'demo-3', userId: 'demo-3', productId: 'demo-1', time: new Date('2022-04-10').toISOString(), label: 'Use blue helmet for driver.', text: 'Please change the helmet color (see [technic_driver_helmet_p_SOLIDS_1_1](/products/demo-1/versions/demo-3/objects/technic_driver_helmet_p_SOLIDS_1_1)). We want a blue helmet because it fits better to our corporate design standards.', state: 'open', deleted: false ,assigneeIds: ['demo-4', 'demo-3'], milestoneId: 'demo-1' }
    ]

    public constructor(
        @Inject(forwardRef(() => CommentService))
        private readonly commentService: CommentService
    ) {}

    async findIssues(productId: string, milestoneId?: string, state?: string) : Promise<Issue[]> {
        const result: Issue[] = []
        for (const issue of IssueService.issues) {
            if(issue.deleted){
                continue
            }
            if (issue.productId != productId) {
                continue
            }
            if (milestoneId && issue.milestoneId != milestoneId) {
                continue
            }
            if (state && issue.state != state) {
                continue
            }
            result.push(issue)
        }
        return result
    }
  
    async addIssue(data: IssueAddData): Promise<Issue> {
        // TODO check if user exists
        // TODO check if product exists
        // TODO check if milestone exists
        // TODO check if assignees exist
        const issue = { id: shortid(), deleted: false, ...data }
        IssueService.issues.push(issue)
        return issue
    }

    async getIssue(id: string): Promise<Issue> {
        for (const issue of IssueService.issues) {
            if (issue.id == id) {
                return issue
            }
        }
        throw new NotFoundException()
    }

    async updateIssue(id: string, data: IssueUpdateData): Promise<Issue> {
        // TODO check if milestone exists
        // TODO check if assignees exist
        for (var index = 0; index < IssueService.issues.length; index++) {
            const issue = IssueService.issues[index]
            if (issue.id == id) {
                IssueService.issues.splice(index, 1, { ...issue, ...data })
                return IssueService.issues[index]
            }
        }
        throw new NotFoundException()
    }

    async deleteIssue(id: string): Promise<Issue> {
        for (const issue of IssueService.issues) {
            if (issue.id == id) {
                for (const comment of await this.commentService.findComments(id)) {
                    await this.commentService.deleteComment(comment.id)
                }
                issue.deleted = true
                return issue
            }
        }
        throw new NotFoundException()
    }
}