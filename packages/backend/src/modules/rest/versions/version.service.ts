import * as fs from 'fs'

import { Injectable } from '@nestjs/common'
import { Client, ClientProxy, Transport } from '@nestjs/microservices'

import 'multer'
import * as shortid from 'shortid'
import { FindOptionsWhere } from 'typeorm'

import { Version, VersionAddData, VersionUpdateData, VersionREST } from 'productboard-common'
import { Database, VersionEntity } from 'productboard-database'

@Injectable()
export class VersionService implements VersionREST<VersionAddData, VersionUpdateData, Express.Multer.File[], Express.Multer.File[]> {
    @Client({ transport: Transport.MQTT })
    private client: ClientProxy

    async findVersions(productId: string) : Promise<Version[]> {
        let where: FindOptionsWhere<VersionEntity>
        if (productId)
            where = { productId, deleted: false }
        const result: Version[] = []
        for (const version of await Database.get().versionRepository.findBy(where))
            result.push(this.convert(version))
        return result
    }
 
    async addVersion(data: VersionAddData, files: {model: Express.Multer.File[], image: Express.Multer.File[]}): Promise<Version> {
        const version = await Database.get().versionRepository.save({ id: shortid(), deleted: false, ...data })
        if (files && files.model && files.model.length == 1 && files.model[0].originalname.endsWith('.glb')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${version.id}.glb`, files.model[0].buffer)
        }
        if (files && files.image && files.image.length == 1 && files.image[0].mimetype.endsWith('/png')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${version.id}.png`, files.image[0].buffer)
        }
        await this.client.emit(`/api/v1/versions/${version.id}/create`, this.convert(version))
        return this.convert(version)
    }

    async getVersion(id: string): Promise<Version> {
        const version = await Database.get().versionRepository.findOneByOrFail({ id })
        return this.convert(version)
    }

    async updateVersion(id: string, data: VersionUpdateData, files?: {model: Express.Multer.File[], image: Express.Multer.File[]}): Promise<Version> {
        const version = await Database.get().versionRepository.findOneByOrFail({ id })
        version.major = data.major
        version.minor = data.minor
        version.patch = data.patch
        version.description = data.description
        if (files && files.model && files.model.length == 1 && files.model[0].originalname.endsWith('.glb')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${version.id}.glb`, files.model[0].buffer)
        }
        if (files && files.image && files.image.length == 1 && files.image[0].mimetype.endsWith('/png')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${version.id}.png`, files.image[0].buffer)
        }
        await Database.get().versionRepository.save(version)
        await this.client.emit(`/api/v1/versions/${version.id}/update`, this.convert(version))
        return this.convert(version)
    }

    async deleteVersion(id: string): Promise<Version> {
        const version = await Database.get().versionRepository.findOneByOrFail({ id })
        version.deleted = true
        await Database.get().versionRepository.save(version)
        await this.client.emit(`/api/v1/versions/${version.id}/delete`, this.convert(version))
        return this.convert(version)
    }

    private convert(version: VersionEntity) {
        return { id: version.id, deleted: version.deleted, userId: version.userId, productId: version.productId, baseVersionIds: version.baseVersionIds, major:version.major, minor: version.minor, patch: version.patch, time: version.time, description: version.description }
    }
}