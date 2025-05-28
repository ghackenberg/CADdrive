import  * as React from 'react'
import { useState, useEffect, useContext } from 'react'
import { Redirect, useLocation, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'

import { IssueRead } from 'productboard-common'

import { CommentClient } from '../../clients/rest/comment'
import { UserContext } from '../../contexts/User'
import { useMilestone, useProduct } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useMembers, useIssues } from '../../hooks/list'
import { useIssuesComments } from '../../hooks/map'
import { calculateActual } from '../../functions/burndown'
import { formatDateHourMinute } from '../../functions/time'
import { PartCount } from '../counts/Parts'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { BurndownChartWidget } from '../widgets/BurndownChart'
import { ProductUserName } from '../values/ProductUserName'
import { ProductUserPicture } from '../values/ProductUserPicture'
import { Column, Table } from '../widgets/Table'
import { LoadingView } from './Loading'

import IssueIcon from '/src/images/issue.png'
import CloseIcon from '/src/images/close.png'
import LeftIcon from '/src/images/list.png'
import ReopenIcon from '/src/images/reopen.png'
import RightIcon from '/src/images/chart.png'

export const ProductMilestoneIssueView = () => {

    // HISTORY
    
    const { push } = useAsyncHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // LOCATION

    const { hash, search } = useLocation()

    // PARAMS

    const { productId, milestoneId } = useParams<{ productId: string, milestoneId: string }>()

    // QUERY

    const state = new URLSearchParams(search).get('state') || 'open'

    // ENTITIES

    const product = useProduct(productId)
    const members = useMembers(productId)
    const milestone = useMilestone(productId, milestoneId)
    const issues = useIssues(productId, milestoneId)
    const comments = useIssuesComments(productId, milestoneId)

    // INITIAL STATES

    const initialTotal = issues && issues.length
    const initialActual = milestone && issues && comments && calculateActual(milestone.start, milestone.end, issues, comments)
    
    // STATES

    // - Computations
    const [total, setTotalIssueCount] = useState(initialTotal)
    const [actual, setActualBurndown] = useState(initialActual)

    // EFFECTS

    useEffect(() => {
        function updateActualBurndown() {
            setActualBurndown(milestone && issues && comments && calculateActual(milestone.start, milestone.end, issues, comments))
        }
        let interval: NodeJS.Timeout
        const timeout = setTimeout(() => {
            interval = setInterval(updateActualBurndown, 1000)
            updateActualBurndown()
        }, 1000 - Date.now() % 1000)
        return () => {
            clearTimeout(timeout)
            interval && clearInterval(interval)
        }
    })

    useEffect(() => {
        if (issues) {
            setTotalIssueCount(issues.length)
        } else {
            setTotalIssueCount(undefined)
        }
    }, [issues])

    useEffect(() => {
        if (milestone && issues && comments) {
            setActualBurndown(calculateActual(milestone.start, milestone.end, issues, comments))
        } else {
            setActualBurndown(undefined)
        }
    }, [milestone, issues, comments])

    // FUNCTIONS

    async function closeIssue(event: React.MouseEvent<HTMLAnchorElement>, issue: IssueRead) {
        event.stopPropagation()
        if (confirm('Do you really want to close this issue without comment?')) {
            await CommentClient.addComment(productId, issue.issueId, { action: 'close', text: '' })
        }
    }

    async function reopenIssue(event: React.MouseEvent<HTMLAnchorElement>, issue: IssueRead) {
        event.stopPropagation()
        if (confirm('Do you really want to re-open this issue without comment?')) {
            await CommentClient.addComment(productId, issue.issueId, { action: 'reopen', text: '' })
        }
    }

    async function handleClickIssue(issue: IssueRead) {
        await push(`/products/${productId}/milestones/${milestoneId}/issues/${issue.issueId}/comments`)
    }
    
    // CONSTANTS

    const columns: Column<IssueRead>[] = [
        { label: '🧑', content: issue => (
            <ProductUserPicture userId={issue.userId} productId={productId} class='icon small round'/>
        ) },
        { label: '#', class: 'center nowrap', content: issue => (
            issue.number
        ) },
        { label: 'Label', class: 'left fill', content: issue => (
            issue.label
        ) },
        { label: 'Assignees', class: 'left nowrap assignees', content: issue => (
            issue.assignedUserIds.length > 0 ? (
                issue.assignedUserIds.map((assignedUserId) => (
                    <ProductUserPicture key={assignedUserId} userId={assignedUserId} productId={productId} class='icon small round'/>
                ))
            ) : (
                <span className='badge stroke italic'>not assigned</span>
            )
        ) },
        { label: 'Comments', class: 'center nowrap', content: issue => (
            <span className='badge'>
                {issue.commentCount}
            </span>
        ) },
        { label: 'Parts', class: 'center nowrap', content: issue => (
            <span className='badge'>
                <PartCount productId={productId} issueId={issue.issueId}/>
            </span>
        ) },
        { label: '🛠️', class: 'center', content: issue => (
            issue.state == 'open' ? (
                <a onClick={event => closeIssue(event, issue)} title='Close issue'>
                    <img src={CloseIcon} className='icon medium pad'/>
                </a>
            ) : (
                <a onClick={event => reopenIssue(event, issue)} title='Re-open issue'>
                    <img src={ReopenIcon} className='icon medium pad'/>
                </a>
            )
        ) }
    ]

    const items: ProductFooterItem[] = [
        { text: 'List view', image: LeftIcon, hash: '' },
        { text: 'Chart view', image: RightIcon, hash: '#model' }
    ]

    // RETURN

    return (
        (issues && product && milestone) ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className= {`view product-milestone-issue sidebar ${!hash ? 'hidden' : 'visible'}`}>
                        <div>
                            <div className='header'>
                                {contextUser ? (
                                    contextUser.admin || members.filter(member => member.userId == contextUser.userId && member.role == 'manager').length == 1 ? (
                                        <NavLink to={`/products/${productId}/milestones/${milestoneId}/settings`} className='button fill gray right'>
                                            <strong>Edit</strong> milestone
                                        </NavLink>
                                    ) : (
                                        <a className='button fill gray right'>
                                            <strong>Edit</strong> milestone <span className='badge'>requires role</span>
                                        </a>
                                    )
                                ) : (
                                    <NavLink to='/auth/email' className='button fill gray right'>
                                        <strong>Edit</strong> milestone <span className='badge'>requires login</span>
                                    </NavLink>
                                )}
                                <h1>
                                    {milestone.label}
                                </h1>
                                <p>
                                    <ProductUserPicture productId={productId} userId={milestone.userId} class='icon small round'/>
                                    <span> </span>
                                    <ProductUserName productId={productId} userId={milestone.userId}/>
                                    <span> created this milestone on </span>
                                    <span className='date'>{formatDateHourMinute(new Date(milestone.created))}</span>
                                </p>
                                <p style={{color: 'gray'}}>
                                    <span>This milestone starts on</span>    
                                    <span className='badge stroke'>
                                        {formatDateHourMinute(new Date(milestone.start))}
                                    </span>
                                    <span style={{marginLeft: '0.5em'}}>and ends on</span>  
                                    <span className='badge stroke'>
                                        {formatDateHourMinute(new Date(milestone.end))}
                                    </span>
                                </p>
                                {contextUser ? (
                                    contextUser.admin || members.filter(member => member.userId == contextUser.userId).length == 1 ? (
                                        <NavLink to={`/products/${productId}/milestones/${milestoneId}/issues/new/settings`} className='button fill green block-when-responsive'>
                                            <strong>New</strong> issue
                                        </NavLink>
                                    ) : (
                                        <a className='button fill green block-when-responsive'>
                                            <strong>New</strong> issue <span className='badge'>requires role</span>
                                        </a>
                                    )
                                ) : (
                                    <NavLink to='/auth/email' className='button fill green block-when-responsive'>
                                        <strong>New</strong> issue <span className='badge'>requires login</span>
                                    </NavLink>
                                )}
                                <NavLink to={`/products/${productId}/milestones/${milestoneId}/issues?state=open`} replace={true} className={`button ${state == 'open' ? 'fill' : 'stroke'} blue`}>
                                    <strong>Open</strong> issues <span className='badge'>{ milestone.openIssueCount }</span>
                                </NavLink>
                                <NavLink to={`/products/${productId}/milestones/${milestoneId}/issues?state=closed`} replace={true} className={`button ${state == 'closed' ? 'fill' : 'stroke'} blue`}>
                                    <strong>Closed</strong> issues <span className='badge'>{ milestone.closedIssueCount }</span>
                                </NavLink>
                            </div>
                            { issues.filter(issue => issue.state == state).length == 0 ? (
                                <div className='main center'>
                                    <div>
                                        <img src={IssueIcon}/>
                                        <p>No <strong>{state}</strong> issue found.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className='main'>
                                    <Table columns={columns} items={issues.filter(issue => issue.state == state)} onClick={handleClickIssue}/>
                                </div>
                            ) }
                            <LegalFooter/>
                        </div>
                        <div>
                            <BurndownChartWidget start={milestone.start} end={milestone.end} total={total} actual={actual}/>
                        </div>
                    </main>                            
                    <ProductFooter items={items}/>
                </>
            )
        ) : (
            <LoadingView/>
        )
    )
}