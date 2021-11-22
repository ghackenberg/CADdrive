import * as React from 'react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
// Commons
import { Product } from 'fhooe-audit-platform-common'
// Links
import { ProductLink } from './ProductLink'

export const IssuesLink = (props: {product: Product}) => {
    return (
        <Fragment>
            <ProductLink product={props.product}/>
            <span>
                <Link to={`/products/${props.product.id}/issues`}>Issues</Link>
            </span>
        </Fragment>  
    )
}