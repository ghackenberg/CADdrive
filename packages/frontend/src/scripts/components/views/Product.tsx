import * as React from 'react'
import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'

import { Member, Product, User } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { IssueManager } from '../../managers/issue'
import { MemberManager } from '../../managers/member'
import { ProductManager } from '../../managers/product'
import { VersionManager } from '../../managers/version'
import { UserManager } from '../../managers/user'
import { ProductsLink } from '../links/ProductsLink'
import { Column, Table } from '../widgets/Table'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'

import * as DeleteIcon from '/src/images/delete.png'
import * as LoadIcon from '/src/images/load.png'
import * as EmptyIcon from '/src/images/empty.png'

export const ProductView = () => {
    
    // CONTEXTS
    
    const { contextUser } = useContext(UserContext)
    const { setContextVersion } = useContext(VersionContext)

    // INITIAL STATES
    
    const initialProducts = ProductManager.findProductsFromCache()
    const initialUsers: {[id: string]: User} = {}
    for (const product of initialProducts || []) {
        const user = UserManager.getUserFromCache(product.userId)
        if (user) {
            initialUsers[product.id] = user
        }
    }
    const initialVersions: {[id: string]: number} = {}
    for (const product of initialProducts || []) {
        const versions = VersionManager.getVersionCount(product.id)
        if (versions) {
            initialVersions[product.id] = versions
        }
    }
    const initialLatestVersions: {[id: string]: string} = {}
    for (const product of initialProducts || []) {
        const versions = VersionManager.findVersionsFromCache(product.id)
        if (versions && versions.length > 0) {
            initialLatestVersions[product.id] = versions[versions.length - 1].id
        }
    }
    const initialIssues: {[id: string]: number} = {}
    for (const product of initialProducts || []) {
        const issues = IssueManager.getIssueCount(product.id, undefined, undefined)
        if (issues) {
            initialIssues[product.id] = issues
        }
    }
    const initialMembers: {[id: string]: Member[]} = {}
    for (const product of initialProducts || []) {
        const members = MemberManager.findMembersFromCache(product.id) 
        if (members) {
            initialMembers[product.id] = members
        }
    }
    
    // STATES

    // - Entities
    const [products, setProducts] = useState<Product[]>(initialProducts)
    const [users, setUsers] = useState<{[id: string]: User}>(initialUsers)
    const [versions, setVersions] = useState<{[id: string]: number}>(initialVersions)
    const [latestVersions, setLatestVersions] = useState<{[id: string]: string}>(initialLatestVersions)
    const [issues, setIssues] = useState<{[id: string]: number}>(initialIssues)
    const [members, setMembers] = useState<{[id: string]: Member[]}>(initialMembers)

    // EFFECTS

    // - Entities
    useEffect(() => { setContextVersion(undefined) }, [])
    useEffect(() => { ProductManager.findProducts().then(setProducts) }, [])
    useEffect(() => {
        if (products) {
            Promise.all(products.map(product => UserManager.getUser(product.userId))).then(productUsers => {
                const newUsers = {...users}
                for (let index = 0; index < products.length; index++) {
                    newUsers[products[index].id] = productUsers[index]
                }
                setUsers(newUsers)
            })
        }
    }, [products])
    useEffect(() => {
        if (products) {
            Promise.all(products.map(product => VersionManager.findVersions(product.id))).then(productVersions => {
                const newVersions = {...versions}
                for (let index = 0; index < products.length; index++) {
                    newVersions[products[index].id] = productVersions[index].length
                }
                setVersions(newVersions)
            })
        }
    }, [products])
    useEffect(() => {
        if (products) {
            Promise.all(products.map(product => VersionManager.findVersions(product.id))).then(productVersions => {
                const newVersions = {...latestVersions}
                for (let index = 0; index < products.length; index++) {
                    if (productVersions[index].length > 0) {
                        newVersions[products[index].id] = productVersions[index][productVersions[index].length - 1].id
                    } else {
                        newVersions[products[index].id] = null
                    }
                }
                setLatestVersions(newVersions)
            })
        }
    }, [products])
    useEffect(() => {
        if (products) {
            Promise.all(products.map(product => IssueManager.findIssues(product.id))).then(productIssues => {
                const newIssues = {...issues}
                for (let index = 0; index < products.length; index++) {
                    newIssues[products[index].id] = productIssues[index].length
                }
                setIssues(newIssues)
            })
        }
    }, [products])
    useEffect(() => {
        if (products) {
            Promise.all(products.map(product => MemberManager.findMembers(product.id))).then(productMembers => {
                const newMembers = {...members}
                for (let index = 0; index < products.length; index++) {
                    newMembers[products[index].id] = productMembers[index]
                }
                setMembers(newMembers)
            })
        }
    }, [products])

    // FUNCTIONS

    async function deleteProduct(product: Product) {
        if (confirm('Do you really want to delete this Product?')) {
            await ProductManager.deleteProduct(product.id)
            setProducts(products.filter(other => other.id != product.id))
        }
    }

    // CONSTANTS
    
    const columns: Column<Product>[] = [
        { label: '📷', class: 'center', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.id in latestVersions ? (
                    <>
                        {latestVersions[product.id] ? (
                            <div style={ { backgroundImage: `url("/rest/files/${latestVersions[product.id]}.png")` } } className="model"/>
                        ) : (
                            <div className="model" >
                                <img src={EmptyIcon} className='icon medium position center'/>
                            </div>
                        )}
                    </>
                ) : (
                    <img src={LoadIcon} className='icon small animation spin'/>
                )}
            </Link>
        ) },
        { label: 'Name', class: 'left fill', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.name}
            </Link>
        ) },
        { label: 'Description', class: 'left fill', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.description}
            </Link>
        ) },
        { label: 'Versions', class: 'center', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.id in versions ? versions[product.id] : '?'}
            </Link>
        ) },
        { label: 'Issues', class: 'center', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.id in issues ? issues[product.id] : '?'}
            </Link>
        ) },
        { label: 'Members', class: 'center', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {product.id in members ? members[product.id].length : '?'}
            </Link>
        ) },
        { label: '👤', class: 'center', content: product => (
            <Link to={`/products/${product.id}/versions`}>
                {users[product.id] && members[product.id] ? (
                    <ProductUserPictureWidget user={users[product.id]} members={members[product.id]} class='icon medium round'/>
                ) : (
                    <img src={LoadIcon} className='icon small animation spin'/>
                )}
            </Link>
        ) },
        { label: '🛠️', content: product => (
            <a onClick={() => deleteProduct(product)}>
                <img src={DeleteIcon} className='icon medium pad'/>
            </a>
        ) }
    ]

    // RETURN

    return (
        <main className="view product">
            <header>
                <div>
                    <ProductsLink/>
                </div>
            </header>
            <main>
                <div>
                    {contextUser ? (
                        contextUser.permissions.includes('create:products') ? (
                            <Link to='/products/new/settings' className='button fill green'>
                                New product
                            </Link>
                        ) : (
                            <a className='button fill green'>
                                New product (required permission)
                            </a>
                        )
                    ) : (
                        <a className='button fill green' style={{fontStyle: 'italic'}}>
                            New product (requires login)
                        </a>
                    )}
                    {products && (
                        <Table columns={columns} items={products.map(p => p).reverse()}/>
                    )}
                </div>
            </main>
        </main>
    )

}