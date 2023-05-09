import { Milestone, MilestoneAddData, MilestoneUpdateData } from 'productboard-common'

import { MilestoneClient } from '../clients/rest/milestone'
import { AbstractManager } from './abstract'

class MilestoneManagerImpl extends AbstractManager<Milestone> {
    // CACHE

    findMilestonesFromCache(productId: string) { 
        return this.getFind(productId)
    }
    getMilestoneFromCache(milestoneId: string) { 
        return this.getItem(milestoneId)
    }

    // REST

    findMilestones(productId: string, callback: (milestones: Milestone[], error?: string) => void) {
        return this.find(
            productId,
            () => MilestoneClient.findMilestones(productId),
            milestone => milestone.productId == productId,
            callback
        )
    }
    async addMilestone(data: MilestoneAddData) {
        return this.add(MilestoneClient.addMilestone(data))
    }
    getMilestone(id: string, callback: (milestone: Milestone, error?: string) => void) {
        return this.get(id, () => MilestoneClient.getMilestone(id), callback)
    }
    async updateMilestone(id: string, data: MilestoneUpdateData) {
        return this.update(id, MilestoneClient.updateMilestone(id, data))
    }
    async deleteMilestone(id: string) {
        return this.delete(id, MilestoneClient.deleteMilestone(id))
    }
}

export const MilestoneManager = new MilestoneManagerImpl()