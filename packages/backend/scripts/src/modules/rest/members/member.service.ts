import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'

import { getTestMessageUrl } from 'nodemailer'
import { nanoid } from 'nanoid'
import { IsNull } from 'typeorm'

import { MemberCreate, MemberREST, MemberRead, MemberUpdate, ProductRead } from 'productboard-common'
import { Database, convertMember } from 'productboard-database'

import { emitProductMessage } from '../../../functions/emit'
import { TRANSPORTER } from '../../../functions/mail'
import { AuthorizedRequest } from '../../../request'

@Injectable()
export class MemberService implements MemberREST {
    constructor(
        @Inject(REQUEST)
        private readonly request: AuthorizedRequest
    ) {}

    async findMembers(productId: string): Promise<MemberRead[]> {
        const where = { productId, deleted: IsNull() }
        const result: MemberRead[] = []
        for (const member of await Database.get().memberRepository.findBy(where)) {
            result.push(await convertMember(member))
        }
        return result
    }

    async addMember(productId: string, data: MemberCreate): Promise<MemberRead> {
        // Create member
        const memberId = nanoid()
        const created = Date.now()
        const updated = created
        const member = await Database.get().memberRepository.save({ productId, memberId, created, updated, ...data })
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = member.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], members: [member] })
        // Notify changes
        this.notifyMember(product, member, 'Member notification (add)')
        // Return member
        return convertMember(member)
    }

    async getMember(productId: string, memberId: string): Promise<MemberRead> {
        const member = await Database.get().memberRepository.findOneByOrFail({ productId, memberId })
        return convertMember(member)
    }

    async updateMember(productId: string, memberId: string, data: MemberUpdate): Promise<MemberRead> {
        // Update member
        const member = await Database.get().memberRepository.findOneByOrFail({ productId, memberId })
        member.updated = Date.now()
        member.role = data.role
        await Database.get().memberRepository.save(member)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = member.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], members: [member] })
        // Notify changes
        this.notifyMember(product, member, 'Member notification (update)')
        // Return member
        return convertMember(member)
    }
    
    async deleteMember(productId: string, memberId: string): Promise<MemberRead> {
        // Update member
        const member = await Database.get().memberRepository.findOneByOrFail({ productId, memberId })
        member.deleted = Date.now()
        member.updated = member.deleted
        await Database.get().memberRepository.save(member)
        // Update product
        const product = await Database.get().productRepository.findOneBy({ productId })
        product.updated = member.updated
        await Database.get().productRepository.save(product)
        // Emit changes
        emitProductMessage(productId, { type: 'patch', products: [product], members: [member] })
        // Return member
        return convertMember(member)
    }

    async notifyMember(product: ProductRead, member: MemberRead, subject: string) {
        const user = await Database.get().userRepository.findOneBy({ userId: member.userId, deleted: IsNull() })
        const transporter = await TRANSPORTER
        const info = await transporter.sendMail({
            from: 'CADdrive <mail@caddrive.com>',
            to: user.email,
            subject,
            templateName: 'member',
            templateData: {
                user: this.request.user,
                date: new Date(member.created).toDateString(),
                product,
                member,
                link: `https://caddrive.com/products/${product.productId}`
            }
        })
        console.log(new Date(), getTestMessageUrl(info))
    }
}