import 'multer'
import * as fs from 'fs'
import * as shortid from 'shortid'
import { Injectable, NotFoundException } from '@nestjs/common'
import { Version, VersionData, VersionREST } from 'productboard-common'

@Injectable()
export class VersionService implements VersionREST<VersionData, Express.Multer.File> {
    private static readonly versions: Version[] = [
        { id: 'demo-1', userId: 'demo-1', productId: 'demo-1', baseVersionIds: [], time: new Date().toISOString(), major: 1, minor: 0, patch: 0, description: 'Platform design completed.' },
        { id: 'demo-2', userId: 'demo-1', productId: 'demo-1', baseVersionIds: ['demo-1'], time: new Date().toISOString(), major: 1, minor: 1, patch: 0, description: 'Winter version of the vehicle.' },
        { id: 'demo-3', userId: 'demo-2', productId: 'demo-1', baseVersionIds: ['demo-1'], time: new Date().toISOString(), major: 1, minor: 2, patch: 0, description: 'Summer version of the vehicle.' },
        { id: 'demo-4', userId: 'demo-2', productId: 'demo-2', baseVersionIds: [], time: new Date().toISOString(), major: 1, minor: 0, patch: 0, description: 'Initial commit.' }
    ]

    async findVersions(productId: string) : Promise<Version[]> {
        const result: Version[] = []

        for (const version of VersionService.versions) {
            if (version.productId != productId) {
                continue
            }
            result.push(version)
        }

        return result
    }
 
    async addVersion(data: VersionData, file: Express.Multer.File): Promise<Version> {
        const version = { id: shortid(), ...data }
        if (file && file.originalname.endsWith('.glb')) {
            if (!fs.existsSync('./uploads')) {
                fs.mkdirSync('./uploads')
            }
            fs.writeFileSync(`./uploads/${version.id}.glb`, file.buffer)
        }
        VersionService.versions.push(version)
        return version
    }

    async getVersion(id: string): Promise<Version> {
        for (const version of VersionService.versions) {
            if (version.id == id) {
                return version
            }
        }
        throw new NotFoundException()
    }

    async updateVersion(id: string, data: VersionData, _file?: Express.Multer.File): Promise<Version> {
        for (var index = 0; index < VersionService.versions.length; index++) {
            const version = VersionService.versions[index]
            if (version.id == id) {
                VersionService.versions.splice(index, 1, { id, ...data })
                return VersionService.versions[index]
            }
        }
        throw new NotFoundException()
    }

    async deleteVersion(id: string): Promise<Version> {
        for (var index = 0; index < VersionService.versions.length; index++) {
            const version = VersionService.versions[index]
            if (version.id == id) {
                VersionService.versions.splice(index, 1)
                return version
            }
        }
        throw new NotFoundException()
    }
}