import { ApiProperty } from '@nestjs/swagger'

export class IssueTypeHierarchyUpdateData {
    @ApiProperty()
    baseIssueTypeId: string
    @ApiProperty()
    childIssueTypeId: string
}

export class IssueTypeHierarchyAddData extends IssueTypeHierarchyUpdateData {
    
}

export class IssueTypeHierarchy extends IssueTypeHierarchyAddData {
    @ApiProperty()
    id: string

    @ApiProperty()
    deleted: number
}