import  * as React from 'react'
import { useState, useEffect, useContext, FormEvent, Fragment } from 'react'
import { Redirect, useHistory } from 'react-router' 
import { RouteComponentProps } from 'react-router-dom'
import { Object3D } from 'three'
// Commons
import { Issue, Product, User, Member, Version } from 'productboard-common'
// Managers
import { UserManager } from '../../managers/user'
import { ProductManager } from '../../managers/product'
import { IssueManager } from '../../managers/issue'
// Contexts
import { UserContext } from '../../contexts/User'
// Snippets
import { ProductHeader } from '../snippets/ProductHeader'
// Widgets
import { ProductView3D } from '../widgets/ProductView3D'
import { MemberManager } from '../../managers/member'
// Inputs
import { TextInput } from '../inputs/TextInput'
import { TextareaInput } from '../inputs/TextareaInput'
import { Column, Table } from '../widgets/Table'

export const IssueView = (props: RouteComponentProps<{product: string, issue: string}>) => {

    const history = useHistory()

    // CONTEXTS

    const user = useContext(UserContext)

    // PARAMS

    const productId = props.match.params.product
    const issueId = props.match.params.issue

    // STATES

    // - Entities
    const [product, setProduct] = useState<Product>()
    const [members, setMembers] = useState<Member[]>()
    const [users, setUsers] = useState<{[id: string]: User}>({})
    const [issue, setIssue] = useState<Issue>()
    // - Values
    const [label, setLabel] = useState<string>('')
    const [text, setText] = useState<string>('')
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])

    // EFFECTS

    // - Entities
    useEffect(() => { ProductManager.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { MemberManager.findMembers(productId).then(setMembers) }, [props])
    useEffect(() => { issueId != 'new' && IssueManager.getIssue(issueId).then(setIssue) }, [props])
    useEffect(() => {
        if (members) {
            Promise.all(members.map(member => UserManager.getUser(member.userId))).then(memberUsers => {
                const newUsers = {...users}
                for (var index = 0; index < members.length; index++) {
                    newUsers[members[index].id] = memberUsers[index]
                }
                setUsers(newUsers)
            })
        }
    }, [members])
    // - Values
    useEffect(() => { issue && setLabel(issue.label) }, [issue])
    useEffect(() => { issue && setText(issue.text) }, [issue])
    useEffect(() => { issue && setAssigneeIds(issue.assigneeIds) }, [issue])

    // FUNCTIONS

    async function selectObject(version: Version, object: Object3D) {
        if (issueId == 'new') {
            setText(`${text}[${object.name}](/products/${product.id}/versions/${version.id}/objects/${object.name})`)
        }
    }

    async function submitIssue(event: FormEvent){
        event.preventDefault()
        if (issueId == 'new') {
            if (label && text) {
                const issue = await IssueManager.addIssue({ userId: user.id, productId, time: new Date().toISOString(), label: label, text: text, state: 'open', assigneeIds })
                history.replace(`/products/${productId}/issues/${issue.id}/comments`)
            }
        } else {
            if (label && text) {
                await IssueManager.updateIssue(issue.id, { ...issue, label: label, text: text, assigneeIds })
                history.goBack()    
            }
        }
    }

    async function selectAssignee(userId: string) {
        const newAssignees = [...assigneeIds]
        const index = newAssignees.indexOf(userId)
        if (index == -1) {
            newAssignees.push(userId)
        } else {
            newAssignees.splice(index, 1)
        }
        setAssigneeIds(newAssignees)
    }

    // CONSTANTS

    const columns: Column<Member>[] = [
        {label: 'Picture', content: member => (
            member.id in users ? <img src={`/rest/files/${users[member.id].pictureId}.jpg`} className='big' /> : '?'
        )},
        {label: 'Member', class: 'fill left nowrap', content: member => (
            member.id in users ? users[member.id].name : '?'
        )},
        {label: 'Assignee', class: 'fill center nowrap', content: member => (
            <input type="checkbox" checked={assigneeIds.indexOf(member.userId) != -1} onChange={() => selectAssignee(member.userId)}/>
        )},
    ]

    // RETURN

    return (
        <main className='view extended audit'>
            { (issueId == 'new' || issue) && product && (
                <Fragment>
                    { issue && issue.deleted ? (
                        <Redirect to='/'/>
                    ) : (
                        <Fragment>
                            <ProductHeader product={product}/>
                            <main className="sidebar">
                                <div>
                                    <h1>Settings</h1>
                                        <form onSubmit={submitIssue} onReset={() => history.goBack()}>
                                            <TextInput class='fill' label='Label' placeholder='Type label' value={label} change={setLabel}/>
                                            <TextareaInput class='fill' label='Text' placeholder='Type text' value={text} change={setText}/>
                                            <div>
                                                <div>
                                                    Milestone:
                                                </div>
                                                <div>
                                                    <select>
                                                        <option></option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <div>
                                                    Assignees:
                                                </div>
                                                <div>
                                                    { members && <Table columns={columns} items={members}/> }
                                                </div>
                                            </div>
                                            <div>
                                                <div/>
                                                <div>
                                                    <input type='submit' value='Save'/>
                                                </div>
                                            </div>
                                        </form>
                                </div>
                                <div>
                                    <ProductView3D product={product} mouse={true} click={selectObject} vr= {true}/>
                                </div>
                            </main>
                        </Fragment>
                    ) }
                </Fragment>
            )}
        </main>
    )
}