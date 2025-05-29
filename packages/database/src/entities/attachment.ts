import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm'

import { ProductEntity } from './product'
import { UserEntity } from './user'

@Entity()
export class AttachmentEntity {
    @Column({ nullable: false })
    productId: string
    @PrimaryColumn({ nullable: false })
    attachmentId: string
    @Column({ nullable: false })
    userId: string

    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: Relation<ProductEntity>
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: Relation<UserEntity>

    @Column({ nullable: false })
    created: number
    @Column({ nullable: false })
    updated: number
    @Column({ nullable: true })
    deleted: number
    
    @Column({ nullable: false })
    name: string
    @Column({ nullable: false })
    type: string
}