import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { ApiBasicAuth, ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { Member, MemberAddData, MemberUpdateData, MemberREST, User } from 'productboard-common'
import { MemberService } from './member.service'
import { canReadMemberOrFail, canReadProductOrFail, canCreateProductOrFail, canUpdateMemberOrFail, canDeleteMemberOrFail } from '../../permission'

@Controller('rest/members')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
export class MemberController implements MemberREST {
    constructor(
        private readonly memberService: MemberService,
        @Inject(REQUEST)
        private readonly request: Request
    ) {}

    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiQuery({ name: 'user', type: 'string', required: false })
    @ApiResponse({ type: [Member] })
    async findMembers(
        @Query('product') productId: string,
        @Query('user') userId?: string
    ): Promise<Member[]> {
        await canReadProductOrFail((<User> this.request.user).id, productId)
        return this.memberService.findMembers(productId, userId)
    }

    @Post()
    @ApiBody({ type: MemberAddData, required: true })
    @ApiResponse({ type: Member })
    async addMember(
        @Body() data: MemberAddData
    ): Promise<Member> {
        await canCreateProductOrFail((<User> this.request.user).id, data.productId)
        return this.memberService.addMember(data)
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Member })
    async getMember(
        @Param('id') id: string
    ): Promise<Member> {
        await canReadMemberOrFail((<User> this.request.user).id, id)
        return this.memberService.getMember(id)
    }

    @Put(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiBody({ type: Member, required: true })
    @ApiResponse({ type: Member })
    async updateMember(
        @Param('id') id: string,
        @Body() data: MemberUpdateData
    ): Promise<Member> {
        await canUpdateMemberOrFail((<User> this.request.user).id, id)
        return this.memberService.updateMember(id,data)
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: [Member] })
    async deleteMember(
        @Param('id') id: string
    ): Promise<Member> {
        await canDeleteMemberOrFail((<User> this.request.user).id, id)
        return this.memberService.deleteMember(id)
    }
}