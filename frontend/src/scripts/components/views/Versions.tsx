import * as React from 'react'
import { useState, useEffect, Fragment } from 'react'
import { RouteComponentProps } from 'react-router'
import { Link } from 'react-router-dom'
// Commons
import { Product, Version } from 'fhooe-audit-platform-common'
// Clients
import { ProductAPI, VersionAPI } from '../../clients/rest'
// Snippets
import { ProductHeader } from '../snippets/ProductHeader'
// Widgets
import { Column, Table } from '../widgets/Table'
import { ModelView } from '../widgets/ModelView'
// Images
import * as DeleteIcon from '/src/images/delete.png'

export const VersionsView = (props: RouteComponentProps<{product: string}>) => {

    const productId = props.match.params.product
    
    // Define entities
    const [product, setProduct] = useState<Product>()
    const [versions, setVersions] = useState<Version[]>()

    // Load entities
    useEffect(() => { ProductAPI.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { VersionAPI.findVersions(productId).then(setVersions) }, [props])

    const columns: Column<Version>[] = [
        {label: 'Preview', class: 'center', content: version => <Link to={`/products/${productId}/versions/${version.id}`}><ModelView url={`/rest/models/${version.id}`} mouse={false}/></Link>},
        {label: 'Number', class: 'center', content: version => <Link to={`/products/${productId}/versions/${version.id}`}>{version.major}.{version.minor}.{version.patch}</Link>},
        {label: 'Description', class: 'left fill', content: version => <Link to={`/products/${productId}/versions/${version.id}`}>{version.description}</Link>},
        {label: '', content: () => <img src={DeleteIcon}/>}
    ] 

    return (
        <main className="view products">
            { product && versions && (
                <Fragment>
                    <ProductHeader product={product}/>
                    <main>
                        <div>
                            <Link to={`/products/${productId}/versions/new`}>
                                New version
                            </Link>
                            <Table columns={columns} items={versions}/>
                        </div>
                    </main>
                </Fragment>
            )}
        </main>
    )

}