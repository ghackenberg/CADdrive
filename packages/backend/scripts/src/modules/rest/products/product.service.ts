import { Inject, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { nanoid } from 'nanoid'
import { FindOptionsWhere, IsNull } from 'typeorm'

import { ProductCreate, ProductREST, ProductRead, ProductUpdate } from 'productboard-common'
import { Database, ProductEntity, convertProduct } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { AuthorizedRequest } from '../../../request'

@Injectable({ scope: Scope.REQUEST })
export class ProductService implements ProductREST {
    public constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}
    
    async findProducts(_public: 'true' | 'false'): Promise<ProductRead[]> {
        let where: FindOptionsWhere<ProductEntity> | FindOptionsWhere<ProductEntity>[]
        if (this.request.user) {
            const userId = this.request.user.userId
            if (_public == 'true') {
                where = { public: true, deleted: IsNull() }
            } else if (_public == 'false') {
                if (this.request.user.admin) {
                    where = { public: false, deleted: IsNull() }
                } else {
                    where = { public: false, members: [ { userId, deleted: IsNull() } ], deleted: IsNull() }
                }
            } else {
                if (this.request.user.admin) {
                    where = { deleted: IsNull() }
                } else {
                    where = [
                        { public: true, deleted: IsNull() },
                        { public: false, members: [ { userId, deleted: IsNull() } ], deleted: IsNull() }
                    ]
                }
            }
        } else {
            if (_public == 'true') {
                where = { public: true, deleted: IsNull() }
            } else if (_public == 'false') {
                return []
            } else {
                where = { public: true, deleted: IsNull() }
            }
        }
        const result: ProductRead[] = []
        for (const product of await Database.get().productRepository.find({ where, order: { updated: 'DESC' }, take: 50 })) {
            result.push(await convertProduct(product))
        }
        return result
    }
    
    async addProduct(data: ProductCreate): Promise<ProductRead> {
        // Create product
        const productId = nanoid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        const product = await Database.get().productRepository.save({ productId, created, updated, userId, ...data })
        // Create member
        const memberId = nanoid()
        const role = 'manager'
        const member = await Database.get().memberRepository.save({ productId, memberId, created, updated, userId, role })
        // Emit changes
        emitProductMessage(productId, { type: 'state', products: [product], members: [member] })
        // Return product
        return convertProduct(product)
    }

    async getProduct(productId: string): Promise<ProductRead> {
        const product = await Database.get().productRepository.findOneByOrFail({ productId })
        return convertProduct(product)
    }

    async updateProduct(productId: string, data: ProductUpdate): Promise<ProductRead> {
        // Update product
        const product = await Database.get().productRepository.findOneByOrFail({ productId })
        product.updated = Date.now()
        product.name = data.name
        product.description = data.description
        product.public = data.public
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product] })
        // Return product
        return convertProduct(product)
    }

    async deleteProduct(productId: string): Promise<ProductRead> {
        // Delete product
        const product = await Database.get().productRepository.findOneByOrFail({ productId })
        product.deleted = Date.now()
        product.updated = product.deleted
        await Database.get().productRepository.save(product)
        // Delete members
        const members = await Database.get().memberRepository.findBy({ productId, deleted: IsNull() })
        for (const member of members) {
            member.deleted = product.deleted
            member.updated = product.updated
            await Database.get().memberRepository.save(member)
        }
        // Delete issues
        const issues = await Database.get().issueRepository.findBy({ productId, deleted: IsNull() })
        for (const issue of issues) {
            issue.deleted = product.deleted
            issue.updated = product.updated
            await Database.get().issueRepository.save(issue)
        }
        // Delete comments
        const comments = await Database.get().commentRepository.findBy({ productId, deleted: IsNull() })
        for (const comment of comments) {
            comment.deleted = product.deleted
            comment.updated = product.updated
            await Database.get().commentRepository.save(comment)
        }
        // Delete milestones
        const milestones = await Database.get().milestoneRepository.findBy({ productId, deleted: IsNull() })
        for (const milestone of milestones) {
            milestone.deleted = product.deleted
            milestone.updated = product.updated
            await Database.get().milestoneRepository.save(milestone)
        }
        // Delete versions
        const versions = await Database.get().versionRepository.findBy({ productId, deleted: IsNull() })
        for (const version of versions) {
            version.deleted = product.deleted
            version.updated = product.updated
            await Database.get().versionRepository.save(version)
        }
        // Emit changes
        emitProductMessage(productId, { type: 'state', products: [product], members, issues, comments, milestones, versions })
        // Return product
        return convertProduct(product)
    }
}