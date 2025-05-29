import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Relation } from 'typeorm'

import { CommentEntity } from './comment'
import { MilestoneEntity } from './milestone'
import { ProductEntity } from './product'
import { UserEntity } from './user'

@Entity()
export class IssueEntity {
    @Column({nullable: false})
    userId: string
    @Column({ nullable: false })
    productId: string
    @PrimaryColumn({ nullable: false })
    issueId: string
    @Column({nullable: true})
    milestoneId: string
    @Column('simple-array')
    assignedUserIds: string[]

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: Relation<UserEntity>
    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: Relation<ProductEntity>
    @ManyToOne(() => MilestoneEntity)
    @JoinColumn({ name: 'milestoneId' })
    milestone: Relation<MilestoneEntity>
    
    @OneToMany(() => CommentEntity, comment => comment.issue)
    comments: Relation<CommentEntity>[]

    @Column({ nullable: false })
    created: number
    @Column({ nullable: false, default: 0 })
    updated: number
    @Column({ nullable: true })
    deleted: number

    @Column({nullable: false})
    number: number
    @Column({nullable: false, default: 'open'})
    state: 'open' | 'closed'
    @Column({nullable: false})
    label: string
}