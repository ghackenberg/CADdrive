import { ApiProperty } from '@nestjs/swagger'

export class CommentUpdateData {
    @ApiProperty()
    text: string
    @ApiProperty()
    action: 'none' | 'close' | 'reopen'
}

export class CommentAddData extends CommentUpdateData {
    @ApiProperty()
    issueId: string
}

export class Comment extends CommentAddData {
    @ApiProperty()
    id: string
    @ApiProperty()
    deleted: boolean
    @ApiProperty()
    userId: string
    @ApiProperty()
    time: string
    @ApiProperty()
    audioId?: string
}