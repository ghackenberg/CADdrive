import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Member, MemberData, MemberREST } from 'productboard-common'
import { MemberService } from './member.service'
import { ApiBasicAuth, ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger'

@Controller('rest/members')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
export class MemberController implements MemberREST {
    constructor(private readonly memberService: MemberService) {}

    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiQuery({ name: 'user', type: 'string', required: false })
    @ApiResponse({ type: [Member] })
    async findMembers(@Query('product') productId: string, @Query('user') userId?: string): Promise<Member[]> {
        return this.memberService.findMembers(productId, userId)
    }

    @Post()
    @ApiBody({ type: MemberData, required: true })
    @ApiResponse({ type: Member })
    async addMember(@Body() data: MemberData): Promise<Member> {
        return this.memberService.addMember(data)
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Member })
    async getMember(@Param('id') id: string): Promise<Member> {
        return this.memberService.getMember(id)
    }

    @Put(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiBody({ type: Member, required: true })
    @ApiResponse({ type: Member })
    async updateMember(@Param('id') id: string, @Body() data: MemberData): Promise<Member> {
        return this.memberService.updateMember(id,data)
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: [Member] })
    async deleteMember(@Param('id') id: string): Promise<Member> {
        return this.memberService.deleteMember(id)
    }
}