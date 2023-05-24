import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm'

import { Product } from 'productboard-common'

import { IssueEntity } from './issue'
import { MemberEntity } from './member'
import { MilestoneEntity } from './milestone'
import { UserEntity } from './user'
import { VersionEntity } from './version'

@Entity()
export class ProductEntity extends Product {
    @PrimaryColumn({ nullable: false })
    override id: string

    @Column({ nullable: false })
    override created: number
    @Column({ nullable: false, default: 0 })
    override updated: number
    @Column({ nullable: true })
    override deleted: number

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: UserEntity

    @Column({ nullable: false })
    override userId: string
    
    @Column({ nullable: false })
    override name: string
    
    @Column({ nullable: false })
    override description: string

    @Column({ nullable: false })
    override public: boolean
    
    @OneToMany(() => VersionEntity, version => version.product)
    versions: VersionEntity[]

    @OneToMany(() => MemberEntity, member => member.product)
    members: MemberEntity[]

    @OneToMany(() => MilestoneEntity, milestone => milestone.product)
    milestones: MilestoneEntity[]

    @OneToMany(() => IssueEntity, issue => issue.product)
    issues: IssueEntity[]
}