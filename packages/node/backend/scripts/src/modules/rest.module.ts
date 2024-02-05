import { Module } from '@nestjs/common'

import { AttachmentModule } from './rest/attachments/attachment.module'
import { CommentModule } from './rest/comments/comment.module'
import { FileModule } from './rest/files/file.module'
import { IssueModule } from './rest/issues/issue.module'
import { KeyModule } from './rest/keys/key.module'
import { MemberModule } from './rest/members/member.module'
import { MilestoneModule } from './rest/milestones/milestone.module'
import { PartModule } from './rest/parts/part.module'
import { ProductModule } from './rest/products/product.module'
import { TokenModule } from './rest/tokens/token.module'
import { UserModule } from './rest/users/user.module'
import { VersionModule } from './rest/versions/version.module'

@Module({
    imports: [KeyModule, TokenModule, UserModule, PartModule, ProductModule, VersionModule, IssueModule, CommentModule, AttachmentModule, FileModule, MilestoneModule, MemberModule]
})
export class RESTModule {}