import { Controller, Delete, ForbiddenException, Get, Inject, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { ApiBasicAuth, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger'
import { Milestone, MilestoneAddData, MilestoneREST, MilestoneUpdateData, User } from 'productboard-common'
import { MemberService } from '../members/member.service'
import { MilestoneService } from './milestone.service'

@Controller('rest/milestones')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
export class MilestoneController implements MilestoneREST {
    constructor(
        private readonly milestoneService: MilestoneService,
        private readonly memberService: MemberService,
        @Inject(REQUEST)
        private readonly request: Express.Request
    ) {}
    @Get()
    @ApiResponse({ type: [Milestone] })
    async findMilestones(productId: string): Promise<Milestone[]> {
        if ((await this.memberService.findMembers(productId, (<User> this.request.user).id)).length == 0) {
            throw new ForbiddenException()
        }
        return this.milestoneService.findMilestones(productId)
    }
    @Post()
    @ApiBody({ type: MilestoneAddData })
    @ApiResponse({ type: Milestone })
    async addMilestone(data: MilestoneAddData): Promise<Milestone> {
        if ((await this.memberService.findMembers(data.productId, (<User> this.request.user).id)).length == 0) {
            throw new ForbiddenException()
        }
        return this.milestoneService.addMilestone(data)
    }
    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async getMilestone(@Param('id') id: string): Promise<Milestone> {
        const milestone = await this.milestoneService.getMilestone(id)
        if (!milestone) {
            throw new NotFoundException()
        }
        if ((await this.memberService.findMembers(milestone.productId, (<User> this.request.user).id)).length == 0) {
            throw new ForbiddenException()
        }
        return milestone
    }
    @Put(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiBody({ type: MilestoneUpdateData })
    @ApiResponse({ type: Milestone })
    async updateMilestone(@Param('id') id: string, data: MilestoneUpdateData): Promise<Milestone> {
        const milestone = await this.milestoneService.getMilestone(id)
        if (!milestone) {
            throw new NotFoundException()
        }
        if ((await this.memberService.findMembers(milestone.productId, (<User> this.request.user).id)).length == 0) {
            throw new ForbiddenException()
        }
        return this.milestoneService.updateMilestone(id, data)
    }
    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Milestone })
    async deleteMilestone(@Param('id') id: string): Promise<Milestone> {
        const milestone = await this.milestoneService.getMilestone(id)
        if (!milestone) {
            throw new NotFoundException()
        }
        if ((await this.memberService.findMembers(milestone.productId, (<User> this.request.user).id)).length == 0) {
            throw new ForbiddenException()
        }
        return this.milestoneService.deleteMilestone(id)
    }
}