import * as React from 'react'
import { useEffect, useContext } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { Product } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { useAsyncHistory } from '../../hooks/history'
import { useProducts } from '../../hooks/list'
import { ProductManager } from '../../managers/product'
import { ProductCount } from '../counts/Products'
import { LegalFooter } from '../snippets/LegalFooter'
import { Column, Table } from '../widgets/Table'
import { ProductImageWidget } from '../widgets/ProductImage'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { MemberCount } from '../counts/Members'
import { IssueCount } from '../counts/Issues'
import { VersionCount } from '../counts/Versions'
import { LoadingView } from './Loading'

import DeleteIcon from '/src/images/delete.png'

export const ProductView = () => {

    const { push } = useAsyncHistory()
    
    // CONTEXTS
    
    const { contextUser } = useContext(UserContext)
    const { setContextVersion } = useContext(VersionContext)

    // QUERIES

    const _public = new URLSearchParams(location.search).get('public') == 'false' ? 'false' : 'true'

    // HOOKS

    const products = useProducts(_public)

    // EFFECTS

    useEffect(() => { setContextVersion(undefined) })

    // FUNCTIONS

    async function deleteProduct(event: React.UIEvent, product: Product) {
        // TODO handle unmount!
        event.stopPropagation()
        if (confirm('Do you really want to delete this Product?')) {
            await ProductManager.deleteProduct(product.id)
        }
    }

    // CONSTANTS
    
    const columns: Column<Product>[] = [
        { label: '📷', class: 'center', content: product => (
            <ProductImageWidget productId={product.id}/>
        ) },
        { label: 'Name / Description', class: 'left fill', content: product => (
            <>
                <div>
                    <strong>{product.name}</strong>
                    {product.public ? (
                        <span className='badge public'>public</span>
                    ) : (
                        <span className='badge private'>private</span>
                    )}
                </div>
                <div>{product.description}</div>
            </>
        ) },
        { label: 'Versions', class: 'center', content: product => (
            <VersionCount productId={product.id}/>
        ) },
        { label: 'Issues', class: 'center', content: product => (
            <IssueCount productId={product.id} state='open'/>
        ) },
        { label: 'Members', class: 'center', content: product => (
            <MemberCount productId={product.id}/>
        ) },
        { label: '👤', class: 'center', content: product => (
            <ProductUserPictureWidget userId={product.userId} productId={product.id} class='icon medium round'/>
        ) },
        { label: '🛠️', content: product => (
            <a onClick={event => deleteProduct(event, product)}>
                <img src={DeleteIcon} className='icon medium pad'/>
            </a>
        ) }
    ]

    // RETURN

    return (
        products ? (
            <main className="view product">
                <div>
                    <div>
                        {contextUser ? (
                            <Link to={`/products/new/settings?public=${_public}`} className='button fill green block-when-responsive'>
                                <strong>New</strong> product
                            </Link>
                        ) : (
                            <a className='button fill green block-when-responsive' style={{fontStyle: 'italic'}}>
                                <strong>New</strong> product (requires login)
                            </a>
                        )}
                        <NavLink to='/products?public=true' replace={true} className={`button ${_public == 'true' ? 'fill' : 'stroke'} blue`}>
                            <strong>Public</strong> products (<ProductCount public='true'/>)
                        </NavLink>
                        <NavLink to='/products?public=false' replace={true} className={`button ${_public == 'false' ? 'fill' : 'stroke'} blue`}>
                            <strong>Private</strong> products (<ProductCount public='false'/>)
                        </NavLink>
                        <Table columns={columns} items={products.map(p => p).reverse()} onClick={product => push(`/products/${product.id}/versions`)}/>
                    </div>
                    <LegalFooter/>
                </div>
            </main>
        ) : (
            <LoadingView/>
        )
    )

}