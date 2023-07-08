import  * as React from 'react'
import { useContext, useState, useEffect, FormEvent } from 'react'
import { Redirect, useParams } from 'react-router'

import { UserContext } from '../../contexts/User'
import { MilestoneClient } from '../../clients/rest/milestone'
import { calculateActual } from '../../functions/burndown'
import { useMilestone, useProduct } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useIssues, useMembers } from '../../hooks/list'
import { useIssuesComments } from '../../hooks/map'
import { ButtonInput } from '../inputs/ButtonInput'
import { DateInput } from '../inputs/DateInput'
import { TextInput } from '../inputs/TextInput'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { BurndownChartWidget } from '../widgets/BurndownChart'
import { LoadingView } from './Loading'

import LeftIcon from '/src/images/setting.png'
import RightIcon from '/src/images/chart.png'

export const ProductMilestoneSettingView = () => {
    
    const { goBack, replace } = useAsyncHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)

    // PARAMS

    const { productId, milestoneId } = useParams<{ productId: string, milestoneId: string }>()

    // HOOKS

    const product = useProduct(productId)
    const members = useMembers(productId)
    const milestone = useMilestone(productId, milestoneId)
    const issues = useIssues(productId, milestoneId)
    const comments = useIssuesComments(productId, milestoneId)

    // INITIAL STATES

    const initialLabel = milestone ? milestone.label : ''
    const initialStart = milestone ? new Date(milestone.start) : new Date(new Date().setHours(0,0,0,0))
    const initialEnd = milestone ? new Date(milestone.end) : new Date(new Date().setHours(0,0,0,0) + 1000 * 60 * 60 * 24 * 14)

    const initialTotal = issues && issues.length
    const initialActual = milestone && issues && comments && calculateActual(milestone.start, milestone.end, issues, comments)

    // STATES

    // - Values
    
    const [label, setLabel] = useState<string>(initialLabel)
    const [start, setStart] = useState<Date>(initialStart)
    const [end, setEnd] = useState<Date>(initialEnd)

    // - Computations

    const [total, setTotalIssueCount] = useState(initialTotal) 
    const [actual, setActualBurndown] = useState(initialActual)

    // - Interactions
    
    const [active, setActive] = useState<string>('left')

    // EFFECTS
    
    // - Values

    useEffect(() => { milestone && setLabel(milestone.label) }, [milestone])
    useEffect(() => { milestone && setStart(new Date(milestone.start)) }, [milestone])
    useEffect(() => { milestone && setEnd(new Date(milestone.end)) }, [milestone])

    // - Computations
    
    useEffect(() => {
        if (issues) {
            setTotalIssueCount(issues.length)
        } else {
            setTotalIssueCount(undefined)
        }
    }, [issues])

    useEffect(() => {
        if (milestone && issues && comments) {
            setActualBurndown(calculateActual(start.getTime(), end.getTime(), issues, comments))
        } else {
            setActualBurndown(undefined)
        }
    }, [start, end, issues, comments])

    // FUNCTIONS

    async function submitMilestone(event: FormEvent){
        // TODO handle unmount!
        event.preventDefault()
        if(milestoneId == 'new') {
            const milestone = await MilestoneClient.addMilestone(productId, { label, start: start.getTime(), end: end.getTime() })
            await replace(`/products/${productId}/milestones/${milestone.milestoneId}/issues`)
        } else {
            await MilestoneClient.updateMilestone(productId, milestoneId, { label, start: start.getTime(), end: end.getTime() })
            await goBack()
        }
    }

    // CONSTANTS

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'Form view', image: LeftIcon },
        { name: 'right', text: 'Chart view', image: RightIcon }
    ]

    // RETURN

    return (
        product ? (
            product.deleted ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-milestone-setting sidebar ${active == 'left' ? 'hidden' : 'visible'}`}>
                        <div>
                            <div className='main'>
                                <h1>
                                    {milestoneId == 'new' ? (
                                        'New milestone'
                                    ) : (
                                        'Milestone settings'
                                    )}
                                </h1>
                                <form onSubmit={submitMilestone} onReset={goBack}>
                                    <TextInput label='Label' placeholder='Type label' value={label} change={setLabel} required/>
                                    <DateInput label='Start' placeholder='YYYY-MM-DD' value={start} change={setStart} required/>
                                    <DateInput label='End' placeholder='YYYY-MM-DD' value={end} change={setEnd} required/>
                                    {contextUser ? (
                                        (productId == 'new' || members.filter(member => member.userId == contextUser.userId && member.role == 'manager').length == 1) ? (
                                            <ButtonInput value='Save'/>
                                        ) : (
                                            <ButtonInput value='Save' badge='requires role' disabled={true}/>
                                        )
                                    ) : (
                                        <ButtonInput value='Save' badge='requires login' disabled={true}/>
                                    )}
                                </form>
                            </div>
                            <LegalFooter/>
                        </div>
                        <div>
                            <BurndownChartWidget start={start} end={end} total={total} actual={actual}/>
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