import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { ApiBody, ApiResponse, ApiParam, ApiQuery, ApiBasicAuth, ApiConsumes, getSchemaPath, ApiExtraModels } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import 'multer'
import { User, Version, VersionAddData, VersionREST, VersionUpdateData } from 'productboard-common'
import { canReadVersionOrFail, canDeleteVersionOrFail, canUpdateVersionOrFail, canCreateVersionOrFail, canFindVersionOrFail } from '../../../functions/permission'
import { VersionService } from './version.service'

@Controller('rest/versions')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
@ApiExtraModels(VersionAddData, VersionUpdateData)
export class VersionController implements VersionREST<string, Express.Multer.File[], Express.Multer.File[]> {
    constructor(
        private versionService: VersionService,
        @Inject(REQUEST)
        private readonly request: Request
    ) {}

    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiResponse({ type: [Version] }) 
    async findVersions(
        @Query('product') productId: string
    ): Promise<Version[]> {
        await canFindVersionOrFail((<User> this.request.user).id, productId)
        return this.versionService.findVersions(productId)
    }

    @Post()
    @UseInterceptors(FileFieldsInterceptor([{ name: 'model', maxCount: 1 }, { name: 'image', maxCount: 1 }]))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                data: { $ref: getSchemaPath(VersionAddData) },
                model: { type: 'string', format: 'binary' },
                image: { type: 'string', format: 'binary' }
            },
            required: ['data', 'model', 'image']
        }
    })
    @ApiResponse({ type: Version })
    async addVersion(
        @Body('data') data: string,
        @UploadedFiles() files: { model: Express.Multer.File[], image: Express.Multer.File[] }
    ): Promise<Version> {
        const dataParsed = <VersionAddData> JSON.parse(data)
        await canCreateVersionOrFail((<User> this.request.user).id, dataParsed.productId)
        return this.versionService.addVersion(dataParsed, files)
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Version })
    async getVersion(
        @Param('id') id: string
    ): Promise<Version> {
        await canReadVersionOrFail((<User> this.request.user).id, id)
        return this.versionService.getVersion(id)
    }

    @Put(':id')
    @UseInterceptors(FileFieldsInterceptor([{ name: 'model', maxCount: 1 }, { name: 'image', maxCount: 1 }]))
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                data: { $ref: getSchemaPath(VersionUpdateData) },
                model: { type: 'string', format: 'binary' },
                image: { type: 'string', format: 'binary' }
            },
            required: ['data']
        }
    })
    @ApiResponse({ type: Version })
    async updateVersion(
        @Param('id') id: string,
        @Body('data') data: string,
        @UploadedFiles() files?: { model: Express.Multer.File[], image: Express.Multer.File[] }
    ): Promise<Version> {
        await canUpdateVersionOrFail((<User> this.request.user).id, id)
        return this.versionService.updateVersion(id, JSON.parse(data), files)
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Version })
    async deleteVersion(
        @Param('id') id: string
    ): Promise<Version> {
        await canDeleteVersionOrFail((<User> this.request.user).id, id)
        return this.versionService.deleteVersion(id)
    }
}