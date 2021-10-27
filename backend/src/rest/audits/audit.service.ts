import { forwardRef, Inject, Injectable } from '@nestjs/common'
import * as shortid from 'shortid'
import { Audit, AuditData, AuditREST } from 'fhooe-audit-platform-common'
import { VersionService } from '../versions/version.service'
import { ProductService } from '../products/product.service'
import { EventService } from '../events/event.service'

@Injectable()
export class AuditService implements AuditREST {
    private audits: Audit[] = [{name: 'Audit 1', id: 'TestAudit', versionId: 'TestVersion', start: new Date().toString(), end: new Date().toString()}]

    public constructor(
        @Inject(forwardRef(() => VersionService))
        private versionService: VersionService,

        @Inject(forwardRef(() => EventService))
        private eventService: EventService,

        @Inject(forwardRef(() => ProductService))
        private productService: ProductService
    ) {}

    async addAudit(data: AuditData): Promise<Audit> {
        const audit = { id: shortid(), ...data }

        this.audits.push(audit)
        
        return audit
    }

    async deleteAudit(id: string, versionId?: string,): Promise<Audit[]> {

        if (id) {
            this.audits = this.audits.filter(audits => audits.id != id)
        }
        if (versionId) {
            const audit = this.audits.find(audit => audit.versionId == versionId)
            this.eventService.deleteEvent(undefined, audit.id)
            this.audits = this.audits.filter(audits => audits.versionId != versionId)
        }


        return this.audits
    }

    async findAudits(quick?: string, name?: string, product?: string, version?: string) : Promise<Audit[]> {
        
        const result: Audit[] = []

        quick = quick ? quick.toLowerCase() : undefined
        name = name ? name.toLowerCase() : undefined

        for (var index = 0; index < this.audits.length; index++) {

            const audit = this.audits[index]

            if (quick) {
                const versionProductId = (await this.versionService.getVersion(audit.versionId)).productId
                const conditionA = audit.name.toLowerCase().includes(quick)
                const conditionB = (await this.productService.getProduct(versionProductId)).name.toLowerCase().includes(quick)
                const conditionC = (await this.versionService.getVersion(audit.versionId)).name.toLowerCase().includes(quick)

                if (!(conditionA || conditionB || conditionC)) {
                    continue
                }
            }
            if (name && !audit.name.toLowerCase().includes(name)) {
                continue
            }
            if (product && (await this.versionService.getVersion(audit.versionId)).productId != product) {
                continue
            }
            if (version && audit.versionId != version) {
                continue
            }
            result.push(audit)
        }
        return result
    }

    async getAudit(id: string): Promise<Audit> {
        for (var i = 0; i < this.audits.length; i++) {
            if (this.audits[i].id == id)
                return this.audits[i]
        }
        return null
    }

    async updateAudit(audit: Audit): Promise<Audit> {
        
        for (var i = 0; i < this.audits.length; i++) {
            if (this.audits[i].id == audit.id && (
                this.audits[i].name != audit.name ||
                this.audits[i].versionId != audit.versionId ||
                this.audits[i].start != audit.start ||
                this.audits[i].end != audit.end)){

                    this.audits.splice(i,1,audit)
            }
        }

        return audit
    }
}