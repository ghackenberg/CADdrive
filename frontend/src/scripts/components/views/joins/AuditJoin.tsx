import * as React from 'react'
import { useState, useEffect, Fragment, FormEvent } from 'react'
import { Link, RouteComponentProps, useHistory } from 'react-router-dom'
// Commons
import { Audit, Version, Product, CommentEvent, User, Event } from 'fhooe-audit-platform-common'
// Clients
import { AuditAPI, EventAPI, ProductAPI, UserAPI, VersionAPI } from '../../../clients/rest'
// Contexts
import { UserContext } from '../../../contexts/User'
// Snippets
import { Header } from '../../snippets/Header'
import { Navigation } from '../../snippets/Navigation'
// Links
import { AuditLink } from '../../links/AuditLink'
// Inputs
import { TextInput } from '../../inputs/TextInput'
// Widgets
import { Column, Table } from '../../widgets/Table'
// Images
import * as EventIcon from '/src/images/event.png'
import * as DeleteIcon from '/src/images/delete.png'
import { ModelView } from '../../widgets/ModelView'

export const AuditJoinView = (props: RouteComponentProps<{audit: string}>) => {

    const auditId = props.match.params.audit

    const history = useHistory()

    const user = React.useContext(UserContext)

    // Define entities
    const [audit, setAudit] = useState<Audit>()
    const [version, setVersion] = useState<Version>()
    const [product, setProduct] = useState<Product>()
    const [events, setEvents] = useState<Event[]>()
    const [users, setUsers] = useState<{[id: string]: User}>({})

    // Define values
    const [text, setText] = useState<string>('')

    // Load entities
    useEffect(() => { version && ProductAPI.getProduct(version.productId).then(setProduct) }, [version])
    useEffect(() => { audit && VersionAPI.getVersion(audit.versionId).then(setVersion) }, [audit])
    useEffect(() => { AuditAPI.getAudit(auditId).then(setAudit) }, [props])
    useEffect(() => { EventAPI.findEvents(undefined, auditId).then(setEvents) }, [props])
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

    // Post events
    useEffect(() => {
        EventAPI.addEnterEvent({ auditId: auditId, userId: user.id, time: new Date().toString(), type: 'enter' })
        return () => {
            EventAPI.addLeaveEvent({ auditId: auditId, userId: user.id, time: new Date().toString(), type: 'leave' }) 
        }
    }, [props])

    async function deleteEvent(id: string) {
        await EventAPI.deleteEvent(id)
        setEvents(events.filter(event => event.id != id))
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (text) {
            const comment = await EventAPI.addCommentEvent({ time: new Date().toString(), auditId: auditId, userId: user.id, type: 'comment', text: text})
            const array = [...events]
            array.push(comment)
            setEvents(array)
            setText('')
        }
    }

    async function reset(_event: FormEvent) {
        history.goBack()
    }

    const columns: Column<Event>[] = [
        {label: 'Icon', content: _event => <img src={EventIcon} style={{width: '1em'}}/>},
        {label: 'User', content: event => event.userId in users ? <span>{users[event.userId].name} &lt;{users[event.userId].email}&gt;</span> : <p>Loading...</p>},
        {label: 'Type', content: event => event.type},
        {label: 'Time', content: event => new Date(event.time).toISOString()},
        {label: 'Text', content: event => event.type == 'comment' ? (event as CommentEvent).text : ''},
        {label: 'Delete', content: event => <a href="#" onClick={_event => deleteEvent(event.id)}><img src={DeleteIcon} style={{width: '1em', height: '1em'}}/></a>}
    ]

    return (
        <div className='view audit'>
            <Header/>
            <Navigation/>
            <main>
                { product && version && audit && events ? (
                    <Fragment>
                        <div>
                            <nav>
                                <AuditLink product={product} version={version} audit={audit}/>
                            </nav>
                            <h1>Audit editor</h1>
                            <h2>Audit action</h2>
                            <p>
                                <Link to={`/events?audit=${auditId}`}>Leave</Link>
                            </p>
                            <h2>Comment form</h2>
                            <form onSubmit={submit} onReset={reset} className='data-input'>
                                <TextInput label='Text' placeholder={'Type text'} value={text} change={setText}/>
                                <div>
                                    <div/>
                                    <div>
                                        <input type='submit' value='Submit'/>
                                    </div>
                                </div>
                            </form>
                            <h2>Event list</h2>
                            <Table columns={columns} items={events}/>
                        </div>
                        <div>
                            <ModelView url={`/rest/models/${version.id}`}/>
                        </div>
                    </Fragment>
                ) : (
                    <p>Loading...</p>
                )}
            </main>
        </div>
    )
    
}
