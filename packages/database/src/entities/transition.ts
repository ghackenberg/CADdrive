import { Column, Entity, PrimaryColumn } from 'typeorm'

import { Transition } from 'productboard-common'

@Entity()
export class TransitionEntity extends Transition {

    @PrimaryColumn({ nullable: false })
    override id: string

    @Column({ nullable: true })
    override deleted: number

    @Column({nullable: false})
    override sourceStateId: string

    @Column({nullable: false})
    override targetStateId: string

    @Column({nullable: false})
    override name: string

    @Column({nullable: false})
    override description: string
}