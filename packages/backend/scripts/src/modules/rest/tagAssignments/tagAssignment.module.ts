import { Module } from '@nestjs/common'

import { TagAssignmentController } from './tagAssignment.controller'
import { TagAssignmentService } from './tagAssignment.service'

@Module({
    controllers: [TagAssignmentController],
    providers: [TagAssignmentService],
    exports: [TagAssignmentService],
})
export class TagAssignmentModule {}