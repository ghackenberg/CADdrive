import * as React from 'react'
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { Product } from 'productboard-common'

import { useAsyncHistory } from '../../hooks/history'
import { MilestoneManager } from '../../managers/milestone'
import { PRODUCTS_4 } from '../../pattern'

import MilestoneIcon from '/src/images/milestone.png'

export const MilestonesLink = (props: {product: Product}) => {

    const { pathname } = useLocation()
    const { go, goBack, replace } = useAsyncHistory()

    // INITIAL STATES

    const initialMilestones = MilestoneManager.findMilestonesFromCache(props.product.id)
    const initialCount = initialMilestones ? initialMilestones.length : undefined

    // STATES

    const [count, setCount] = useState<number>(initialCount)

    // EFFECTS
    
    useEffect(() => {
        let exec = true
        MilestoneManager.findMilestones(props.product.id).then(milestones => exec && setCount(milestones.length))
        return () => { exec = false }
    }, [props])

    // FUNCTIONS

    async function handleClick(event: React.UIEvent) {
        event.preventDefault()
        const products4 = PRODUCTS_4.exec(pathname)
        if (products4) {
            if (products4[2] == 'issues' && products4[3] != 'new' && products4[4] == 'settings') {
                await go(-2)
            } else if (products4[2] == 'milestones' && products4[3] != 'new' && products4[4] == 'settings') {
                await go(-2)
            } else {
                await goBack()
            }
        }
        await replace(`/products/${props.product.id}/milestones`)
    }

    // RETURN

    return (
        <span>
            <NavLink to={`/products/${props.product.id}/milestones`} onClick={handleClick}>
                <img src={MilestoneIcon} className='icon small'/>
                <span>
                    <span>Milestones</span>
                    <span>{count != undefined ? count : '?'}</span>
                </span>
            </NavLink>
        </span>
    )

}