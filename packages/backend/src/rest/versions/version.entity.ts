import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ProductEntity } from '../products/product.entity'
import { UserEntity } from "../users/user.entity";

@Entity()
export class VersionEntity {
    @PrimaryColumn()
    id: string

    @Column({ nullable: false, default: false })
    deleted: boolean

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'userId' })
    user: UserEntity

    @Column({ nullable: false })
    userId: string

    @ManyToOne(() => ProductEntity)
    @JoinColumn({ name: 'productId' })
    product: ProductEntity

    @Column({ nullable: false })
    productId: string

    //@Column({ nullable: false, array: true })
    @Column("simple-array")
    baseVersionIds: string[]

    @Column({ nullable: false })
    time: string

    @Column({ nullable: false })
    major: number

    @Column({ nullable: false })
    minor: number

    @Column({ nullable: false })
    patch: number

    @Column({ nullable: false })
    description: string
}