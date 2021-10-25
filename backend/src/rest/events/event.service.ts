import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { EventREST, CommentEventData, EventData, CommentEvent } from 'fhooe-audit-platform-common'
import * as shortid from 'shortid'
import { AuditService } from '../audits/audit.service'
import { ProductService } from '../products/product.service'
import { VersionService } from '../versions/version.service'

@Injectable()
export class EventService implements EventREST {
    private events: (EventData & {id: string})[] = []

    public constructor (
        @Inject(forwardRef(() => AuditService))
        private auditService: AuditService, 

        @Inject(forwardRef(() => VersionService))
        private versionService: VersionService,

        @Inject(forwardRef(() => ProductService)) 
        private productService: ProductService
    ) { }

    async deleteEvent(event: EventData & {id: string} & { typeReq?: string }, auditId?: string): Promise<(EventData & {id: string})[]> {
        this.events = this.events.filter(events => events.id != event.id)

        if (event.typeReq) {
            return this.events.filter(events => events.type == event.typeReq)
        }
        else {

            if (auditId) {
                this.events = this.events.filter(events => events.auditId != auditId)
            }

            return this.events
        }
    }
 
    async findEvents(quick?: string, audit?: string, type?: string, user?: string, product?: string, version?: string, comment?: string): Promise<(EventData & {id: string})[]> {

        const result: (EventData & {id: string})[] = []

        quick = quick ? quick.toLowerCase() : undefined
        type = type ? type.toLowerCase() : undefined
        user = user ? user.toLowerCase() : undefined
        comment = comment ? comment.toLowerCase() : undefined
        
        for (var index = 0; index < this.events.length; index++) {
            const event = this.events[index]

            if (quick) {
                const auditVersionId = (await this.auditService.getAudit(event.auditId)).versionId
                const versionProductId = (await this.versionService.getVersion(auditVersionId)).productId
                const conditionA = (await this.auditService.getAudit(event.auditId)).name.toLowerCase().includes(quick)
                const conditionB = event.type.toLowerCase().includes(quick)
                const conditionC = event.user.toLowerCase().includes(quick)
                const conditionD = (await this.productService.getProduct(versionProductId)).name.toLowerCase().includes(quick)
                const conditionE = (await this.versionService.getVersion(auditVersionId)).name.toLowerCase().includes(quick) 
                const conditionF = event.type.toLowerCase() == 'comment' && (event as CommentEvent).text.toLowerCase().includes(quick)

                if (!(conditionA || conditionB || conditionC || conditionD || conditionE || conditionF)) {
                    continue
                }
            }
            if (audit && event.auditId != audit) {
                continue
            }
            if (type && !event.type.toLowerCase().includes(type)) {
                continue
            }
            if (user && event.user.toLowerCase().includes(user)) {
                continue
            }
            if (product && (await this.auditService.getAudit(event.auditId)).versionId != product) {
                continue
            }
            if (version && (await this.versionService.getVersion((await this.auditService.getAudit(event.auditId)).versionId)).productId != version) {
                continue
            }
            if (comment && (event.type != 'comment' || !(event as CommentEvent).text.toLowerCase().includes(comment))) {
                continue
            }
            result.push(event)   
        }

        return result
    }

    async enterEvent(enterEvent: EventData): Promise<EventData & {id: string}> {

        const event: EventData & {id: string} = {id: shortid(), ...enterEvent}

        this.events.push(event)

        return event
    }

    async leaveEvent(leaveEvent: EventData): Promise<EventData & {id: string}> {

        const event: EventData & {id: string} = {id: shortid(), ...leaveEvent}

        this.events.push(event)

        return event
    }

    async submitEvent(eventData: CommentEventData): Promise<CommentEvent> {

        const event: CommentEvent = {id: shortid(), ...eventData}

        this.events.push(event)

        return event
    }

}