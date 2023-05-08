import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'

import { Tag } from 'productboard-common'

import { TagAssignmentEntity } from './tagAssignment'

@Entity()
export class TagEntity extends Tag {

    @PrimaryColumn({ nullable: false })
    override id: string

    @Column({ nullable: false })
    override created: number

    @Column({ nullable: true })
    override updated: number

    @Column({ nullable: true })
    override deleted: number

    @Column({ nullable: false })
    override productId: string

    @Column({ nullable: false })
    override name: string

    @Column({nullable: false})
    override color: string

    @OneToMany(() => TagAssignmentEntity, TagAssignment => TagAssignment.tag)
    tagAssignment: TagAssignmentEntity[]
}