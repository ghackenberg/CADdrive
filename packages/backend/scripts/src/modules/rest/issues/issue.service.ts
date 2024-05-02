import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { getTestMessageUrl } from 'nodemailer'
import shortid from 'shortid'
import { IsNull } from 'typeorm'

import { IssueCreate, IssueREST, IssueRead, IssueUpdate, ProductRead } from 'productboard-common'
import { Database, MilestoneEntity, convertIssue } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { TRANSPORTER } from '../../../functions/mail'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class IssueService implements IssueREST {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    async findIssues(productId: string) {
        const where = { productId, deleted: IsNull() }
        const result: IssueRead[] = []
        for (const issue of await Database.get().issueRepository.findBy(where)) {
            result.push(await convertIssue(issue))   
        }
        return result.sort((a, b) => a.created - b.created)
    }
  
    async addIssue(productId: string, data: IssueCreate): Promise<IssueRead> {
        // Add issue
        const issueId = shortid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        const number = await Database.get().issueRepository.countBy({ productId }) + 1
        const state = 'open'
        const issue = await Database.get().issueRepository.save({ productId, issueId, created, updated, userId, number, state, ...data })
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = issue.updated
        await Database.get().productRepository.save(product)
        // Find milestone
        const milestones = data.milestoneId ? await Database.get().milestoneRepository.findBy({ milestoneId: data.milestoneId }) : []
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], milestones })
        // Notify changes
        this.notifyIssue(product, issue, 'Issue notification (add)')
        // Return issue
        return convertIssue(issue)
    }

    async getIssue(productId: string, issueId: string): Promise<IssueRead> {
        const issue = await Database.get().issueRepository.findOneByOrFail({ productId, issueId })
        return convertIssue(issue)
    }

    async updateIssue(productId: string, issueId: string, data: IssueUpdate): Promise<IssueRead> {
        // Find issue
        const issue = await Database.get().issueRepository.findOneByOrFail({ productId, issueId })
        // Find milestone
        const milestones: MilestoneEntity[] = []
        if (issue.milestoneId != data.milestoneId) {
            if (issue.milestoneId) {
                milestones.push(await Database.get().milestoneRepository.findOneBy({ milestoneId: issue.milestoneId }))
            }
            if (data.milestoneId) {
                milestones.push(await Database.get().milestoneRepository.findOneBy({ milestoneId: data.milestoneId }))
            }
        }
        // Update issue
        issue.updated = Date.now()
        issue.assignedUserIds = data.assignedUserIds
        issue.label = data.label
        issue.milestoneId = data.milestoneId
        await Database.get().issueRepository.save(issue)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = issue.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], milestones })
        // Notify changes
        this.notifyIssue(product, issue, 'Issue notification (update)')
        // Return issue
        return convertIssue(issue)
    }

    async deleteIssue(productId: string, issueId: string): Promise<IssueRead> {
        // Delete issue
        const issue = await Database.get().issueRepository.findOneByOrFail({ productId, issueId })
        issue.deleted = Date.now()
        issue.updated = issue.deleted
        await Database.get().issueRepository.save(issue)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = issue.updated
        await Database.get().productRepository.save(product)
        // Delete comments
        const comments = await Database.get().commentRepository.findBy({ productId, issueId, deleted: IsNull() })
        for (const comment of comments) {
            comment.deleted = issue.deleted
            comment.updated = issue.updated
            await Database.get().commentRepository.save(comment)
        }
        // Find milestone
        const milestones = issue.milestoneId ? await Database.get().milestoneRepository.findBy({ milestoneId: issue.milestoneId }) : []
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], comments, milestones })
        // Return issue
        return convertIssue(issue)
    }

    async notifyIssue(product: ProductRead, issue: IssueRead, subject: string) {
        // Send emails
        const members = await Database.get().memberRepository.findBy({ productId: product.productId, deleted: IsNull() })
        for (const member of members) {
            if (member.userId != this.request.user.userId) {
                const user = await Database.get().userRepository.findOneBy({ userId: member.userId })
                if (!user.deleted && user.emailNotification) {
                    const transporter = await TRANSPORTER
                    const info = await transporter.sendMail({
                        from: 'CADdrive <mail@caddrive.com>',
                        to: user.email,
                        subject,
                        templateName: 'issue',
                        templateData: {
                            user: this.request.user,
                            date: new Date(issue.updated).toDateString(),
                            product,
                            issue,
                            link: `https://caddrive.com/products/${product.productId}/issues/${issue.issueId}`
                        }
                    })
                    console.log(getTestMessageUrl(info))
                }
            }
        }
    }
}