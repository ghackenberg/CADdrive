import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { Product } from 'productboard-common'

import { useAsyncHistory } from '../../hooks/history'
import { useMilestones } from '../../hooks/list'
import { PRODUCTS_4 } from '../../pattern'

import MilestoneIcon from '/src/images/milestone.png'

export const MilestonesLink = (props: {product: Product}) => {

    const { pathname } = useLocation()
    const { go, goBack, replace } = useAsyncHistory()

    // HOOKS

    const milestones = useMilestones(props.product.productId)

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
        await replace(`/products/${props.product.productId}/milestones`)
    }

    // RETURN

    return (
        <span>
            <NavLink to={`/products/${props.product.productId}/milestones`} onClick={handleClick}>
                <img src={MilestoneIcon} className='icon small'/>
                <span className='label'>Milestones</span>
                <span className='badge'>{milestones ? milestones.length : '?'}</span>
            </NavLink>
        </span>
    )

}