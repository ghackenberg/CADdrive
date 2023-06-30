import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'

import { Milestone, MilestoneAddData, MilestoneREST, MilestoneUpdateData } from 'productboard-common'

import { MilestoneService } from './milestone.service'
import { canReadMilestoneOrFail, canDeleteMilestoneOrFail, canUpdateMilestoneOrFail, canCreateMilestoneOrFail, canFindMilestoneOrFail } from '../../../functions/permission'
import { AuthorizedRequest } from '../../../request'
import { TokenOptionalGuard } from '../tokens/token.guard'

@Controller('rest/milestones')
@UseGuards(TokenOptionalGuard)
@ApiBearerAuth()
export class MilestoneController implements MilestoneREST {
    constructor(
        private readonly milestoneService: MilestoneService,
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiResponse({ type: [Milestone] })
    async findMilestones(
        @Query('product') productId: string
    ): Promise<Milestone[]> {
        await canFindMilestoneOrFail(this.request.user, productId)
        return this.milestoneService.findMilestones(productId)
    }   

    @Post()
    @ApiBody({ type: MilestoneAddData })
    @ApiResponse({ type: Milestone })
    async addMilestone(
        @Body() data: MilestoneAddData
    ): Promise<Milestone> {
        await canCreateMilestoneOrFail(this.request.user, data.productId)
        return this.milestoneService.addMilestone(data)
    }
    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async getMilestone(
        @Param('id') id: string
    ): Promise<Milestone> {
        await canReadMilestoneOrFail(this.request.user, id)
        return this.milestoneService.getMilestone(id)
    }
    @Put(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiBody({ type: MilestoneUpdateData })
    @ApiResponse({ type: Milestone })
    async updateMilestone(
        @Param('id') id: string,
        @Body() data: MilestoneUpdateData
    ): Promise<Milestone> {
        await canUpdateMilestoneOrFail(this.request.user, id)
        return this.milestoneService.updateMilestone(id, data)
    }
    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async deleteMilestone(
        @Param('id') id: string
    ): Promise<Milestone> {
        await canDeleteMilestoneOrFail(this.request.user, id)
        return this.milestoneService.deleteMilestone(id)
    }
}