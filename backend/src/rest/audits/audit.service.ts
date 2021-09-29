import { Injectable } from '@nestjs/common'
import * as shortid from 'shortid'
import { Audit, AuditData, AuditREST } from 'fhooe-audit-platform-common'

@Injectable()
export class AuditService implements AuditREST {
    private audits: Audit[] = []

    /*
    constructor() {
        /*
        var date = new Date()

        for (var i = 0; i < Math.random() * 20; i++) {
            this.audits.push({
                id: shortid(),
                name: shortid(),
                start: date.getUTCFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
                end: date.getUTCFullYear() + '-' + (date.getMonth() + randomInteger(1,6)) + '-' + randomInteger(1,30),
                version:
            })
        }

        function randomInteger(min: number, max: number) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    */

    async findAudits(name?: string) : Promise<Audit[]> {
        
        const auditsQuery: Audit[] = []


        const auditsNameLower = this.audits.map(audit => audit.name.toLowerCase())

        for (var i = 0; i < auditsNameLower.length; i++) {

            if (!name || name != null && auditsNameLower[i].includes(name.toLowerCase())) {
                auditsQuery.push(this.audits[i])
            }
        }

        return auditsQuery
    }

    async getAudit(id: string): Promise<Audit> {
        for (var i = 0; i < this.audits.length; i++) {
            if (this.audits[i].id == id)
                return this.audits[i]
        }
        return null
    }
    
    async addAudit(data: AuditData) {
        const audit = { id: shortid(), ...data }

        this.audits.push(audit)
        
        return audit
    }

    async updateAudit(audit: Audit) {
        
        for (var i = 0; i < this.audits.length; i++) {
            if (this.audits[i].id == audit.id &&
                this.audits[i].name == audit.name &&
                this.audits[i].productId == audit.productId &&
                this.audits[i].versionId == audit.versionId &&
                this.audits[i].start == audit.start &&
                this.audits[i].end == audit.end) {

                this.audits = this.audits.filter(audits => audits.id != audit.id)

            }
            else if (this.audits[i].id == audit.id){

                    this.audits.splice(i,1,audit)
            }
        }

        return audit
    }
}