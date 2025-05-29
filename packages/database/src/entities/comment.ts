import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm'

import { IssueEntity } from './issue'
import { ProductEntity } from './product'
import { UserEntity } from './user'

@Entity()
export class CommentEntity {
    @Column({ nullable: false })
    productId: string
    @Column({ nullable: false })
    issueId: string
    @PrimaryColumn({ nullable: false })
    commentId: string
    @Column({ nullable: false })
    userId: string

    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: Relation<ProductEntity>
    @ManyToOne(() => IssueEntity)
    @JoinColumn({ name: 'issueId' })
    issue: Relation<IssueEntity>
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
    text: string
    @Column({ nullable: false, default: 'none' })
    action: 'none' | 'close' | 'reopen'
}