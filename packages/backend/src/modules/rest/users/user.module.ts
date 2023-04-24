import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'

import { AuthGuard } from './auth.guard'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
    imports: [ClientsModule.register([{ name: 'MQTT', transport: Transport.MQTT }])],
    controllers: [UserController],
    providers: [UserService, AuthGuard],
    exports: [UserService]
})
export class UserModule {}