import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { ApiBasicAuth, ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { Milestone, MilestoneAddData, MilestoneREST, MilestoneUpdateData, User } from 'productboard-common'
import { MilestoneService } from './milestone.service'
import { canReadMilestoneOrFail, canReadProductOrFail, canWriteMilestoneOrFail, canWriteProductOrFail } from '../../permission'

@Controller('rest/milestones')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
export class MilestoneController implements MilestoneREST {
    constructor(
        private readonly milestoneService: MilestoneService,
        @Inject(REQUEST)
        private readonly request: Request
    ) {}

    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiResponse({ type: [Milestone] })
    async findMilestones(
        @Query('product') productId: string
    ): Promise<Milestone[]> {
        await canReadProductOrFail((<User> this.request.user).id, productId)
        return this.milestoneService.findMilestones(productId)
    }   

    @Post()
    @ApiBody({ type: MilestoneAddData })
    @ApiResponse({ type: Milestone })
    async addMilestone(
        @Body() data: MilestoneAddData
    ): Promise<Milestone> {
        await canWriteProductOrFail((<User> this.request.user).id, data.productId)
        return this.milestoneService.addMilestone(data)
    }
    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async getMilestone(
        @Param('id') id: string
    ): Promise<Milestone> {
        await canReadMilestoneOrFail((<User> this.request.user).id, id)
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
        await canWriteMilestoneOrFail((<User> this.request.user).id, id)
        return this.milestoneService.updateMilestone(id, data)
    }
    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async deleteMilestone(
        @Param('id') id: string
    ): Promise<Milestone> {
        await canWriteMilestoneOrFail((<User> this.request.user).id, id)
        return this.milestoneService.deleteMilestone(id)
    }
}