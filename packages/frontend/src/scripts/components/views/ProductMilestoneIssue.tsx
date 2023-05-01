import  * as React from 'react'
import { useState, useEffect, Fragment, FormEvent, useContext } from 'react'
import { Redirect } from 'react-router'
import { Link, RouteComponentProps } from 'react-router-dom'

import { Comment, Issue, Member, Milestone, Product, User } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { calculateActual } from '../../functions/burndown'
import { countParts } from '../../functions/counter'
import { collectCommentParts, collectIssueParts, Part } from '../../functions/markdown'
import { CommentManager } from '../../managers/comment'
import { IssueManager } from '../../managers/issue'
import { MemberManager } from '../../managers/member'
import { MilestoneManager } from '../../managers/milestone'
import { ProductManager } from '../../managers/product'
import { UserManager } from '../../managers/user'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { BurndownChartWidget } from '../widgets/BurndownChart'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { Column, Table } from '../widgets/Table'
import { LoadingView } from './Loading'

import LoadIcon from '/src/images/load.png'
import DeleteIcon from '/src/images/delete.png'
import LeftIcon from '/src/images/list.png'
import RightIcon from '/src/images/chart.png'

export const ProductMilestoneIssueView = (props: RouteComponentProps<{product: string, milestone: string}>) => {

    // PARAMS

    const productId = props.match.params.product
    const milestoneId = props.match.params.milestone

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // INITIAL STATES

    const initialProduct = productId == 'new' ? undefined : ProductManager.getProductFromCache(productId)
    const initialMilestone = milestoneId == 'new' ? undefined : MilestoneManager.getMilestoneFromCache(milestoneId)
    const initialMembers = productId == 'new' ? undefined : MemberManager.findMembersFromCache(productId)
    const initialIssues = milestoneId == 'new' ? undefined: IssueManager.findIssuesFromCache(productId, milestoneId)
    const initialComments: {[id: string]: Comment[]} = {}
    for (const issue of initialIssues || []) {
        initialComments[issue.id] = CommentManager.findCommentsFromCache(issue.id)
    } 
    const initialUsers: {[id: string]: User} = {}
    for (const issue of initialIssues || []) {
        const user = UserManager.getUserFromCache(issue.userId)
        if (user) {
            initialUsers[user.id] = user
        }
        for (const comment of initialComments[issue.id] || []) {
            const otherUser = UserManager.getUserFromCache(comment.userId)
            if (otherUser) {
                initialUsers[otherUser.id] = otherUser
            }
        }
    } 
    const initialIssueParts = collectIssueParts(initialIssues)
    const initialCommentParts = collectCommentParts(initialComments)
    const initialPartsCount = countParts(initialIssues, initialComments, initialIssueParts, initialCommentParts)
    
    // STATES

    // - Entities
    const [product, setProduct] = useState<Product>(initialProduct)
    const [milestone, setMilestone] = useState<Milestone>(initialMilestone)
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [issues, setIssues] = useState<Issue[]>(initialIssues)
    const [comments, setComments] = useState<{[id: string]: Comment[]}>(initialComments)
    const [users, setUsers] = useState<{[id: string]: User}>(initialUsers)
    // - Computations
    const [issueParts, setIssueParts] = useState<{[id: string]: Part[]}>(initialIssueParts)
    const [commentParts, setCommentParts] = useState<{[id: string]: Part[]}>(initialCommentParts)
    const [partsCount, setPartsCount] = useState<{[id: string]: number}>(initialPartsCount)
    const [total, setTotalIssueCount] = useState<number>() 
    const [actual, setActualBurndown] = useState<{ time: number, actual: number}[]>([])
    const [openIssueCount, setOpenIssueCount] = useState<number>()
    const [closedIssueCount, setClosedIssueCount] = useState<number>()
    // - Interactions
    const [state, setState] = useState('open')
    const [active, setActive] = useState<string>('left')

    // EFFECTS

    // - Entities
    useEffect(() => { ProductManager.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { MilestoneManager.getMilestone(milestoneId).then(setMilestone) }, [props])
    useEffect(() => { MemberManager.findMembers(productId).then(setMembers) }, [props])
    useEffect(() => { IssueManager.findIssues(productId, milestoneId).then(setIssues)}, [props, milestoneId])
    useEffect(() => {
        if (issues) {
            const userIds: string[] = []

            for (const issue of issues) {
                if (!(issue.userId in users || userIds.includes(issue.userId))) {
                    userIds.push(issue.userId)
                }
                for (const assigneeId of issue.assigneeIds) {
                    if (!(assigneeId in users || userIds.includes(assigneeId))) {
                        userIds.push(assigneeId)
                    }
                }
            }

            Promise.all(userIds.map(userId => UserManager.getUser(userId))).then(userObjects => {
                const newUsers = {...users}
                for (const user of userObjects) {
                    newUsers[user.id] = user
                }
                setUsers(newUsers)
            })
        }
    }, [issues])
    useEffect(() => {
        if (issues) {
            Promise.all(issues.map(issue => CommentManager.findComments(issue.id))).then(issueComments => {
                const newComments = {...comments}
                for (let index = 0; index < issues.length; index++) {
                    newComments[issues[index].id] = issueComments[index]
                }
                setComments(newComments)
            })
        }
    }, [issues])

    // - Computations
    useEffect(() => {
        setIssueParts(collectIssueParts(issues))
    }, [issues])
    useEffect(() => {
        setCommentParts(collectCommentParts(comments)) 
    }, [comments])
    useEffect(() => {
        setPartsCount(countParts(issues, comments, issueParts, commentParts))
    }, [issueParts, commentParts])
    useEffect(() => { issues && setTotalIssueCount(issues.length) }, [issues])
    useEffect(() => {
        if (milestone && issues && comments) {
            setActualBurndown(calculateActual(milestone, issues, comments))
        }
    }, [milestone, issues, comments])
    useEffect(() => { issues && setOpenIssueCount(issues.filter(issue => issue.state == 'open').length) }, [issues])
    useEffect(() => { issues && setClosedIssueCount(issues.filter(issue => issue.state == 'closed').length) }, [issues])

    // FUNCTIONS

    async function deleteIssue(issue: Issue) {
        if (confirm('Do you really want to delete this issue from this milestone?')) {
            await IssueManager.updateIssue(issue.id, { ...issue, milestoneId: null })
            setIssues(issues.filter(other => other.id != issue.id))  
            
        }
    }    
    async function showClosedIssues(event: FormEvent) {
        event.preventDefault()
        setState('closed')
   
    }
    async function showOpenIssues(event: FormEvent) {
        event.preventDefault()
        setState('open')
    }
    
    // CONSTANTS

    const columns: Column<Issue>[] = [
        { label: '👤', content: issue => (
            <Link to={`/products/${productId}/issues/${issue.id}/comments`}>
                {issue.userId in users && members ? (
                    <ProductUserPictureWidget user={users[issue.userId]} members={members} class='icon medium round'/>
                ) : (
                    <img src={LoadIcon} className='icon medium pad animation spin'/>
                )}
            </Link>
        ) },
        { label: 'Label', class: 'left fill', content: issue => (
            <Link to={`/products/${productId}/issues/${issue.id}/comments`}>
                {issue.label}
            </Link>
        ) },
        { label: 'Assignees', class: 'nowrap', content: issue => (
            <Link to={`/products/${productId}/issues/${issue.id}/comments`}>
                {issue.assigneeIds.map((assignedId) => (
                    <Fragment key={assignedId}>
                        {assignedId in users && members ? (
                            <ProductUserPictureWidget user={users[assignedId]} members={members} class='icon medium round'/>
                        ) : (
                            <img src={LoadIcon} className='icon medium pad animation spin'/>
                        )}
                    </Fragment>
                ))}
            </Link>
        ) },
        { label: 'Comments', class: 'center', content: issue => (
            <Link to={`/products/${productId}/issues/${issue.id}/comments`}>
                {issue.id in comments ? comments[issue.id].length : '?'}
            </Link>
        ) },
        { label: 'Parts', class: 'center', content: issue => (
            <Link to={`/products/${productId}/issues/${issue.id}/comments`}>
                {issue.id in partsCount ? partsCount[issue.id] : '?'}
            </Link>
        ) },
        { label: '🛠️', class: 'center', content: issue => (
            <a onClick={() => deleteIssue(issue)}>
                <img src={DeleteIcon} className='icon medium pad'/>
            </a>
        ) }
    ]

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'List view', image: LeftIcon },
        { name: 'right', text: 'Chart view', image: RightIcon }
    ]

    // RETURN

    return (
        (issues && product && milestone) ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className= {`view product-milestone-issue sidebar ${active == 'left' ? 'hidden' : 'visible'}`}>
                        <div>
                            <div>
                                {contextUser ? (
                                    members.filter(member => member.userId == contextUser.id && member.role == 'manager').length == 1 ? (
                                        <Link to={`/products/${productId}/milestones/${milestoneId}/settings`} className='button fill gray'>
                                            Edit milestone
                                        </Link>
                                    ) : (
                                        <a className='button fill gray' style={{fontStyle: 'italic'}}>
                                            Edit milestone (requires role)
                                        </a>
                                    )
                                ) : (
                                    <a className='button fill gray' style={{fontStyle: 'italic'}}>
                                        Edit milestone (requires login)
                                    </a>
                                )}
                                <h1>
                                    {milestone.label}
                                </h1>
                                <p>
                                    <span>Start: </span>    
                                    <em>
                                        {new Date(milestone.start).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit'} )}
                                    </em>
                                    <span> / End: </span>  
                                    <em>
                                        {new Date(milestone.end).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit'} )}
                                    </em>
                                </p>
                                {contextUser ? (
                                    members.filter(member => member.userId == contextUser.id).length == 1 ? (
                                        <Link to={`/products/${productId}/issues/new/settings?milestone=${milestoneId}`} className='button fill green block-when-responsive'>
                                            New issue
                                        </Link>
                                    ) : (
                                        <a className='button fill green block-when-responsive' style={{fontStyle: 'italic'}}>
                                            New issue (requires role)
                                        </a>
                                    )
                                ) : (
                                    <a className='button fill green' style={{fontStyle: 'italic'}}>
                                        New issue (requires login)
                                    </a>
                                )}
                                <a onClick={showOpenIssues} className={`button ${state == 'open' ? 'fill' : 'stroke'} blue`}>
                                    Open issues ({openIssueCount != undefined ? openIssueCount : '?'})
                                </a>
                                <a onClick={showClosedIssues} className={`button ${state == 'closed' ? 'fill' : 'stroke'} blue`}>
                                    Closed issues ({closedIssueCount != undefined ? closedIssueCount : '?'})
                                </a>
                                <Table columns={columns} items={issues.filter(issue => issue.state == state)}/>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <BurndownChartWidget start={new Date(milestone.start)} end={new Date(milestone.end)} total={total} actual={actual}/>
                        </div>
                    </main>                            
                    <ProductFooter items={items} active={active} setActive={setActive}/>
                </>
            )
        ) : (
            <LoadingView/>
        )
    )
}