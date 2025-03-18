import axios from 'axios'

import { VersionCreate, VersionREST, VersionRead, VersionUpdate } from 'productboard-common'

import { auth } from '../auth'
import { CacheAPI } from '../cache'

class VersionClientImpl implements VersionREST<VersionCreate, VersionUpdate, Blob, Blob, Blob> {
    async findVersions(productId: string): Promise<VersionRead[]> {
        return (await axios.get<VersionRead[]>(`/rest/products/${productId}/versions`, auth)).data
    }
    async addVersion(productId: string, data: VersionCreate, files: {model: Blob, delta: Blob, image: Blob}): Promise<VersionRead> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        if (files.model) {
            if (files.model.type == 'application/x-ldraw') {
                body.append('model', files.model, 'file.ldr') // TODO remove?
            } else if (files.model.type == 'application/x-ldraw-model') {
                body.append('model', files.model, 'file.ldraw-model')
            } else {
                body.append('model', files.model)
            }
        }
        if (files.delta) {
            if (files.delta.type == 'application/x-ldraw-delta') {
                body.append('delta', files.delta, 'file.ldraw-delta')
            } else {
                body.append('delta', files.delta)
            }
        }
        if (files.image) {
            body.append('image', files.image)
        }
        const version = (await axios.post<VersionRead>(`/rest/products/${productId}/versions`, body, auth)).data
        CacheAPI.putVersion(version)
        return version
    }
    async getVersion(productId: string, versionId: string): Promise<VersionRead> {
        return (await axios.get<VersionRead>(`/rest/products/${productId}/versions/${versionId}`, auth)).data
    }
    async updateVersion(productId: string, versionId: string, data: VersionUpdate, files?: {model: Blob, delta: Blob, image: Blob}): Promise<VersionRead> {
        const body = new FormData()
        body.append('data', JSON.stringify(data))
        if (files) {
            if (files.model) {
                body.append('model', files.model)
            }
            if (files.delta) {
                body.append('delta', files.delta)
            }
            if (files.image) {
                body.append('image', files.image)
            }
        }
        const version = (await axios.put<VersionRead>(`/rest/products/${productId}/versions/${versionId}`, body, auth)).data
        CacheAPI.putVersion(version)
        return version
    }
    async deleteVersion(productId: string, versionId: string): Promise<VersionRead> {
        const version = (await axios.delete<VersionRead>(`/rest/products/${productId}/versions/${versionId}`, auth)).data
        CacheAPI.putVersion(version)
        return version
    }
}

export const VersionClient = new VersionClientImpl()