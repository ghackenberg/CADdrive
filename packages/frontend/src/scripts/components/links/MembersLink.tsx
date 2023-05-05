import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { Product } from 'productboard-common'

import { useAsyncHistory } from '../../hooks/history'
import { useMembers } from '../../hooks/route'
import { PRODUCTS_4 } from '../../pattern'

import MemberIcon from '/src/images/user.png'

export const MembersLink = (props: {product: Product}) => {

    const { pathname } = useLocation()
    const { go, goBack, replace } = useAsyncHistory()

    // HOOKS

    const { members } = useMembers(props.product.id)

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
        await replace(`/products/${props.product.id}/members`)
    }

    // RETURN

    return (
        <span>
            <NavLink to={`/products/${props.product.id}/members`} onClick={handleClick}>
                <img src={MemberIcon} className='icon small'/>
                <span>
                    <span>Members</span>
                    <span>{members ? members.length : '?'}</span>
                </span>
            </NavLink>
        </span>
    )

}