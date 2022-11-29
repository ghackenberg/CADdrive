import { Version, VersionAddData, VersionUpdateData, VersionREST } from 'productboard-common'

import { VersionClient } from '../clients/rest/version'

class VersionManagerImpl implements VersionREST<VersionAddData, VersionUpdateData, File, Blob> {
    private versionIndex: {[id: string]: Version} = {}
    private findIndex: {[id: string]: {[id: string]: boolean}} = {}

    getVersionCount(productId: string) { 
        const key = `${productId}`
        if (key in this.findIndex) { 
            return Object.keys(this.findIndex[key]).length 
        } else { 
            return undefined 
        } 
    }

    findVersionsFromCache(productId: string) { 
        const key = `${productId}`
        if (key in this.findIndex) { 
            return Object.keys(this.findIndex[key]).map(id => this.versionIndex[id])
        } else { 
            return undefined 
        } 
    }

    async findVersions(productId: string): Promise<Version[]> {
        const key = `${productId}`
        if (!(key in this.findIndex)) {
            // Call backend
            const versions = await VersionClient.findVersions(productId)
            // Update version index
            for (const version of versions) {
                this.versionIndex[version.id] = version
            }
            // Update find index
            this.findIndex[productId] = {}
            for (const version of versions) {
                this.findIndex[key][version.id] = true
            }
        }
        // Return versions
        return Object.keys(this.findIndex[productId]).map(id => this.versionIndex[id])
    }
    
    async addVersion(data: VersionAddData, files: {model: File, image: Blob}): Promise<Version> {
        // Call backend
        const version = await VersionClient.addVersion(data, files)
        // Update version index
        this.versionIndex[version.id] = version
        // Update find index
        this.addToFindIndex(version)
        // Return version
        return version
    }

    getVersionFromCache(versionId: string) { 
        if (versionId in this.versionIndex) { 
            return this.versionIndex[versionId]
        } else { 
            return undefined 
        } 
    }

    async getVersion(id: string): Promise<Version> {
        if (!(id in this.versionIndex)) {
            // Call backend
            const version = await VersionClient.getVersion(id)
            // Update version index
            this.versionIndex[id] = version
        }
        // Return version
        return this.versionIndex[id]
    }

    async updateVersion(id: string, data: VersionUpdateData, files?: {model: File, image: Blob}): Promise<Version> {
        // Call backend
        const version = await VersionClient.updateVersion(id, data, files)
        // Update version index
        this.versionIndex[id] = version
        // Update find index
        this.removeFromFindIndex(version)
        this.addToFindIndex(version)
        // Return version
        return version
    }

    async deleteVersion(id: string): Promise<Version> {
        // Call backend
        const version = await VersionClient.deleteVersion(id)
        // Update version index
        this.versionIndex[id] = version
        // Update find index
        this.removeFromFindIndex(version)
        // Return version
        return version
    }

    private addToFindIndex(version: Version) {
        if (`${version.productId}   ` in this.findIndex) {
            this.findIndex[`${version.productId}`][version.id] = true
        }
    }

    private removeFromFindIndex(version: Version) { 
        for (const key of Object.keys(this.findIndex)) {
            if (version.id in this.findIndex[key]) {
                delete this.findIndex[key][version.id]
            }
        }

    }
}

export const VersionManager = new VersionManagerImpl()