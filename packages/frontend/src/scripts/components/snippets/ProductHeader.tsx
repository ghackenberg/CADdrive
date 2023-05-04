import * as React from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'

import { useAsyncHistory } from '../../hooks/history'
import { ProductManager } from '../../managers/product'
import { IssuesLink } from '../links/IssuesLink'
import { MembersLink } from '../links/MembersLink'
import { MilestonesLink } from '../links/MilestonesLink'
import { ProductLink } from '../links/ProductLink'
import { VersionsLink } from '../links/VersionsLink'
import { PRODUCTS_4 } from '../../pattern'

import SettingIcon from '/src/images/setting.png'

export const ProductHeader = () => {
    const { pathname } = useLocation()
    const { goBack, replace } = useAsyncHistory()

    const params = useParams<{ product: string }>()

    // INITIAL STATES

    const initialProduct = params.product == 'new' ? undefined : ProductManager.getProductFromCache(params.product)

    // STATES

    const [product, setProduct] = React.useState(initialProduct)

    // EFFECTS

    React.useEffect(() => {
        params.product == 'new' ? setProduct(undefined) : ProductManager.getProduct(params.product).then(setProduct)
    }, [params.product])

    // FUNCTIONS

    async function handleClick(event: React.UIEvent) {
        event.preventDefault()
        if (PRODUCTS_4.test(pathname)) {
            await goBack()
        }
        await replace(`/products/${params.product}/settings`)
    }

    // RETURN

    return (
        <header className='view product'>
            <div className='entity'>
                <ProductLink product={product}/>
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
                    {params.product == 'new' ? (
                        <a className="active">
                            <img src={SettingIcon} className='icon small'/>
                            <span>Settings</span>
                        </a>
                    ) : (
                        <NavLink to={`/products/${params.product}/settings`} onClick={handleClick}>
                            <img src={SettingIcon} className='icon small'/>
                            <span>Settings</span>
                        </NavLink>
                    )}
                </span>
            </div>
        </header>
    )
}