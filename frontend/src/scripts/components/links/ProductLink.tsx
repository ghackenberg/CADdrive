import * as React from 'react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
// Commons
import { Product } from 'fhooe-audit-platform-common'
// Links
import { ProductsLink } from './ProductsLink'

export const ProductLink = (props: {product?: Product}) => {

    return (
        <Fragment>
            <ProductsLink/>
            { props.product ? (
                <span>
                    <Link to={`/versions?product=${props.product.id}`}>{props.product.name}</Link>
                </span>
            ) : (
                <span>
                    <Link to={`/products/new`}>New product</Link>
                </span>
            )}
        </Fragment>  
    )

}