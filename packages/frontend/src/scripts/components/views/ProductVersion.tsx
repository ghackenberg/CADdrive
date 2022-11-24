import * as React from 'react'
import { useState, useEffect, Fragment } from 'react'
import { Redirect, RouteComponentProps } from 'react-router'
import { Link } from 'react-router-dom'

import { Member, Product, User, Version } from 'productboard-common'

import { MemberManager } from '../../managers/member'
import { ProductManager } from '../../managers/product'
import { UserManager } from '../../managers/user'
import { VersionManager } from '../../managers/version'
import { ProductFooter } from '../snippets/ProductFooter'
import { ProductHeader } from '../snippets/ProductHeader'
import { ProductUserNameWidget } from '../widgets/ProductUserName'
import { ProductUserPictureWidget } from '../widgets/ProductUserPicture'
import { ProductView3D } from '../widgets/ProductView3D'

import * as LoadIcon from '/src/images/load.png'
import * as EmptyIcon from '/src/images/empty.png'

export const ProductVersionView = (props: RouteComponentProps<{product: string}>) => {

    // PARAMS

    const productId = props.match.params.product

    // INITIAL STATES
    const initialProduct = productId == 'new' ? undefined : ProductManager.getProductFromCache(productId)
    const initialMembers = productId == 'new' ? undefined : MemberManager.findMembersFromCache(productId)
    const initialVersions = productId == 'new' ? undefined : VersionManager.findVersionsFromCache(productId)
    const initialUsers : {[id: string]: User} = {}
    for (const version of initialVersions || []) {
        const user = UserManager.getUserFromCache(version.userId)
        if (user) {
            initialUsers[version.id] = user
        }
    }

    // TODO states vom Tree berechnen in externer Funktion, dann im useeffekt und initial aufrufen

    // STATES

    // - Entities
    const [product, setProduct] = useState<Product>(initialProduct)
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [versions, setVersions] = useState<Version[]>(initialVersions)
    const [users, setUsers] = useState<{[id: string]: User}>(initialUsers)
    // - Computations
    const [children, setChildren] = useState<{[id: string]: Version[]}>({})
    const [childrenMin, setChildrenMin] = useState<{[id: string]: number}>({})
    const [childrenMax, setChildrenMax] = useState<{[id: string]: number}>({})
    const [siblings, setSiblings] = useState<{[id: string]: Version[]}>({})
    const [indents, setIndents] = useState<{[id: string]: number}>({})
    const [indent, setIndent] = useState<number>(0)
    // - Interactions
    const [version, setVersion] = useState<Version>()
    const [sidebar, setSidebar] = useState<boolean>(false)

    // EFFECTS

    // - Entities
    useEffect(() => { ProductManager.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { MemberManager.findMembers(productId).then(setMembers) }, [props])
    useEffect(() => { VersionManager.findVersions(productId).then(setVersions) }, [props])
    useEffect(() => { versions && versions.length > 0 && setVersion(versions[versions.length - 1])}, [versions])
    useEffect(() => {
        if (versions) {
            Promise.all(versions.map(version => UserManager.getUser(version.userId))).then(versionUsers => {
                const newUsers: {[id: string]: User} = {}
                for (let index = 0; index < versions.length; index++) {
                    newUsers[versions[index].id] = versionUsers[index]
                }
                setUsers(newUsers)
            })
        }
    }, [versions])

    // - Computations
    useEffect(() => {
        if (versions && versions.length > 0) {
            // Calculate children
            const children: {[id: string]: Version[]} = {}
    
            for (const version of versions) {
                children[version.id] = []
                for (const baseVersionId of version.baseVersionIds) {
                    children[baseVersionId].push(version)
                }
            }

            setChildren(children)

            // Calculate siblings

            const siblings: {[id: string]: Version[]} = {}

            for (const version of versions) {
                siblings[version.id] = []
            }

            for (let outerIndex = versions.length - 1; outerIndex >= 0; outerIndex--) {
                const outerVersion = versions[outerIndex]
                const baseVersionIds = [...outerVersion.baseVersionIds]
                for (let innerIndex = outerIndex - 1; innerIndex >= 0; innerIndex--) {
                    const innerVersion = versions[innerIndex]
                    const baseIndex = baseVersionIds.indexOf(innerVersion.id)
                    if (baseIndex != -1) {
                        baseVersionIds.splice(baseIndex, 1)
                    }
                    if (baseVersionIds.length > 0) {
                        siblings[innerVersion.id].push(outerVersion)
                    }
                }
            }

            setSiblings(siblings)

            // Calculate indents
            const indents: {[id: string]: number} = {}

            let next = 0

            for (const version of versions) {
                if (!(version.id in indents)) {
                    const indent = version.baseVersionIds.length > 0 ? indents[version.baseVersionIds[0]] : next
                
                    indents[version.id] = indent
                }

                for (let index = 0; index < children[version.id].length; index++) {
                    const child = children[version.id][index]
                    if (!(child.id in indents)) {
                        if (index == 0) {
                            indents[child.id] = indents[version.id]
                        } else {
                            indents[child.id] = ++next
                        }
                    }
                }
            }

            setIndents(indents)
            setIndent(next + 1)

            // Calculate min/max
            const childrenMin: {[id: string]: number} = {}
            const childrenMax: {[id: string]: number} = {}

            for (const version of versions) {
                let min = indents[version.id]
                let max = 0

                for (const child of children[version.id]) {
                    min = Math.min(min, indents[child.id])
                    max = Math.max(max, indents[child.id])
                }

                childrenMin[version.id] = min
                childrenMax[version.id] = max
            }

            setChildrenMin(childrenMin)
            setChildrenMax(childrenMax)
        }
    }, [versions])

    // RETURN

    return (
        <main className="view extended versions">
            { product && versions && (
                <Fragment>
                    { product && product.deleted ? (
                        <Redirect to='/'/>
                    ) : (
                        <Fragment>
                            <ProductHeader product={product}/>
                            <main className={`sidebar ${sidebar ? 'visible' : 'hidden'}` }>
                                <div>
                                    <Link to={`/products/${productId}/versions/new/settings`} className='button green fill'>
                                        New version
                                    </Link>
                                    <div className="widget version_tree">
                                        {versions.map(version => version).reverse().map((vers, index) => (
                                            <Fragment key={vers.id}>
                                                {index > 0 && (
                                                    <div className="between">
                                                        <div className="tree" style={{width: `${indent * 1.5 + 1.5}em`}}>
                                                            {vers.id in siblings && siblings[vers.id].map(sibling => (
                                                                <span key={sibling.id} className='line vertical sibling' style={{top: 0, left: `calc(${1.5 + indents[sibling.id] * 1.5}em - 1px)`, bottom: 0}}/>
                                                            ))}
                                                            {vers.id in children && children[vers.id].map(child => (
                                                                <span className='line vertical child' key={child.id} style={{top: 0, left: `calc(${1.5 + indents[child.id] * 1.5}em - 1px)`, bottom: 0}}/>
                                                            ))}
                                                        </div>
                                                        <div className="text" style={{color: 'orange'}}>
                                                            {/* empty */}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`version${version == vers ? ' selected' : ''}`} onClick={() => setVersion(vers)}>
                                                    <div className="tree" style={{width: `${indent * 1.5 + 1.5}em`}}>
                                                        {vers.id in siblings && siblings[vers.id].map(sibling => (
                                                            <span key={sibling.id} className='line vertical sibling' style={{top: 0, left: `calc(${1.5 + indents[sibling.id] * 1.5}em - 1px)`, bottom: 0}}/>
                                                        ))}
                                                        {vers.id in childrenMin && vers.id in childrenMax && (
                                                            <span className='line horizontal parent' style={{top: 'calc(2.2em - 3px)', left: `calc(${1.5 + childrenMin[vers.id] * 1.5}em + 1px)`, width: `calc(${(childrenMax[vers.id] - childrenMin[vers.id]) * 1.5}em - 2px)`}}/>
                                                        )}
                                                        {vers.id in children && children[vers.id].map(child => (
                                                            <span className='line vertical child' key={child.id} style={{top: 0, left: `calc(${1.5 + indents[child.id] * 1.5}em - 1px)`, height: 'calc(2.2em + 1px)'}}/>
                                                        ))}
                                                        {vers.id in indents && (
                                                            <span className='line vertical parent' style={{top: 'calc(2em - 1px)', left: `calc(${1.5 + indents[vers.id] * 1.5}em - 1px)`, bottom: 0}}/>
                                                        )}
                                                        {vers.id in indents && (
                                                            <span className='dot parent' style={{top: '1.45em', left: `${0.75 + indents[vers.id] * 1.5}em`}}/>
                                                        )}
                                                    </div>
                                                    <div className="text">
                                                        <div>
                                                            <span className="label">{vers.major}.{vers.minor}.{vers.patch}</span>
                                                            <a> { version && version.userId in users && members ? <ProductUserPictureWidget user={users[vers.id]} members={members} class='big'/> : <a> <img src={LoadIcon} className='big load' /> </a> } </a>
                                                            <span className="user">
                                                                <span className="name"> {vers.id in users && members ? <ProductUserNameWidget user={users[vers.id]} members={members}/> : '?'}  </span>
                                                                {/* Email temporär ausgeblendet */}
                                                                {/* <span className="email"> {vers.id in users && members ? <ProductUserEmailWidget user={users[vers.id]} members={members}/> : '?'}  </span> */}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="description">{vers.description}</span>
                                                        </div>
                                                    </div>
                                                    <div style={ { backgroundImage: `url("/rest/files/${vers.id}.png")` } } className="model">
                                                    </div>
                                                </div>
                                            </Fragment>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className='widget product_view'>
                                        {!versions || (versions.length > 0 && !version) && (
                                            <img className='load' src={LoadIcon}/>
                                        )}
                                        {versions && versions.length == 0 && (
                                            <img className='empty' src={EmptyIcon}/>
                                        )}
                                        <ProductView3D product={product} version={version} mouse={true} vr= {true} change = {setVersion} />
                                    </div>
                                </div>
                            </main>
                            <ProductFooter sidebar={sidebar} setSidebar={setSidebar} item1={{'text':'Versions','image':'version'}} item2={{'text':'3D-Modell','image':'part'}}></ProductFooter>
                        </Fragment>
                    )}
                </Fragment>
            )}
        </main>
    )

}