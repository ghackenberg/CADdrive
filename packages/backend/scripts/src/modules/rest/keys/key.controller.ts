import { Controller, Get } from "@nestjs/common"

import { JWK } from "jose"

import { KeyREST } from "productboard-common"

import { KeyService } from "./key.service"

@Controller('rest/keys')
export class KeyController implements KeyREST {
    constructor(
        private readonly keyService: KeyService
    ) {}

    @Get()
    async getPublicJWK(): Promise<JWK> {
        return this.keyService.getPublicJWK()
    }
}