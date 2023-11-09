import { existsSync, mkdirSync, writeFileSync } from 'fs'

import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { getTestMessageUrl } from 'nodemailer'
import shortid from 'shortid'
import { IsNull } from 'typeorm'

import { CommentREST, Comment, CommentAddData, CommentUpdateData, Product, Issue } from 'productboard-common'
import { Database, convertComment } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { TRANSPORTER } from '../../../functions/mail'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class CommentService implements CommentREST<CommentAddData, CommentUpdateData, Express.Multer.File[]> {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {
        if (!existsSync('./uploads')) {
            mkdirSync('./uploads')
        }
    }

    async findComments(productId: string, issueId: string): Promise<Comment[]> {
        const where = { productId, issueId, deleted: IsNull() }
        const result: Comment[] = []
        for (const comment of await Database.get().commentRepository.findBy(where))
            result.push(convertComment(comment))
        return result
    }

    async addComment(productId: string, issueId: string, data: CommentAddData, files: { audio?: Express.Multer.File[] }): Promise<Comment> {
        // Create comment
        const commentId = shortid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        let audioId: string
        if (files && files.audio && files.audio.length == 1 && files.audio[0].mimetype.endsWith('/webm')) {
            audioId = shortid()
            writeFileSync(`./uploads/${audioId}.webm`, files.audio[0].buffer)
        }
        const comment = await Database.get().commentRepository.save({ productId, issueId, commentId, created, updated, userId, audioId, ...data })
        // Update issue
        const issue = await Database.get().issueRepository.findOneBy({ productId, issueId })
        issue.updated = comment.updated
        if (comment.action == 'close') {
            issue.state = 'closed'
        } else if (comment.action == 'reopen') {
            issue.state = 'open'
        }
        await Database.get().issueRepository.save(issue)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = comment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], comments: [comment] })
        // Notify changes
        this.notifyComment(product, issue, comment, 'Comment notification (add)')
        // Return comment
        return convertComment(comment)
    }

    async getComment(productId: string, issueId: string, commentId: string): Promise<Comment> {
        const comment = await Database.get().commentRepository.findOneByOrFail({ productId, issueId, commentId })
        return convertComment(comment)
    }
    
    async updateComment(productId: string, issueId: string, commentId: string, data: CommentUpdateData, files?: { audio?: Express.Multer.File[] }): Promise<Comment> {
        // Update comment
        const comment = await Database.get().commentRepository.findOneByOrFail({ productId, issueId, commentId })
        comment.updated = Date.now()
        comment.text = data.text
        if (files && files.audio && files.audio.length == 1 && files.audio[0].mimetype.endsWith('/webm')) {
            writeFileSync(`./uploads/${comment.audioId}.webm`, files.audio[0].buffer)
        }
        await Database.get().commentRepository.save(comment)
        // Update issue
        const issue = await Database.get().issueRepository.findOneBy({ productId, issueId })
        issue.updated = comment.updated
        await Database.get().issueRepository.save(issue)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = comment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], comments: [comment] })
        // Notify changes
        this.notifyComment(product, issue, comment, 'Comment notification (update)')
        // Return comment
        return convertComment(comment)
    }

    async deleteComment(productId: string, issueId: string, commentId: string): Promise<Comment> {
        // Update comment
        const comment = await Database.get().commentRepository.findOneByOrFail({ productId, issueId, commentId })
        comment.deleted = Date.now()
        comment.updated = comment.deleted
        await Database.get().commentRepository.save(comment)
        // Update issue
        const issue = await Database.get().issueRepository.findOneBy({ productId, issueId })
        issue.updated = comment.updated
        // TODO update state?
        await Database.get().issueRepository.save(issue)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = comment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], issues: [issue], comments: [comment] })
        // Return comment
        return convertComment(comment)
    }

    async notifyComment(product: Product, issue: Issue, comment: Comment, subject: string) {
        // Send emails
        const members = await Database.get().memberRepository.findBy({ productId: product.productId, deleted: IsNull() })
        for (const member of members) {
            if (member.userId != this.request.user.userId) {
                const user = await Database.get().userRepository.findOneBy({ userId: member.userId, deleted: IsNull() })
                const transporter = await TRANSPORTER
                const info = await transporter.sendMail({
                    from: 'CADdrive <mail@caddrive.com>',
                    to: user.email,
                    subject,
                    templateName: 'comment',
                    templateData: {
                        user: this.request.user.name,
                        date: new Date(comment.created).toDateString(),
                        product: product.name,
                        issue: issue.label,
                        comment: comment.text,
                        action: comment.action,
                        link: `https://caddrive.com/products/${product.productId}/issues/${issue.issueId}`
                    }
                })
                console.log(getTestMessageUrl(info))
            }
        }
    }
}