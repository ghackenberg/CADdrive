import  * as React from 'react'
import { useState, useEffect } from 'react'
import { Link, RouteComponentProps } from 'react-router-dom'
// Commons
import { Audit, CommentEvent, Event, Product, User, Version} from 'fhooe-audit-platform-common'
// Clients
import { AuditAPI, EventAPI, ProductAPI, UserAPI, VersionAPI } from '../../../clients/rest'
// Links
import { AuditLink } from '../../links/AuditLink'
// Searches
import { EventSearch } from '../../searches/EventSearch'
// Widgets
import { Column, Table } from '../../widgets/Table'
import { ModelView } from '../../widgets/ModelView'
// Images
import * as AddIcon from '/src/images/add.png'
import * as EditIcon from '/src/images/edit.png'
import * as EventIcon from '/src/images/event.png'
import * as DeleteIcon from '/src/images/delete.png'

export const EventListView = (props: RouteComponentProps<{audit: string}>) => {

    const query = new URLSearchParams(props.location.search)

    const auditId = query.get('audit')

    // Define entities
    const [product, setProduct] = useState<Product>()
    const [version, setVersion] = useState<Version>()
    const [audit, setAudit] = useState<Audit>()
    const [events, setEvents] = useState<Event[]>()
    const [users, setUsers] = useState<{[id: string]: User}>({})

    // Load entities
    useEffect(() => { AuditAPI.getAudit(auditId).then(setAudit) }, [props])
    useEffect(() => { audit && VersionAPI.getVersion(audit.versionId).then(setVersion) }, [audit])
    useEffect(() => { version && ProductAPI.getProduct(version.productId).then(setProduct) }, [version])
    useEffect(() => { EventAPI.findEvents(null, null, null, null, null, null, auditId).then(setEvents) }, [props])
    useEffect(() => {
        if (events) {
            const load: string[] = []
            events.forEach(event => {
                if (!(event.userId in users)) {
                    load.push(event.userId)
                }
            })
            load.forEach(userId => {
                UserAPI.getUser(userId).then(user => {
                    const dict = {...users}
                    dict[userId] = user
                    setUsers(dict)
                })
            })
        }
    }, [props, events])

    async function deleteEvent(_id: string) {

    }

    const columns: Column<Event>[] = [
        {label: '', content: _event => <a><img src={EventIcon}/></a>},
        {label: 'User', content: event => event.userId in users ? <Link to={`/users/${event.userId}`}>{users[event.userId].name}</Link> : 'Loading'},
        {label: 'Date', content: event => new Date(event.time).toISOString().substring(0, 10)},
        {label: 'Time', content: event => new Date(event.time).toISOString().substring(11, 16)},
        {label: 'Text', content: event => event.type == 'comment' ? (event as CommentEvent).text : ''},
        {label: '', content: event => <Link to={`/events/${event.id}`}><img src={EditIcon}/></Link>},
        {label: '', content: event => <a href="#" onClick={_event => deleteEvent(event.id)}><img src={DeleteIcon}/></a>},
        {label: '', content: _event => '', class: 'fill'}
    ]

    return (
        <div className='view sidebar audit'>
            { events && audit && version && product && (
                <React.Fragment>
                    <header>
                        <nav>
                            <AuditLink audit={audit} version={version} product={product}/>                      
                        </nav>
                    </header>
                    <main>
                        <div>
                            <h1>
                                Comments
                                <Link to={`/events/new?audit=${audit.id}`}>
                                    <img src={AddIcon}/>
                                </Link>
                            </h1>
                            <EventSearch audit={auditId} change={setEvents}/>
                            <Table columns={columns} items={events}/> 
                        </div>
                        <div>
                            <ModelView url={`/rest/models/${version.id}`} mouse={true}/>
                        </div>
                    </main>
                </React.Fragment>
            )}
        </div>
    )
}