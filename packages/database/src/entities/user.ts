import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm'

import { CommentEntity } from './comment'
import { IssueEntity } from './issue'
import { MemberEntity } from './member'
import { MilestoneEntity } from './milestone'
import { ProductEntity } from './product'
import { VersionEntity } from './version'

@Entity()
export class UserEntity {
    @PrimaryColumn({ nullable: false })
    userId: string
    @Column({ nullable: true })
    pictureId: string

    @Column({ nullable: false })
    created: number
    @Column({ nullable: false, default: 0 })
    updated: number
    @Column({ nullable: true })
    deleted: number

    @Column({ nullable: false, unique: false })
    email: string
    @Column({ nullable: true })
    consent: boolean
    @Column({ nullable: true })
    name: string
    @Column({ nullable: true })
    emailNotification: boolean
    @Column({ nullable: true })
    admin: boolean

    @OneToMany(() => ProductEntity, product => product.user)
    products: Relation<ProductEntity>[]
    @OneToMany(() => MemberEntity, member => member.user)
    members: Relation<MemberEntity>[]
    @OneToMany(() => VersionEntity, version => version.user)
    versions: Relation<VersionEntity>[]
    @OneToMany(() => MilestoneEntity, milestone => milestone.user)
    milestones: Relation<MilestoneEntity>[]
    @OneToMany(() => IssueEntity, issue => issue.user)
    issues: Relation<IssueEntity>[]
    @OneToMany(() => CommentEntity, comment => comment.user)
    comments: Relation<CommentEntity>[]
}