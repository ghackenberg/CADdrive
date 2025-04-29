import * as React from 'react'
import { useContext, useRef, Fragment } from 'react'
import { Redirect, useLocation, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'

import { VersionRead } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { useAsyncHistory } from '../../hooks/history'
import { useProduct } from '../../hooks/entity'
import { useMembers, useVersions } from '../../hooks/list'
import { computeColor, computeTree } from '../../functions/tree'
import { LegalFooter } from '../snippets/LegalFooter'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { ProductUserName } from '../values/ProductUserName'
import { ProductUserEmail } from '../values/ProductUserEmail'
import { ProductUserPicture } from '../values/ProductUserPicture'
import { ProductView3D } from '../widgets/ProductView3D'
import { LoadingView } from './Loading'

import LoadIcon from '/src/images/load.png'
import EditIcon from '/src/images/setting.png'
import ForkIcon from '/src/images/app.png'
import DownloadIcon from '/src/images/download.png'
import VersionIcon from '/src/images/version.png'
import PartIcon from '/src/images/part.png'

const SVG_HEIGHT = 33

const RATIO_TOTAL = 10
const RATIO_CURVE = 3

function hsl(hue: number, saturation = 50, level = 50) {
    return `hsl(${hue}, ${saturation}%, ${level}%)`
}

export const ProductVersionView = () => {

    // HISTORY

    const { push } = useAsyncHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)
    const { contextVersion, setContextVersion } = useContext(VersionContext)

    // LOCATION

    const { hash } = useLocation()

    // PARAMS

    const { productId } = useParams<{ productId: string }>()

    // ENTITIES

    const product = useProduct(productId)
    const members = useMembers(productId)
    const versions = useVersions(productId)

    // REFS

    const ref = useRef<HTMLDivElement>()

    // STATE

    const [mergeIds,setMergeIds] = React.useState<string[]>([])

    // CONSTANTS

    const color = computeColor(versions)
    const tree = computeTree(versions)

    // FUNCTIONS

    async function onClick(_event: React.MouseEvent<HTMLDivElement>, version: VersionRead) {
        // Set context model
        setContextVersion(version)
        // Switch to model view on small screens
        if (window.getComputedStyle(ref.current).display == 'none') {
            await push('#model')
        }
    }

    // CONSTANTS

    const items: ProductFooterItem[] = [
        { text: 'Tree view', image: VersionIcon, hash: '' },
        { text: 'Model view', image: PartIcon, hash: '#model' }
    ]

    // RETURN

    return (
        (product && members && versions) ? (
            (product && product.deleted) ? (
                <Redirect to='/'/>
            ) : (
                <>
                    <main className={`view product-version sidebar ${!hash ? 'hidden' : 'visible'}` }>
                        <div>
                            <div className='header'>
                                {contextUser ? (
                                    contextUser.admin || members.filter(member => member.userId == contextUser.userId && member.role != 'customer').length == 1 ? (
                                        <>
                                            <NavLink to={`/products/${productId}/versions/new/settings`} className='button green fill'>
                                                <strong>Upload</strong> version
                                            </NavLink>
                                            <NavLink to={`/products/${productId}/versions/new/editor`} className='button green stroke'>
                                                <strong>Create</strong> version (beta)
                                            </NavLink>
                                            {mergeIds.length > 1 && (
                                                <NavLink to={`/products/${productId}/versions/${mergeIds.join('+')}/merge`} className='button red stroke'>
                                                    <strong>Merge</strong> versions (under development)
                                                </NavLink>
                                            )}
                                        </>
                                    ) : (
                                        <a className='button green fill'>
                                            <strong>New</strong> version <span className='badge'>requires role</span>
                                        </a>
                                    )
                                ) : (
                                    <NavLink to='/auth/email' className='button green fill'>
                                        <strong>New</strong> version <span className='badge'>requires login</span>
                                    </NavLink>
                                )}
                            </div>
                            { versions.length == 0 ? (
                                <div className='main center'>
                                    <div>
                                        <img src={VersionIcon}/>
                                        <p>No version found.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className='main'>
                                    <div className="widget version_tree">
                                        { versions.map(i => i).reverse().map((curVers, curVersIdx) => (
                                            <Fragment key={curVers.versionId}>
                                                {curVersIdx > 0 && (
                                                    <div className="between">
                                                        <svg width={`${1.5 + Math.max(1 + tree[curVersIdx - 1].afterRest.length, tree[curVersIdx].before.length) * 1.5}em`} height={SVG_HEIGHT}>
                                                            <defs>
                                                                {tree[curVersIdx - 1].afterFirst.map((prevVersId, prevVersIdx) => {
                                                                    const versionId = tree[curVersIdx - 1].versionId
                                                                    const id = `gradient-${curVersIdx}-${prevVersIdx}`
                                                                    const colorA = hsl(color[versionId])
                                                                    const colorB = hsl(color[prevVersId])
                                                                    return tree[curVersIdx].before.includes(prevVersId) && colorA != colorB && (
                                                                        <linearGradient key={prevVersId} id={id} x1='0' y1='0' x2='0' y2='100%'>
                                                                            <stop offset='0' stopColor={colorA}/>
                                                                            <stop offset='1' stopColor={colorB}/>
                                                                        </linearGradient>
                                                                    )
                                                                })}
                                                                {tree[curVersIdx - 1].afterRest.map((prevVersId, prevVersIdx) => {
                                                                    const id = `gradient-${curVersIdx}-${tree[curVersIdx - 1].afterFirst.length + prevVersIdx}`
                                                                    const colorA = hsl(color[prevVersId])
                                                                    const colorB = hsl(color[prevVersId])
                                                                    return tree[curVersIdx].before.includes(prevVersId) && colorA != colorB && (
                                                                        <linearGradient key={prevVersId} id={id} x1='0' y1='0' x2='0' y2='100%'>
                                                                            <stop offset='0' stopColor={colorA}/>
                                                                            <stop offset='1' stopColor={colorB}/>
                                                                        </linearGradient>
                                                                    )
                                                                })}
                                                            </defs>
                                                            {tree[curVersIdx - 1].afterFirst.map((prevVersId, prevVersIdx) => {
                                                                
                                                                const x1 = 24
                                                                const x3 = 24 + tree[curVersIdx].before.indexOf(prevVersId) * 24
                                                                const x2 = (x1 + x3) / 2
                                                                
                                                                const y1 = 0
                                                                const y2 = SVG_HEIGHT / RATIO_TOTAL * RATIO_CURVE
                                                                const y3 = SVG_HEIGHT / 2
                                                                const y4 = SVG_HEIGHT / RATIO_TOTAL * (RATIO_TOTAL - RATIO_CURVE)
                                                                const y5 = SVG_HEIGHT
                                                                
                                                                const d = `M ${x1} ${y1} Q ${x1} ${y2} , ${x2} ${y3} Q ${x3} ${y4} , ${x3} ${y5}`
                                                                
                                                                const stroke = color[prevVersId] == color[tree[curVersIdx - 1].versionId] ? hsl(color[prevVersId]) : `url(#gradient-${curVersIdx}-${prevVersIdx})`

                                                                return tree[curVersIdx].before.includes(prevVersId) && (
                                                                    x1 == x2 ? (
                                                                        <g key={prevVersId}>
                                                                            <line x1={x1} y1='0' x2={x3 + 0.0001} y2={y5} className='background'/>
                                                                            <line x1={x1} y1='0' x2={x3 + 0.0001} y2={y5} className='foreground' stroke={stroke}/>
                                                                        </g>
                                                                    ) : (
                                                                        <g key={prevVersId}>
                                                                            <path d={d} className='background'/>
                                                                            <path d={d} className='foreground' stroke={stroke}/>
                                                                        </g>
                                                                    )
                                                                )

                                                            })}
                                                            {tree[curVersIdx - 1].afterRest.map((prevVersId, prevVersIdx) => {
                                                                
                                                                const x1 = 48 + prevVersIdx * 24
                                                                const x3 = 24.0001 + tree[curVersIdx].before.indexOf(prevVersId) * 24
                                                                const x2 = (x1 + x3) / 2
                                                                
                                                                const y1 = 0
                                                                const y2 = SVG_HEIGHT / RATIO_TOTAL * RATIO_CURVE
                                                                const y3 = SVG_HEIGHT / 2
                                                                const y4 = SVG_HEIGHT / RATIO_TOTAL * (RATIO_TOTAL - RATIO_CURVE)
                                                                const y5 = SVG_HEIGHT
                                                                
                                                                const d = `M ${x1} ${y1} Q ${x1} ${y2} , ${x2} ${y3} Q ${x3} ${y4} , ${x3} ${y5}`
                                                                
                                                                const stroke = hsl(color[prevVersId])
                                                                
                                                                return tree[curVersIdx].before.includes(prevVersId) && (
                                                                    x1 == x2 ? (
                                                                        <g key={prevVersId}>
                                                                            <line x1={x1} y1='0' x2={x3 + 0.0001} y2={y5} className='background'/>
                                                                            <line x1={x1} y1='0' x2={x3 + 0.0001} y2={y5} className='foreground' stroke={stroke}/>
                                                                        </g>
                                                                    ) : (
                                                                        <g key={prevVersId}>
                                                                            <path d={d} className='background'/>
                                                                            <path d={d} className='foreground' stroke={stroke}/>
                                                                        </g>
                                                                    )
                                                                )
                                                            })}
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className={`version${contextVersion && contextVersion.versionId == curVers.versionId ? ' selected' : ''}`} onClick={event => onClick(event, curVers)}>
                                                    <div className="tree" style={{width: `${1.5 + tree[curVersIdx].before.length * 1.5}em`}}>
                                                        <div>
                                                            <svg width={`${1.5 + Math.max(tree[curVersIdx].before.length) * 1.5}em`} height='100000px'>
                                                                {[...Array(tree[curVersIdx].before.length).keys()].map(number => {
                                                                    
                                                                    const hasNoSuccessors = (number == 0 && (curVersIdx == 0 || !(tree[curVersIdx - 1].afterFirst.includes(curVers.versionId) || tree[curVersIdx - 1].afterRest.includes(curVers.versionId))))
                                                                    const hasNoPredecessors = (number == 0 && tree[curVersIdx].afterFirst.length == 0)

                                                                    const x = `${1.5 + number * 1.5}em`
                                                                    const y1 = (hasNoSuccessors ? '1.5em' : '0')
                                                                    const y2 = (hasNoPredecessors ? '1.5em' : '100%')

                                                                    const stroke = hsl(color[tree[curVersIdx].before[number]])

                                                                    return <line key={number} x1={x} y1={y1} x2={x} y2={y2} className='vertical' stroke={stroke}/>

                                                                })}
                                                                <line x1='1.5em' y1='1.5em' x2='100%' y2='1.5em' className='horizontal background' stroke={hsl(color[curVers.versionId])}/>
                                                                <line x1='1.5em' y1='1.5em' x2='100%' y2='1.5em' className='horizontal foreground' stroke={hsl(color[curVers.versionId])}/>
                                                                <circle cx='1.5em' cy='1.5em' r='0.5em' className='background'/>
                                                                <circle cx='1.5em' cy='1.5em' r='0.5em' className='foreground' fill={hsl(color[curVers.versionId])}/>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="text">
                                                        <div>
                                                            <span className='actions'>
                                                                <a title='Select for Merge' className={mergeIds.includes(curVers.versionId) ? 'selected' : ''} onClick={(event:React.MouseEvent<HTMLAnchorElement>) => {
                                                                    event.preventDefault()
                                                                    if (mergeIds.includes(curVers.versionId)) {
                                                                        setMergeIds(mergeIds.filter(versId => versId != curVers.versionId))
                                                                    } else {
                                                                        setMergeIds([...mergeIds, curVers.versionId])
                                                                    }
                                                                }}>
                                                                    <img src={ForkIcon}/>
                                                                </a>
                                                                <NavLink title="Edit settings" to={`/products/${productId}/versions/${curVers.versionId}/settings`}>
                                                                    <img src={EditIcon}/>
                                                                </NavLink>
                                                                {(curVers.modelType == 'ldr' || curVers.modelType == 'ldraw-model') && (
                                                                    <NavLink title="Edit model" to={`/products/${productId}/versions/${curVers.versionId}/editor`}>
                                                                        <img src={ForkIcon}/>
                                                                    </NavLink>
                                                                )}
                                                                <a title="Download model" href={`/rest/files/${curVers.versionId}.${curVers.modelType}`}>
                                                                    <img src={DownloadIcon}/>
                                                                </a>
                                                            </span>
                                                            <span className="label" style={{backgroundColor: hsl(color[curVers.versionId])}}>
                                                                {curVers.major}.{curVers.minor}.{curVers.patch}
                                                            </span>
                                                            <ProductUserPicture userId={curVers.userId} productId={productId} class='icon medium round middle'/>
                                                            <span className="user">
                                                                <span className="name">
                                                                    <ProductUserName userId={curVers.userId} productId={productId}/>
                                                                </span>
                                                                <span className="email">
                                                                    <ProductUserEmail userId={curVers.userId} productId={productId}/>
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="description">
                                                                {curVers.description}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="model">
                                                        {curVers.imageType ? (
                                                            <em>
                                                                <img src={`/rest/files/${curVers.versionId}.${curVers.imageType}`} className="image"/>
                                                            </em>
                                                        ) : (
                                                            <span>
                                                                <img src={LoadIcon} className='icon small animation spin'/>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <LegalFooter/>
                        </div>
                        <div ref={ref}>
                            <ProductView3D productId={productId} mouse={true}/>
                        </div>
                    </main>
                    <ProductFooter items={items}/>
                </>
            )
        ) : (
            <LoadingView/>
        )
    )

}