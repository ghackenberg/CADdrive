import  * as React from 'react'
import { useEffect, useState, useContext } from 'react'
import { Redirect } from 'react-router'
import { NavLink } from 'react-router-dom'

import { Issue, Milestone } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { useProductMilestones, useProduct, useMembers } from '../../hooks/route'
import { IssueManager } from '../../managers/issue'
import { MilestoneManager } from '../../managers/milestone'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { ProductView3D } from '../widgets/ProductView3D'
import { Column, Table } from '../widgets/Table'
import { LoadingView } from './Loading'

import DeleteIcon from '/src/images/delete.png'
import LeftIcon from '/src/images/list.png'
import RightIcon from '/src/images/part.png'

export const ProductMilestoneView = () => {

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // HOOKS

    const { productId, product } = useProduct()
    const { members } = useMembers(productId)
    const { milestones } = useProductMilestones()

    // INITIAL STATES

    const initialOpenIssues: {[id: string]: Issue[]} = {}
    for (const milestone of milestones || []) {
        initialOpenIssues[milestone.id] = IssueManager.findIssuesFromCache(productId, milestone.id, 'open')
    }

    const initialClosedIssues: {[id: string]: Issue[]} = {}
    for (const milestone of milestones || []) {
        initialClosedIssues[milestone.id] = IssueManager.findIssuesFromCache(productId, milestone.id, 'closed')
    }
    
    // STATES

    // - Entities
    const [openIssues, setOpenIssues] = useState<{[id: string]: Issue[]}>(initialOpenIssues)
    const [closedIssues, setClosedIssues] = useState<{[id: string]: Issue[]}>(initialClosedIssues)

    // - Interactions
    const [active, setActive] = useState<string>('left')

    // EFFECTS

    // - Entities
    useEffect(() => {
        let exec = true
        if (milestones) {
            Promise.all(milestones.map(milestone => IssueManager.findIssues(productId, milestone.id,'open'))).then(issueMilestones => {
                if (exec) {
                    const newMilestones = {...openIssues}
                    for (let index = 0; index < milestones.length; index++) {
                        newMilestones[milestones[index].id] = issueMilestones[index]
                    }
                    setOpenIssues(newMilestones)
                }
            })
        }
        return () => { exec = false }
    }, [milestones])
    
    useEffect(() => {
        let exec = true
        if (milestones) {
            Promise.all(milestones.map(milestone => IssueManager.findIssues(productId, milestone.id,'closed'))).then(issueMilestones => {
                if (exec) {
                    const newMilestones = {...closedIssues}
                    for (let index = 0; index < milestones.length; index++) {
                        newMilestones[milestones[index].id] = issueMilestones[index]
                    }
                    setClosedIssues(newMilestones)
                }
            })
        }
        return () => { exec = false }
    }, [milestones])
   
    // FUNCTIONS

    async function deleteMilestone(milestone: Milestone) {
        // TODO handle unmount!
        if (confirm('Do you really want to delete this milestone?')) {
            await MilestoneManager.deleteMilestone(milestone.id) 
        }
    }

    function calculateDateProgress(milestone: Milestone) {
        const start = new Date(milestone.start).getTime()
        const end = new Date(milestone.end).getTime()
        const now = Date.now()
        if (now >= start) {
            return Math.min(100 * (now - start) / (end - start), 100)
        } else {
            return 0
        }
    }

    function calculateIssueProgress(milestone: Milestone) {
        if (openIssues[milestone.id] && closedIssues[milestone.id]) {
            return 100 * closedIssues[milestone.id].length / (closedIssues[milestone.id].length + openIssues[milestone.id].length)
        } else {
            return 0
        }
    }

    // CONSTANTS

    const columns: Column<Milestone>[] = [
        { label: '👤', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                <ProductUserPictureWidget userId={milestone.userId} productId={productId} class='icon medium round'/>
            </NavLink>
        ) },
        { label: 'Label', class: 'left fill', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                {milestone.label}
            </NavLink>
        ) },
        { label: 'Start', class: 'nowrap center', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                {new Date(milestone.start).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </NavLink>
        ) },
        { label: 'End', class: 'nowrap center', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                {new Date(milestone.end).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </NavLink>
        ) },
        { label: 'Open', class: 'center', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                {openIssues[milestone.id] ? openIssues[milestone.id].length : '?'}
            </NavLink>
        ) },
        { label: 'Closed', class: 'center', content: milestone => (
            <NavLink to={`/products/${productId}/milestones/${milestone.id}/issues`}>
                {closedIssues[milestone.id] ? closedIssues[milestone.id].length : '?'}
            </NavLink>
        ) },
        { label: 'Progress', class: 'center', content: milestone => (
            <>
                <div className='progress date'>
                    <div style={{width: `${calculateDateProgress(milestone)}%` }}/>
                </div>
                <div className='progress issue'>
                    <div style={{width: `${calculateIssueProgress(milestone)}%` }}/>
                </div>
            </>
        ) },
        { label: '🛠️', class: 'center', content: milestone => (
            <a onClick={() => deleteMilestone(milestone)}>
                <img src={DeleteIcon} className='icon medium pad'/>
            </a>
        ) }
    ]

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'List view', image: LeftIcon },
        { name: 'right', text: 'Model view', image: RightIcon }
    ]

    // RETURN

    return (
        (product && members && milestones) ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-milestone sidebar ${active == 'left' ? 'hidden' : 'visible'}`}>
                        <div>
                            <div>
                                {contextUser ? (
                                    members.filter(member => member.userId == contextUser.id && member.role == 'manager').length == 1 ? (
                                        <NavLink to={`/products/${productId}/milestones/new/settings`} className='button fill green'>
                                            New milestone
                                        </NavLink>
                                    ) : (
                                        <a className='button fill green' style={{fontStyle: 'italic'}}>
                                            New milestone (requires role)
                                        </a>
                                    )
                                ) : (
                                    <a className='button fill green' style={{fontStyle: 'italic'}}>
                                        New milestone (requires login)
                                    </a>
                                )}
                                <Table columns={columns} items={milestones}/>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <ProductView3D product={product} mouse={true}/>
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