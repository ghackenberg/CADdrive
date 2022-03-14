import 'multer'
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiResponse, ApiParam, ApiQuery, ApiBasicAuth } from '@nestjs/swagger'
import { Version, VersionAddData, VersionREST } from 'productboard-common'
import { VersionService } from './version.service'
import { AuthGuard } from '@nestjs/passport'

@Controller('rest/versions')
@UseGuards(AuthGuard('basic'))
@ApiBasicAuth()
export class VersionController implements VersionREST<string, Express.Multer.File> {
    constructor(
        private versionService: VersionService
    ) {}


    @Get()
    @ApiQuery({ name: 'product', type: 'string', required: true })
    @ApiResponse({ type: [Version] }) 
    async findVersions(
        @Query('product') product: string
    ): Promise<Version[]> {
        return this.versionService.findVersions(product)
    }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    @ApiBody({ type: VersionAddData, required: true })
    @ApiResponse({ type: Version })
    async addVersion(
        @Body('data') data: string,
        @UploadedFile() file: Express.Multer.File
    ): Promise<Version> {
        return this.versionService.addVersion(JSON.parse(data), file)
    }

    @Get(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Version })
    async getVersion(
        @Param('id') id: string
    ): Promise<Version> {
        return this.versionService.getVersion(id)
    }

    @Put(':id')
    @UseInterceptors(FileInterceptor('file'))
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiBody({ type: Version, required: true })
    @ApiResponse({ type: Version })
    async updateVersion(
        @Param('id') id: string,
        @Body('data') data: string,
        @UploadedFile() file?: Express.Multer.File
    ): Promise<Version> {
        console.log(typeof data)
        return this.versionService.updateVersion(id, JSON.parse(data), file)
    }

    @Delete(':id')
    @ApiParam({ name: 'id', type: 'string', required: true })
    @ApiResponse({ type: Version })
    async deleteVersion(
        @Param('id') id: string
    ): Promise<Version> {
        return this.versionService.deleteVersion(id)
    }
}