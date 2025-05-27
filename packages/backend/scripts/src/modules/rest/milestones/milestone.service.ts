import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { nanoid } from 'nanoid'
import { IsNull } from 'typeorm'

import { MilestoneCreate, MilestoneREST, MilestoneRead, MilestoneUpdate } from 'productboard-common'
import { Database, convertMilestone } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class MilestoneService implements MilestoneREST {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    async findMilestones(productId: string): Promise<MilestoneRead[]> {
        const where = { productId, deleted: IsNull() }
        const result: MilestoneRead[] = []
        for (const milestone of await Database.get().milestoneRepository.findBy(where)) {
            result.push(await convertMilestone(milestone))
        }
        return result
    }

    async addMilestone(productId: string, data: MilestoneCreate): Promise<MilestoneRead> {
        // Create milestone
        const milestoneId = nanoid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        const milestone = await Database.get().milestoneRepository.save({ productId, milestoneId, created, updated, userId, ...data })
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = milestone.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], milestones: [milestone] })
        // Return milestone
        return convertMilestone(milestone)
    }

    async getMilestone(productId: string, milestoneId: string): Promise<MilestoneRead> {
        const milestone = await Database.get().milestoneRepository.findOneByOrFail({ productId, milestoneId })
        return convertMilestone(milestone)
    }

    async updateMilestone(productId: string, milestoneId: string, data: MilestoneUpdate): Promise<MilestoneRead> {
        // Update milestone
        const milestone = await Database.get().milestoneRepository.findOneByOrFail({ productId, milestoneId })
        milestone.updated = Date.now()
        milestone.label = data.label
        milestone.start = data.start
        milestone.end = data.end
        await Database.get().milestoneRepository.save(milestone)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = milestone.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], milestones: [milestone] })
        // Return milestone
        return convertMilestone(milestone)
    }

    async deleteMilestone(productId: string, milestoneId: string): Promise<MilestoneRead> {
        // Delete milestone
        const milestone = await Database.get().milestoneRepository.findOneByOrFail({ productId, milestoneId })
        milestone.deleted = Date.now()
        milestone.updated = milestone.deleted
        await Database.get().milestoneRepository.save(milestone)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = milestone.updated
        await Database.get().productRepository.save(product)
        // Update issues
        const issues = await Database.get().issueRepository.findBy({ milestoneId })
        for (const issue of issues) {
            issue.updated = milestone.deleted
            issue.milestoneId = null
            await Database.get().issueRepository.save(issue)
        }
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], milestones: [milestone], issues })
        // Return milestone
        return convertMilestone(milestone)
    }
}