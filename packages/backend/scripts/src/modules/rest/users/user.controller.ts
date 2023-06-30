import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Scope, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiParam, ApiQuery, ApiResponse, getSchemaPath } from '@nestjs/swagger'

import 'multer'

import { User, UserREST, UserUpdateData } from 'productboard-common'

import { UserService } from './user.service'
import { canFindUserOrFail, canReadUserOrFail, canUpdateUserOrFail, canDeleteUserOrFail } from '../../../functions/permission'
import { AuthorizedRequest } from '../../../request'
import { TokenOptionalGuard } from '../tokens/token.guard'

@Controller({path: 'rest/users', scope: Scope.REQUEST})
@UseGuards(TokenOptionalGuard)
@ApiBearerAuth()
@ApiExtraModels(UserUpdateData)
export class UserController implements UserREST<string, Express.Multer.File> {
    constructor(
        private readonly userService: UserService,
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    @Get()
    @ApiQuery({ name: 'query', type: 'string', required: false })
    @ApiQuery({ name: 'product', type: 'string', required: false })
    @ApiResponse({ type: [User] })
    async findUsers(
        @Query('query') query?: string,
        @Query('product') product?: string
    ): Promise<User[]> {
        await canFindUserOrFail(this.request.user, query, product)
        return this.userService.findUsers(query, product)
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: User })
    async getUser(
        @Param('id') id: string
    ): Promise<User> {
        await canReadUserOrFail(this.request.user, id)
        return this.userService.getUser(id)
    }

    @Put(':id')
    @UseInterceptors(FileInterceptor('file'))
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                data: { $ref: getSchemaPath(UserUpdateData) },
                file: { type: 'string', format: 'binary' }
            },
            required: ['data']
        }
    })
    @ApiResponse({ type: User })
    async updateUser(
        @Param('id') id: string,
        @Body('data') data: string,
        @UploadedFile() file?: Express.Multer.File
    ): Promise<User> {
        await canUpdateUserOrFail(this.request.user, id)
        return this.userService.updateUser(id, JSON.parse(data), file)
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: User })
    async deleteUser(
        @Param('id') id: string
    ): Promise<User> {
        await canDeleteUserOrFail(this.request.user, id)
        return this.userService.deleteUser(id)
    }
}