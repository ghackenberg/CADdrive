import * as React from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'

import { useAsyncHistory } from '../../hooks/history'
import { useProduct } from '../../hooks/entity'
import { IssuesLink } from '../links/IssuesLink'
import { MembersLink } from '../links/MembersLink'
import { MilestonesLink } from '../links/MilestonesLink'
import { ProductLink } from '../links/ProductLink'
import { VersionsLink } from '../links/VersionsLink'
import { PRODUCTS_4 } from '../../pattern'

import SettingIcon from '/src/images/setting.png'

export const ProductHeader = () => {

    // HISTORY

    const { go, replace } = useAsyncHistory()

    // LOCATION

    const { pathname, hash } = useLocation()

    // PARAMS

    const { productId } = useParams<{ productId: string }>()

    // ENTITIES

    const product = useProduct(productId)

    // FUNCTIONS

    async function handleClick(event: React.UIEvent) {
        event.preventDefault()
        if (PRODUCTS_4.test(pathname)) {
            await go(hash ? -2 : -1)
        } else {
            hash && await go(-1)
        }
        await replace(`/products/${productId}/settings`)
    }

    // RETURN

    return (
        <header className='view product'>
            <div className='entity'>
                <ProductLink product={product}/>
                {product && (
                    product.public ? (
                        <span className='badge public'>public</span>
                    ) : (

                        <span className='badge private'>private</span>
                    )
                )}
            </div>
            <div className='tabs'>
                {product && (
                    <>
                        <VersionsLink product={product}/>
                        <IssuesLink product={product}/>
                        <MilestonesLink product={product}/>
                        <MembersLink product={product}/>
                    </>
                )}
                <span>
                    {productId == 'new' ? (
                        <a className="active">
                            <img src={SettingIcon} className='icon small'/>
                            <span>Settings</span>
                        </a>
                    ) : (
                        <NavLink to={`/products/${productId}/settings`} onClick={handleClick}>
                            <img src={SettingIcon} className='icon small'/>
                            <span>Settings</span>
                        </NavLink>
                    )}
                </span>
            </div>
        </header>
    )
}