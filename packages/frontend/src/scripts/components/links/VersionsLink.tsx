import * as React from 'react'
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { Product } from 'productboard-common'

import { useAsyncHistory } from '../../hooks/history'
import { VersionManager } from '../../managers/version'
import { PRODUCTS_4 } from '../../pattern'

import VersionIcon from '/src/images/version.png'

export const VersionsLink = (props: {product: Product}) => {
    const { pathname } = useLocation()
    const { goBack, replace } = useAsyncHistory()

    // INITIAL STATES

    const initialVersions = VersionManager.findVersionsFromCache(props.product.id)
    const initialCount = initialVersions ? initialVersions.length : undefined

    // STATES

    const [count, setCount] = useState<number>(initialCount)

    // EFFECTS

    useEffect(() => { VersionManager.findVersions(props.product.id).then(versions => setCount(versions.length)) }, [props])

    // FUNCTIONS

    async function handleClick(event: React.UIEvent) {
        event.preventDefault()
        if (PRODUCTS_4.test(pathname)) {
            await goBack()
        }
        await replace(`/products/${props.product.id}/versions`)
    }

    // RETURN

    return (
        <span>
            <NavLink to={`/products/${props.product.id}/versions`} onClick={handleClick}>
                <img src={VersionIcon} className='icon small'/>
                <span>
                    <span>Versions</span>
                    <span>{count != undefined ? count : '?'}</span>
                </span>
            </NavLink>
        </span>
    )

}