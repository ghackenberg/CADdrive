import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm'

import { ImageType, ModelType } from 'productboard-common'

import { ProductEntity } from './product'
import { UserEntity } from './user'

@Entity()
export class VersionEntity {
    @Column({ nullable: false })
    productId: string
    @PrimaryColumn({ nullable: false })
    versionId: string
    @Column({ nullable: false })
    userId: string
    @Column('simple-array')
    baseVersionIds: string[]

    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: Relation<ProductEntity>
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: Relation<UserEntity>

    @Column({ nullable: false })
    created: number
    @Column({ nullable: false, default: 0 })
    updated: number
    @Column({ nullable: true })
    deleted: number

    @Column({ nullable: false })
    major: number
    @Column({ nullable: false })
    minor: number
    @Column({ nullable: false })
    patch: number

    @Column({ nullable: false })
    description: string

    @Column({ nullable: false })
    modelType: ModelType
    @Column({ nullable: true })
    imageType: ImageType
}