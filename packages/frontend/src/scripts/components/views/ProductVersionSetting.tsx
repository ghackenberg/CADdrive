import * as React from 'react'
import { useState, useEffect, useContext, FormEvent, ChangeEvent, Fragment } from 'react'
import { Redirect, useHistory } from 'react-router'
import { RouteComponentProps } from 'react-router-dom'

import { Group, LineSegments, LoadingManager, Mesh, Object3D } from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader'

import { Member, Product, Version } from 'productboard-common'

import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { render } from '../../functions/render'
import { MemberManager } from '../../managers/member'
import { ProductManager } from '../../managers/product'
import { VersionManager } from '../../managers/version'
import { FileInput } from '../inputs/FileInput'
import { GenericInput } from '../inputs/GenericInput'
import { NumberInput } from '../inputs/NumberInput'
import { SubmitInput } from '../inputs/SubmitInput'
import { TextareaInput } from '../inputs/TextareaInput'
import { ProductFooter, ProductFooterItem } from '../snippets/ProductFooter'
import { ProductHeader } from '../snippets/ProductHeader'
import { ModelView3D } from '../widgets/ModelView3D'
import { Column, Table } from '../widgets/Table'
import { VersionView3D } from '../widgets/VersionView3D'

import * as EmptyIcon from '/src/images/empty.png'
import * as LoadIcon from '/src/images/load.png'
import * as LeftIcon from '/src/images/setting.png'
import * as RightIcon from '/src/images/part.png'

const PREVIEW_WIDTH = 1000
const PREVIEW_HEIGHT = 1000

const manager = new LoadingManager().setURLModifier(url => {
    if (url.indexOf('/') == -1) {
        return `/rest/parts/${url}`
    } else {
        return `/rest/parts/${url.substring(url.lastIndexOf('/') + 1)}`
    }
})

const gltfLoader = new GLTFLoader()
const ldrawLoader = new LDrawLoader(manager)

ldrawLoader.preloadMaterials('/rest/parts/LDConfig.ldr').then(() => {
    console.log('Materials loaded!')
}).catch(error => {
    console.error(error)
})

function tree(object: Object3D, indent = 0) {
    if (object.type == 'Group') {
        console.log(`${'-'.repeat(indent)} ${object.type} ${object.name} ${object.userData['constructionStep']}`)
    } else if (object.type == 'Mesh') {
        const mesh = object as Mesh
        mesh.material = ldrawLoader.getMaterial(`${mesh.material}`)
    } else if (object.type == 'LineSegments') {
        const line = object as LineSegments
        line.material = ldrawLoader.getMaterial(`${line.material}`)
    }
    for (const child of object.children) {
        tree(child, indent + 1)
    }
}

export const ProductVersionSettingView = (props: RouteComponentProps<{ product: string, version: string }>) => {

    const { goBack } = useHistory()

    // CONTEXTS

    const { contextUser } = useContext(UserContext)
    const { setContextVersion } = useContext(VersionContext)

    // PARAMS

    const productId = props.match.params.product
    const versionId = props.match.params.version

    // INITIAL STATES

    const initialProduct = productId == 'new' ? undefined : ProductManager.getProductFromCache(productId)
    const initialMembers = productId == 'new' ? [] : MemberManager.findMembersFromCache(productId)
    const initialVersions = productId == 'new' ? undefined : VersionManager.findVersionsFromCache(productId)
    const initialVersion = versionId == 'new' ? undefined : VersionManager.getVersionFromCache(versionId)

    // STATES

    // - Entities
    const [product, setProduct] = useState<Product>(initialProduct)
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [versions, setVersions] = useState<Version[]>(initialVersions)
    const [version, setVersion] = useState<Version>(initialVersion)
    // - Values
    const [major, setMajor] = useState<number>(0)
    const [minor, setMinor] = useState<number>(0)
    const [patch, setPatch] = useState<number>(0)
    const [baseVersionIds, setBaseVersionIds] = useState<string[]>([])
    const [description, setDescription] = useState<string>('')
    const [file, setFile] = useState<File>()

    const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>(null)
    const [text, setText] = useState<string>(null)
    const [model, setModel] = useState<GLTF>(null)
    const [group, setGroup] = useState<Group>(null)
    const [blob, setBlob] = useState<Blob>(null) 
    const [dataUrl, setDataUrl] = useState<string>(null) 
    const [active, setActive] = useState<string>('left')

    // EFFECTS

    // - Entities
    useEffect(() => { productId != 'new' && ProductManager.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { productId != 'new' && MemberManager.findMembers(productId).then(setMembers) }, [props])
    useEffect(() => { productId != 'new' && VersionManager.findVersions(productId).then(setVersions) }, [props])
    useEffect(() => { versionId != 'new' && VersionManager.getVersion(versionId).then(setVersion) }, [props])
    // - Values
    useEffect(() => { version && setMajor(version.major) }, [version])
    useEffect(() => { version && setMinor(version.minor) }, [version])
    useEffect(() => { version && setPatch(version.patch) }, [version])
    useEffect(() => { version && setDescription(version.description) }, [version])

    useEffect(() => {
        if (file) {
            setArrayBuffer(null)
            setText(null)
            setModel(null)
            setGroup(null)
            setBlob(null)
            setDataUrl(null)
            if (file.name.endsWith('.glb')) {
                file.arrayBuffer().then(setArrayBuffer)
            } else if (file.name.endsWith('.ldr') || file.name.endsWith('.mpd')) {
                file.text().then(setText)
            }
        }
    }, [file])
    useEffect(() => { arrayBuffer && gltfLoader.parse(arrayBuffer, undefined, setModel) }, [arrayBuffer])
    useEffect(() => { text && ldrawLoader.parse(text, setGroup) }, [text])
    useEffect(() => { model && setGroup(model.scene) }, [model])
    useEffect(() => {
        if (group) {
            tree(group)
            render(group.clone(true), PREVIEW_WIDTH, PREVIEW_HEIGHT).then(result => {
                setBlob(result.blob)
                setDataUrl(result.dataUrl)
            })
        }
    }, [group])

    // FUNCTIONS

    async function onChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.currentTarget.checked) {
            setBaseVersionIds([...baseVersionIds, event.currentTarget.value])
        } else {
            setBaseVersionIds(baseVersionIds.filter(versionId => versionId != event.currentTarget.value))
        }
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault()
        if (versionId == 'new') {
            const version = await VersionManager.addVersion({ userId: contextUser.id, productId: product.id, baseVersionIds, time: new Date().toISOString(), major, minor, patch, description }, { model: file, image: blob })
            setContextVersion(version)
        } else {
            await VersionManager.updateVersion(version.id, { ...version, major, minor, patch, description }, { model: file, image: blob })
            setContextVersion(version)
        }
        goBack()
    }

    // CONSTANTS

    const columns: Column<Version>[] = [
        { label: '📷', class: 'center', content: version => (
            <div className='model' style={{backgroundImage: `url(/rest/files/${version.id}.png)`, width: '5em', height: '5em'}}/>
        ) },
        { label: 'Number', class: 'left fill', content: version => (
            <span>
                {version.major}.{version.minor}.{version.patch}
            </span>
        ) },
        { label: '🛠️', class: 'center', content: version => (
            <input type="checkbox" value={version.id} onChange={onChange}/>
        ) }
    ]

    const items: ProductFooterItem[] = [
        { name: 'left', text: 'Form view', image: LeftIcon },
        { name: 'right', text: 'Model view', image: RightIcon }
    ]

    // RETURN

    return (
        <main className="view extended product-version-setting">
            {(versionId == 'new' || version) && product && versions && (
                <Fragment>
                    {version && version.deleted ? (
                        <Redirect to='/'/>
                    ) : (
                        <Fragment>
                            <ProductHeader product={product}/>
                            <main className= {`sidebar ${active == 'left' ? 'hidden' : 'visible'}`}>
                                <div>
                                    <h1>Settings</h1>
                                    <form onSubmit={onSubmit}>
                                        <NumberInput label='Major' placeholder='Type major' value={major} change={setMajor}/>
                                        <NumberInput label='Minor' placeholder='Type minor' value={minor} change={setMinor}/>
                                        <NumberInput label='Patch' placeholder='Type patch' value={patch} change={setPatch}/>
                                        {versions.length > 0 && (
                                            <GenericInput label="Base">
                                                <Table columns={columns} items={versions.map(v => v).reverse()}/>
                                            </GenericInput>
                                        )}
                                        <TextareaInput label='Description' placeholder='Type description' value={description} change={setDescription}/>
                                        {versionId == 'new' && (
                                            <FileInput label='File' placeholder='Select file' accept='.glb,.ldr,.mpd' change={setFile} required={true}/>
                                        )}
                                        <GenericInput label='Preview'>
                                            {dataUrl ? (
                                                <img src={dataUrl} style={{width: '10em', background: 'rgb(215,215,215)', borderRadius: '1em', display: 'block'}}/>
                                            ) : (
                                                file ? (
                                                    <em>Rendering preview...</em>
                                                ) : (
                                                    <em>Please select file</em>
                                                )
                                            )}
                                        </GenericInput>
                                        {contextUser ? (
                                            members.filter(member => member.userId == contextUser.id && member.role != 'customer').length == 1 ? (
                                                blob ? (
                                                    <SubmitInput value='Save'/>
                                                ) : (
                                                    <SubmitInput value='Save (requires file)' disabled={true}/>
                                                )
                                            ) : (
                                                <SubmitInput value='Save (requires role)' disabled={true}/>
                                            )
                                        ) : (
                                            <SubmitInput value='Save (requires login)' disabled={true}/>
                                        )}
                                    </form>
                                </div>
                                <div>
                                    {version ? (
                                        <VersionView3D version={version} mouse={true}/>
                                    ) : (
                                        <div className="widget version_view_3d">
                                            {!file ? (
                                                <img src={EmptyIcon} className='icon medium position center'/>
                                            ) : (
                                                <Fragment>
                                                    {!group ? (
                                                        <img src={LoadIcon} className='icon small position center animation spin'/>
                                                    ) : (
                                                        <ModelView3D model={group} mouse={true} highlighted={[]} marked={[]} selected={[]}/>
                                                    )}
                                                </Fragment>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </main>
                            <ProductFooter items={items} active={active} setActive={setActive}/>
                        </Fragment>
                    )}
                </Fragment>
            )}
        </main>
    )

}