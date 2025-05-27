import { writeFileSync } from 'fs'

import { HttpException, Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import Jimp from 'jimp'
import 'multer'
import { getTestMessageUrl } from 'nodemailer'
//import rehypeMermaid from 'rehype-mermaid'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { nanoid } from 'nanoid'
import { IsNull } from 'typeorm'
import { unified } from 'unified'

import { ModelType, ProductRead, VersionCreate, VersionREST, VersionRead, VersionUpdate } from 'productboard-common'
import { Database, convertVersion } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { TRANSPORTER } from '../../../functions/mail'
import { packLDrawText } from '../../../functions/pack'
import { renderDae, renderFbx, renderGlb, renderLDraw, renderPly, renderStl } from '../../../functions/render'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class VersionService implements VersionREST<VersionCreate, VersionUpdate, Express.Multer.File[], Express.Multer.File[]> {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    async findVersions(productId: string) : Promise<VersionRead[]> {
        const where = { productId, deleted: IsNull() }
        const result: VersionRead[] = []
        for (const version of await Database.get().versionRepository.findBy(where)) {
            result.push(await convertVersion(version))
        }
        return result
    }
 
    async addVersion(productId: string, data: VersionCreate, files: {model: Express.Multer.File[], image: Express.Multer.File[]}): Promise<VersionRead> {
        // Create version
        const versionId = nanoid()
        const created = Date.now()
        const updated = created
        const userId = this.request.user.userId
        const modelType = await this.processModel(versionId, null, files)
        const imageType = await this.processImage(versionId, null, files)
        const version = await Database.get().versionRepository.save({ productId, versionId, created, updated, userId, modelType, imageType, ...data })
        // Render image
        this.renderImage(productId, versionId, files)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = version.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], versions: [version] })
        // Return version
        return convertVersion(version)
    }

    async getVersion(productId: string, versionId: string): Promise<VersionRead> {
        const version = await Database.get().versionRepository.findOneByOrFail({ productId, versionId })
        return convertVersion(version)
    }

    async updateVersion(productId: string, versionId: string, data: VersionUpdate, files?: {model: Express.Multer.File[], image: Express.Multer.File[]}): Promise<VersionRead> {
        // Update version
        const version = await Database.get().versionRepository.findOneByOrFail({ productId, versionId })
        version.updated = Date.now()
        version.baseVersionIds = data.baseVersionIds
        version.major = data.major
        version.minor = data.minor
        version.patch = data.patch
        version.description = data.description
        version.modelType = await this.processModel(versionId, version.modelType, files)
        version.imageType = await this.processImage(versionId, version.imageType, files)
        await Database.get().versionRepository.save(version)
        // Render image
        this.renderImage(productId, versionId, files)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = version.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], versions: [version] })
        // Return version
        return convertVersion(version)
    }

    async deleteVersion(productId: string, versionId: string): Promise<VersionRead> {
        // Delete version
        const version = await Database.get().versionRepository.findOneByOrFail({ productId, versionId })
        version.deleted = Date.now()
        version.updated = version.deleted
        await Database.get().versionRepository.save(version)
        // Update other versions
        const versions = await Database.get().versionRepository.findBy({ productId, deleted: IsNull() })
        for (const other of versions) {
            if (other.baseVersionIds.includes(versionId)) {
                other.baseVersionIds = other.baseVersionIds.filter(baseVersionId => baseVersionId != versionId)
                other.updated = version.updated
                await Database.get().versionRepository.save(other)
            }
        }
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = version.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], versions: [version, ...versions] })
        // Return version
        return convertVersion(version)
    }

    async processModel(versionId: string, modelType: ModelType, files?: {model: Express.Multer.File[], image: Express.Multer.File[]}): Promise<ModelType> {
        if (files.model) {
            if (files.model.length == 1) {
                if (files.model[0].originalname.endsWith('.stl')) {
                    writeFileSync(`./uploads/${versionId}.stl`, files.model[0].buffer)
                    return 'stl'
                } else if (files.model[0].originalname.endsWith('.ply')) {
                    writeFileSync(`./uploads/${versionId}.ply`, files.model[0].buffer)
                    return 'ply'
                } else if (files.model[0].originalname.endsWith('.dae')) {
                    writeFileSync(`./uploads/${versionId}.dae`, files.model[0].buffer)
                    return 'dae'
                } else if (files.model[0].originalname.endsWith('.fbx')) {
                    writeFileSync(`./uploads/${versionId}.fbx`, files.model[0].buffer)
                    return 'fbx'
                } else if (files.model[0].originalname.endsWith('.glb')) {
                    writeFileSync(`./uploads/${versionId}.glb`, files.model[0].buffer)
                    return 'glb'
                } else if (files.model[0].originalname.endsWith('.ldr')) {
                    writeFileSync(`./uploads/${versionId}.ldr`, files.model[0].buffer)
                    writeFileSync(`./uploads/${versionId}-packed.ldr`, packLDrawText(files.model[0].buffer.toString('utf-8')))
                    return 'ldr'
                } else if (files.model[0].originalname.endsWith('.mpd')) {
                    writeFileSync(`./uploads/${versionId}.mpd`, files.model[0].buffer)
                    return 'mpd'
                } else if (files.model[0].originalname.endsWith('.FCStd')) {
                    writeFileSync(`./uploads/${versionId}.FCStd`, files.model[0].buffer)
                    return 'FCStd'
                } else if (files.model[0].originalname.endsWith('.stp')) {
                    writeFileSync(`./uploads/${versionId}.stp`, files.model[0].buffer)
                    return 'stp'
                } else if (files.model[0].originalname.endsWith('.step')) {
                    writeFileSync(`./uploads/${versionId}.step`, files.model[0].buffer)
                    return 'step'
                } else {
                    throw new HttpException('Model file type not supported.', 400)
                }
            } else {
                throw new HttpException('Only one model file supported.', 400)
            }
        } else {
            if (modelType) {
                return modelType
            } else {
                throw new HttpException('Model file must be provided.', 400)
            }
        }
    }
    
    async processImage(versionId: string, imageType: 'png', files?: {model: Express.Multer.File[], image: Express.Multer.File[]}) {
        if (files.image) {
            if (files.image.length == 1) {
                if (files.image[0].mimetype == 'image/png') {
                    writeFileSync(`./uploads/${versionId}.png`, files.image[0].buffer)
                    return 'png'
                } else {
                    throw new HttpException('Image file type not supported.', 400)
                }
            } else {
                throw new HttpException('Only one image file supported.', 400)
            }
        } else if (files.model) {
            // Render model later
            return null
        } else {
            if (imageType) {
                return imageType
            } else {
                throw new HttpException('Image or model file must be provided.', 400)
            }
        }
    }
    
    async renderImage(productId: string, versionId: string, files?: {model: Express.Multer.File[], image: Express.Multer.File[]}) {
        if (files && (files.image || files.model)) {
            if (files.image) {
                // Model must not be rendered
            } else if (files.model) {
                if (files.model.length == 1) {
                    if (files.model[0].originalname.endsWith('.stl')) {
                        try {
                            const image = await renderStl(files.model[0].buffer, 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.ply')) {
                        try {
                            const image = await renderPly(files.model[0].buffer.toString(), 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.dae')) {
                        try {
                            const image = await renderDae(files.model[0].buffer.toString(), 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.fbx')) {
                        try {
                            const image = await renderFbx(files.model[0].buffer, 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.glb')) {
                        try {
                            const image = await renderGlb(files.model[0].buffer, 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.ldr')) {
                        try {
                            const image = await renderLDraw(files.model[0].buffer.toString(), 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else if (files.model[0].originalname.endsWith('.mpd')) {
                        try {
                            const image = await renderLDraw(files.model[0].buffer.toString(), 1000, 1000)
                            await this.updateImage(productId, versionId, image)
                        } catch (e) {
                            console.error(new Date(), 'Could not render image', e)
                        }
                    } else {
                        throw new HttpException('Model file type not supported.', 400)
                    }
                } else {
                    throw new HttpException('Only one model file supported.', 400)
                }
            } else {
                throw new HttpException('Image or model file must be provided.', 400)
            }
        }
    }
    
    async updateImage(productId: string, versionId: string, image: Jimp) {
        // Save image
        await image.writeAsync(`./uploads/${versionId}.png`)
        // Update version
        const version = await Database.get().versionRepository.findOneBy({ productId, versionId })
        version.updated = Date.now()
        version.imageType = 'png'
        await Database.get().versionRepository.save(version)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = version.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], versions: [version] })
        // Notify changes
        this.notifyAddOrUpdateVersion(product, version)
    }

    async notifyAddOrUpdateVersion(product: ProductRead, version: VersionRead) {
        // Send emails
        //const text = String(await unified().use(remarkParse).use(remarkRehype).use(rehypeMermaid).use(rehypeStringify).process(version.description)).replace('src="/', 'style="max-width: 100%" src="https://caddrive.com/').replace('href="/', 'href="https://caddrive.com/')
        const text = String(await unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(version.description)).replace('src="/', 'style="max-width: 100%" src="https://caddrive.com/').replace('href="/', 'href="https://caddrive.com/')
        const members = await Database.get().memberRepository.findBy({ productId: product.productId, deleted: IsNull() })
        for (const member of members) {
            if (member.userId != this.request.user.userId) {
                const user = await Database.get().userRepository.findOneBy({ userId: member.userId })
                if (!user.deleted && user.emailNotification) {
                    const transporter = await TRANSPORTER
                    const info = await transporter.sendMail({
                        from: 'CADdrive <mail@caddrive.com>',
                        to: user.email,
                        subject: 'Version notification',
                        templateName: 'version',
                        templateData: {
                            user: this.request.user,
                            date: new Date(version.updated).toDateString(),
                            product: product,
                            version,
                            text,
                            image: `https://caddrive.com/rest/files/${version.versionId}.${version.imageType}`,
                            link: `https://caddrive.com/products/${product.productId}`
                        }
                    })
                    console.log(new Date(), getTestMessageUrl(info))
                }
            }
        }
    }
}