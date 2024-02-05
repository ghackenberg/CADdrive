import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'

import { ImageType, ModelType, Version } from 'productboard-common'

import { ProductEntity } from './product'
import { UserEntity } from './user'

@Entity()
export class VersionEntity extends Version {
    @Column({ nullable: false })
    override productId: string
    @PrimaryColumn({ nullable: false })
    override versionId: string
    @Column({ nullable: false })
    override userId: string
    @Column('simple-array')
    override baseVersionIds: string[]

    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: ProductEntity
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: UserEntity

    @Column({ nullable: false })
    override created: number
    @Column({ nullable: false, default: 0 })
    override updated: number
    @Column({ nullable: true })
    override deleted: number

    @Column({ nullable: false })
    override major: number
    @Column({ nullable: false })
    override minor: number
    @Column({ nullable: false })
    override patch: number

    @Column({ nullable: false })
    override description: string

    @Column({ nullable: false })
    override modelType: ModelType
    @Column({ nullable: true })
    override imageType: ImageType
}