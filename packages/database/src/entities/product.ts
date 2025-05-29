import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Relation } from 'typeorm'

import { IssueEntity } from './issue'
import { MemberEntity } from './member'
import { MilestoneEntity } from './milestone'
import { UserEntity } from './user'
import { VersionEntity } from './version'

@Entity()
export class ProductEntity {
    @PrimaryColumn({ nullable: false })
    productId: string
    @Column({ nullable: false })
    userId: string

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
    name: string
    @Column({ nullable: false })
    description: string
    @Column({ nullable: false })
    public: boolean
    
    @OneToMany(() => VersionEntity, version => version.product)
    versions: Relation<VersionEntity>[]
    @OneToMany(() => MemberEntity, member => member.product)
    members: Relation<MemberEntity>[]
    @OneToMany(() => MilestoneEntity, milestone => milestone.product)
    milestones: Relation<MilestoneEntity>[]
    @OneToMany(() => IssueEntity, issue => issue.product)
    issues: Relation<IssueEntity>[]
}