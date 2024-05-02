import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'

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
    @Column({ nullable: false })
    emailNotification: boolean

    @OneToMany(() => ProductEntity, product => product.user)
    products: ProductEntity[]
    @OneToMany(() => MemberEntity, member => member.user)
    members: MemberEntity[]
    @OneToMany(() => VersionEntity, version => version.user)
    versions: VersionEntity[]
    @OneToMany(() => MilestoneEntity, milestone => milestone.user)
    milestones: MilestoneEntity[]
    @OneToMany(() => IssueEntity, issue => issue.user)
    issues: IssueEntity[]
    @OneToMany(() => CommentEntity, comment => comment.user)
    comments: CommentEntity[]
}