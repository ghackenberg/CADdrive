import * as React from 'react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
// Commons
import { Product } from 'productboard-common'
// Managers
import { MemberManager } from '../../managers/member'
// Images
import * as MemberIcon from '/src/images/user.png'

export const MembersLink = (props: {product: Product}) => {

    const [count, setCount] = useState<number>()

    useEffect(() => { MemberManager.findMembers(props.product.id).then(members => setCount(members.length)) }, [props])

    return (
        <span>
            <NavLink to={`/products/${props.product.id}/members`}>
                <img src={MemberIcon}/>
                Members ({count != undefined ? count : '?'})
            </NavLink>
        </span>
    )

}