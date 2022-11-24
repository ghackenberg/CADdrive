import { Product, Version } from 'productboard-common'
import * as React from 'react'
import { useState, useEffect, useContext, FormEvent, ChangeEvent, Fragment } from 'react'
import { Redirect, useHistory } from 'react-router'
import { RouteComponentProps } from 'react-router-dom'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import { UserContext } from '../../contexts/User'
import { render } from '../../functions/render'
import { ProductManager } from '../../managers/product'
import { VersionManager } from '../../managers/version'
import { FileInput } from '../inputs/FileInput'
import { GenericInput } from '../inputs/GenericInput'
import { NumberInput } from '../inputs/NumberInput'
import { TextInput } from '../inputs/TextInput'
import { ProductFooter } from '../snippets/ProductFooter'
import { ProductHeader } from '../snippets/ProductHeader'
import { SceneView3D } from '../widgets/SceneView3D'
import { VersionView3D } from '../widgets/VersionView3D'

import * as EmptyIcon from '/src/images/empty.png'
import * as LoadIcon from '/src/images/load.png'

const PREVIEW_WIDTH = 1000
const PREVIEW_HEIGHT = 1000

export const ProductVersionSettingView = (props: RouteComponentProps<{ product: string, version: string }>) => {

    const history = useHistory()

    // CONTEXTS

    const contextUser = useContext(UserContext)

    // PARAMS

    const productId = props.match.params.product
    const versionId = props.match.params.version

        // INITIAL STATES
        const initialProduct = productId == 'new' ? undefined : ProductManager.getProductFromCache(productId)
        const initialVersions = productId == 'new' ? undefined : VersionManager.findVersionsFromCache(productId)
        const initialVersion = versionId == 'new' ? undefined : VersionManager.getVersionFromCache(versionId)

    // STATES

    // - Entities
    const [product, setProduct] = useState<Product>(initialProduct)
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
    const [model, setModel] = useState<GLTF>(null)
    const [image, setImage] = useState<Blob>(null) 
    const [sidebar, setSidebar] = useState<boolean>(false)

    // EFFECTS

    // - Entities
    useEffect(() => { ProductManager.getProduct(productId).then(setProduct) }, [props])
    useEffect(() => { VersionManager.findVersions(productId).then(setVersions) }, [props])
    useEffect(() => { versionId != 'new' && VersionManager.getVersion(versionId).then(setVersion) }, [props])
    // - Values
    useEffect(() => { version && setMajor(version.major) }, [version])
    useEffect(() => { version && setMinor(version.minor) }, [version])
    useEffect(() => { version && setPatch(version.patch) }, [version])
    useEffect(() => { version && setDescription(version.description) }, [version])

    useEffect(() => { setArrayBuffer(null)}, [file])
    useEffect(() => { setModel(null) }, [arrayBuffer])
    useEffect(() => { setImage(null) }, [model])

    useEffect(() => { file && file.arrayBuffer().then(setArrayBuffer) }, [file])
    useEffect(() => { arrayBuffer && new GLTFLoader().parse(arrayBuffer, undefined, setModel) }, [arrayBuffer])
    useEffect(() => { model && render(model.scene.clone(true), PREVIEW_WIDTH, PREVIEW_HEIGHT).then(setImage) }, [model])

    // FUNCTIONS

    async function update(event: ChangeEvent<HTMLInputElement>) {
        if (event.currentTarget.checked) {
            setBaseVersionIds([...baseVersionIds, event.currentTarget.value])
        } else {
            setBaseVersionIds(baseVersionIds.filter(versionId => versionId != event.currentTarget.value))
        }
    }

    async function submit(event: FormEvent) {
        event.preventDefault()
        if (versionId == 'new') {
            await VersionManager.addVersion({ userId: contextUser.id, productId: product.id, baseVersionIds, time: new Date().toISOString(), major, minor, patch, description }, { model: file, image })
        } else {
            await VersionManager.updateVersion(version.id, { ...version, major, minor, patch, description }, { model: file, image })
        }
        history.goBack()
    }

    // RETURN

    return (
        <main className="view extended version">
            {(versionId == 'new' || version) && product && versions && (
                <Fragment>
                    {version && version.deleted ? (
                        <Redirect to='/' />
                    ) : (
                        <Fragment>
                            <ProductHeader product={product} />
                            <main className= {`sidebar ${sidebar ? 'visible' : 'hidden'}`}>
                                <div>
                                    <h1>Settings</h1>
                                    <form onSubmit={submit}>
                                        <NumberInput label='Major' placeholder='Type major' value={major} change={setMajor} />
                                        <NumberInput label='Minor' placeholder='Type minor' value={minor} change={setMinor} />
                                        <NumberInput label='Patch' placeholder='Type patch' value={patch} change={setPatch} />
                                        {versions.length > 0 && (
                                            <GenericInput label="Base">
                                                <Fragment>
                                                    {versions.map(version => version).reverse().map(version => (
                                                        <div key={version.id}>
                                                            <input type="checkbox" value={version.id} onChange={update} />
                                                            <label>{version.major}.{version.minor}.{version.patch}</label>
                                                        </div>
                                                    ))}
                                                </Fragment>
                                            </GenericInput>
                                        )}
                                        <TextInput class='fill' label='Description' placeholder='Type description' value={description} change={setDescription} />
                                        {versionId == 'new' && <FileInput label='File' placeholder='Select file' accept='.glb' change={setFile} required={true} />}
                                        <div>
                                            <div />
                                            <div>
                                                <input type='submit' value='Save' disabled={image == null} />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div>
                                    {version ? (
                                        <VersionView3D version={version} mouse={true} vr={true} />
                                    ) : (
                                        <div className="widget model_view">
                                            {!file ? (
                                                <img className='empty' src={EmptyIcon} />
                                            ) : (
                                                <Fragment>
                                                    {!model ? (
                                                        <img className='load' src={LoadIcon} />
                                                    ) : (
                                                        <SceneView3D model={model} mouse={false} vr={false} highlighted={[]} marked={[]} selected={[]}/>
                                                    )}
                                                </Fragment>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </main>
                            <ProductFooter sidebar={sidebar} setSidebar={setSidebar} item1={{'text':'Version-Settings','image':'version'}} item2={{'text':'3D-Modell','image':'part'}}></ProductFooter>
                        </Fragment>
                    )}
                </Fragment>
            )}
        </main>
    )

}