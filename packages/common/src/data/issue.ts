import { ApiProperty } from '@nestjs/swagger'

export class IssueUpdateData {
    @ApiProperty()
    name: string
    @ApiProperty()
    description: string
    @ApiProperty()
    state: 'open' | 'closed'
    @ApiProperty()
    assigneeIds: string[]
    @ApiProperty()
    milestoneId?: string
}

export class IssueAddData extends IssueUpdateData {
    @ApiProperty()
    userId: string
    @ApiProperty()
    productId: string
    @ApiProperty()
    creationDate: string
}

export class Issue extends IssueAddData {
    @ApiProperty()
    id: string
    @ApiProperty()
    deleted: boolean
    @ApiProperty()
    audioId?: string
}