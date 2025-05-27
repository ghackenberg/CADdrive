import { createReadStream, writeFileSync } from 'fs'

import { Inject, StreamableFile } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { nanoid } from 'nanoid'
import { IsNull } from 'typeorm'

import { AttachmentCreate, AttachmentREST, AttachmentRead, AttachmentUpdate } from 'productboard-common'
import { Database, convertAttachment } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { AuthorizedRequest } from '../../../request'

export class AttachmentService implements AttachmentREST<AttachmentCreate, AttachmentUpdate, Express.Multer.File> {

    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    async findAttachments(productId: string): Promise<AttachmentRead[]> {
        const where = { productId, deleted: IsNull() }
        const result: AttachmentRead[] = []
        for (const attachment of await Database.get().attachmentRepository.findBy(where)) {
            result.push(await convertAttachment(attachment))   
        }
        return result
    }

    async addAttachment(productId: string, data: AttachmentCreate, file: Express.Multer.File): Promise<AttachmentRead> {
        const attachmentId = nanoid()
        // Save file
        writeFileSync(`./uploads/${attachmentId}`, file.buffer)
        // Add attachment
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        const attachment = await Database.get().attachmentRepository.save({ productId, attachmentId, userId, created, updated, ...data })
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = attachment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], attachments: [attachment] })
        // Return attachment
        return convertAttachment(attachment)
    }

    async getAttachment(productId: string, attachmentId: string): Promise<AttachmentRead> {
        const attachment = await Database.get().attachmentRepository.findOneByOrFail({ productId, attachmentId })
        return convertAttachment(attachment)
    }

    async getAttachmentFile(productId: string, attachmentId: string, name: string): Promise<StreamableFile> {
        const attachment = await this.getAttachment(productId, attachmentId)

        const stream = createReadStream(`./uploads/${attachmentId}`)

        const type = attachment.type

        if (name == 'file') {
            // old style: file name not in url => use content disposition header
            if (type.startsWith('image/')) {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else if (type.startsWith('audio/')) {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else if (type.startsWith('video/')) {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else if (type.startsWith('text/')) {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else if (type == 'application/ogg') {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else if (type == 'application/pdf') {
                return new StreamableFile(stream, { disposition: `inline; filename: ${attachment.name}`, type })
            } else {
                return new StreamableFile(stream, { disposition: `attachment; filename: ${attachment.name}`, type })
            }
        } else {
            // new style: file name in url => do not use content disposition header
            return new StreamableFile(stream, { type })
        }
    }

    async updateAttachment(productId: string, attachmentId: string, data: AttachmentUpdate, file?: Express.Multer.File): Promise<AttachmentRead> {
        // Save file
        writeFileSync(`./uploads/${attachmentId}`, file.buffer)
        // Update attachment
        const attachment = await Database.get().attachmentRepository.findOneByOrFail({ productId, attachmentId })
        attachment.updated = Date.now()
        attachment.name = data.name
        attachment.type = data.type
        await Database.get().attachmentRepository.save(attachment)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = attachment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], attachments: [attachment] })
        // Return attachment
        return convertAttachment(attachment)
    }

    async deleteAttachment(productId: string, attachmentId: string): Promise<AttachmentRead> {
        // Delete attachment
        const attachment = await Database.get().attachmentRepository.findOneByOrFail({ productId, attachmentId })
        attachment.deleted = Date.now()
        attachment.updated = attachment.deleted
        await Database.get().attachmentRepository.save(attachment)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = attachment.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], attachments: [attachment] })
        // Return attachment
        return convertAttachment(attachment)
    }
    
}