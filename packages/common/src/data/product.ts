import { ApiProperty } from '@nestjs/swagger'

export class ProductUpdateData {
    @ApiProperty()
    name: string
    @ApiProperty()
    description: string
    @ApiProperty()
    public: boolean
}

export class ProductAddData extends ProductUpdateData {
    @ApiProperty()
    userId: string
}

export class Product extends ProductAddData {
    @ApiProperty()
    id: string
    @ApiProperty()
    deleted: boolean
}