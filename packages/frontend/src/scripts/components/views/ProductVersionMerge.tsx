import * as React from 'react'
import { useLocation, useParams } from 'react-router'

import { Group, Mesh, MeshStandardMaterial } from 'three'

import { AbstractOperation, CustomLDrawModel, parseCustomLDrawDelta, parseCustomLDrawModel, selectbyId, selectCleanup, updateHelper } from 'productboard-ldraw'

import { FileClient } from '../../clients/rest/file'
import { VersionClient } from '../../clients/rest/version'
import { VersionContext } from '../../contexts/Version'
import { createScene } from '../../functions/editor'
import { useAsyncHistory } from '../../hooks/history'
import { useVersions } from '../../hooks/list'
import { getObjectMaterialCode, LDRAW_LOADER, MATERIAL_LOADING } from '../../loaders/ldraw'
import { ModelView3D } from '../widgets/ModelView3D'

// TODO IDEA: during conflict merging undo in merged operations until removed operation occures an then redo all except the deleted op
//      Move merger into main window where deltas and models currently are
//      allow operation switching and show operations that were cut out by a conflict withgray letters

/*async function reconstruct(model: Group, operations: AbstractOperation[][]) {
    //const {model} = await createScene()
    let index = 0
    let firstOperation = true
    //const unselectOps: AbstractOperation[] = []
    //const includedOperations: string[] = []
    const mergedOperations: AbstractOperation[] = []
    //const conflictPotential: {operationId: string, affectedParts: string[]}[] = []
    const possibleConflicts: AbstractOperation[] = []

    for (const ops of operations) {
        //let newOperationIndex = 0
        const newConflicts: AbstractOperation[] = []
        for (const op of ops) {
            const localConflicts = [...possibleConflicts]
            if (!mergedOperations.some(operation => operation.uuid == op.uuid)) {
                if(firstOperation) {
                    firstOperation = false
                    if (op instanceof SelectOperation && op.after.length == 0) {
                        // first new operation is a unselect and will be skipped
                        continue
                    }
                }
                if (op instanceof MoveOperation || op instanceof RotateOperation || op instanceof DeleteOperation) {
                    //Conflict detection
                    const currentIds = op.getIds()
                    for (const element of localConflicts) {
                        if (element.getIds().some(obj => currentIds.includes(obj))) {
                            // Conflict !!!
                            console.log("CONFLICT!!!!!", op, localConflicts, mergedOperations)

                        }
                    }
                    //possibleConflicts.push(op)
                    newConflicts.push(op)
                }
                await op.redo(model, LDRAW_LOADER)
                //includedOperations.push(op.uuid)
                mergedOperations.push(op)
            } else if (localConflicts.some(obj => obj.uuid == obj.uuid)) {
                localConflicts.splice(localConflicts.findIndex(obj => obj.uuid == op.uuid),1)
            }
        }
        possibleConflicts.push(...newConflicts)

        // unselect between different models 
        if (index < operations.length - 1) {
            // find all selected parts
            const parts: string[] = []
            for (const child of model.children) {
                child.name.endsWith('.dat') && child.traverse(object => {
                    if (object instanceof Mesh) {
                        if (object.material instanceof MeshStandardMaterial) {
                            if (object.material.emissive.r == 0.1) {
                                parts.push(child.userData['id'])
                            }
                        }
                    }
                })
            }
            // create  new operation for unselecting the parts
            if (parts.length > 0) {
                const unselect = new SelectOperation(shortid(),[],parts)
                await unselect.redo(model)
                mergedOperations.push(unselect)
                //unselectOps.push(unselect) 
            }
        }
        firstOperation = true
        index++
    }
    console.log(model)
    //return model
    return mergedOperations
}*/
/*async function correctModel(model: Group, operation: AbstractOperation[], removeOperations: AbstractOperation[]) {
    const remove = removeOperations.slice()
    let index =  operation.length - 1
    // Step 1: undo all operations that are after the operations which will be removed
    while (remove.length > 0 && index >= 0) {
        await operation[index].undo(model,LDRAW_LOADER)
        if (remove.some(op => op.uuid == operation[index].uuid)) {
            remove.splice(remove.indexOf(operation[index]), 1)
            operation.splice(index, 1)
        }
        index--
    }
    // Step 2: redo the still included operations
    for (let i = index + 1; i<operation.length; i++) {
        await operation[i].redo(model, LDRAW_LOADER)
    }
}*/

export function ProductVersionMergeView() {

    const { hash } = useLocation()

    const { productId, versionId } = useParams<{ productId: string, versionId: string }>()

    const { goBack } = useAsyncHistory()

    const versions = useVersions(productId)

    // CONTEXTS

    const { setContextVersion } = React.useContext(VersionContext)

    // REFS
    const inputRef = React.createRef<HTMLInputElement>()

    // STATES
    const [models, setModels] = React.useState<Group[]>([])
    const [operations, setOperations] = React.useState<AbstractOperation[][]>([])

    const [mergedModel, setMergedModel] = React.useState<Group>(new Group())
    const [mergedOperations, setMergedOperations] = React.useState<AbstractOperation[]>([])

    const [startMerging, setStartMerger] = React.useState<boolean>()
    //const [mergingIndex1, setMergingIndex1] = React.useState<number>(0)
    //const [mergingIndex2, setMergingIndex2] = React.useState<number>(0)
    const [mergingIndex, setMergingIndex] = React.useState<{i: number, j:number}>({i: 0, j: 0})
    const [possibleConflicts] = React.useState<{all: AbstractOperation[], local: AbstractOperation[]}>({all: [], local:[]})

    const [conflictSolver, setConflictSolver] = React.useState<boolean>(false)
    const [conflictOperations, _setConflictOperations] = React.useState<{inserted: AbstractOperation[], new: AbstractOperation}>({inserted: [], new: undefined})
    const [decision, setDecision] = React.useState<string>('existing')
    const [selectedOperation, setSelectedOperation] = React.useState<number>()
    const [previewModel, setPreviewModel] = React.useState<Group>(new Group())

    const [save, setSave] = React.useState<boolean>()
    const [number, setNumber] = React.useState<string>('minor')
    const [description,setDescription] = React.useState<string>('')

    React.useEffect(() => {
        let exec = true
        //const {model} = createScene()
        setMergedModel(createScene().model)
        const filLoeder = async() => {
            let modelBuffer: ArrayBuffer[] = []
            let deltaBuffer: ArrayBuffer[] = []
            await Promise.all(versions.filter(version => version.modelType == 'ldraw-model' && versionIds.includes(version.versionId)).map(version => FileClient.getFile(`${version.versionId}.${version.modelType}`))).then((buffer) => {exec ? modelBuffer = buffer : undefined})//exec && setModelsBuffer)
            await Promise.all(versions.filter(version => version.deltaType == 'ldraw-delta' && versionIds.includes(version.versionId)).map(version => FileClient.getFile(`${version.versionId}.${version.deltaType}`))).then((buffer) => {exec ? deltaBuffer = buffer : undefined})//exec && setDeltasBuffer)
            return {modelBuffer, deltaBuffer}
        }
        filLoeder().then(({modelBuffer, deltaBuffer}) => {
            (async() => {
                const loadedModels: Group[] = []
                const loadedDeltas: AbstractOperation[][] = []
                if (modelBuffer.length > 0 && deltaBuffer.length > 0 && modelBuffer.length == deltaBuffer.length) {
                    for (let index = 0; index < modelBuffer.length; index++) {
                        const modelText = new TextDecoder().decode(modelBuffer[index])
                        const group = await parseCustomLDrawModel(LDRAW_LOADER, MATERIAL_LOADING, modelText)
                        loadedModels.push(group)
        
                        const deltaText = new TextDecoder().decode(deltaBuffer[index])
                        const delta = await parseCustomLDrawDelta(deltaText)
                        loadedDeltas.push(delta)
                    }
                }
                //console.log("Internal loading result", loadedDeltas, loadedModels)
                //setModelsBuffer(modelbuff)
                //setDeltasBuffer(deltabuff)
                return {loadedModels,loadedDeltas}
            })().then(({loadedModels,loadedDeltas}) => {
                setModels(loadedModels)
                setOperations(loadedDeltas)  
            })
        })
        return () => {exec = false}
    }, [versions])

    React.useEffect(() => {
        //Merger
        if (models.length > 0 && operations.length > 0 && models.length == operations.length) {
            console.log("Activate")

            /*for (let i = 0; i < operations.length; i++) {
                for (let j = i+1; j < operations.length; j++) {
                    // Compare operations[i] with operations[j]
                    let index = 0
                    while (operations[i][index] == operations[j][index]) {
                        // TODO replace == with compare function of abstractoperation
                        if (index == operations[i].length - 1 || index == operations[j].length - 1) {
                            break
                        }
                        index++
                    }
                    if (index != 0) {
                        //TODO store result
                    }
                }
            }*/

            setStartMerger(true)
            //reconstruct(mergedModel,operations)//.then(setMergedOperations)   //unselectOps => {
                /*for (let i = 0; i < operations.length; i++) {
                    for (const op of operations[i]) {
                        mergedOperations.push(op)
                    }
                    if (unselectOps[i]) {
                        mergedOperations.push(unselectOps[i])
                    }
                }
            })*/

            console.log("mergedModel", mergedModel, "\nmergedOperation", mergedOperations)
        }
    },[models, operations])
    React.useEffect(()=>{
        if (operations.length != 0 && mergingIndex.j != -1) {
            reconstruct()
        }
    },[startMerging])
    React.useEffect(() => {
        if (conflictSolver) {
            (async() => {
                const model = mergedModel.clone()
                model.children.find(obj => obj.name == 'manipulator').visible = false
                console.log(model.children.find(obj => obj.name == 'box'))
                if (decision == 'existing') {
                    updateHelper(model, mergedOperations[mergedOperations.length-1].getIds())
                    setPreviewModel(model)
                } else if (decision == 'new') {
                    for(const operation of conflictOperations.inserted) {
                        await operation.undo(model, LDRAW_LOADER)
                    }
                    await conflictOperations.new.redo(model, LDRAW_LOADER)
                    setPreviewModel(model)
                } else if (decision == 'both') {
                    await conflictOperations.new.redo(model, LDRAW_LOADER)
                    setPreviewModel(model)
                } else if (decision == 'choose') {
                    for (let index = conflictOperations.inserted.length - 1; index > selectedOperation; index--) {
                        await conflictOperations.inserted[index].undo(model,LDRAW_LOADER)
                    }
                    await conflictOperations.new.redo(model, LDRAW_LOADER)
                    setPreviewModel(model)
                }
            })()
        }
    },[decision, selectedOperation])

    async function reconstruct() {//model: Group, operations: AbstractOperation[][]) {
        //let firstOperation = true
        //const unselectOps: AbstractOperation[] = []
        //const includedOperations: string[] = []
        //const mergedOperations: AbstractOperation[] = []
        //const conflictPotential: {operationId: string, affectedParts: string[]}[] = []
        //const possibleConflicts: AbstractOperation[] = []
    
        for (let i = mergingIndex.i; i < operations.length; i++) {
            //const newConflicts: AbstractOperation[] = []
            if (i == 0 || mergingIndex.i != i) {//possibleConflicts.local.length == 0) {
                //possibleConflicts.local = [...possibleConflicts.all]
                /*for (const conflict of possibleConflicts.all) {
                    possibleConflicts.local.push(conflict)
                }*/
               possibleConflicts.local = possibleConflicts.all.slice()
               console.log(possibleConflicts.local)
            }
            for (let j = mergingIndex.j; j < operations[i].length; j++) {
                const op = operations[i][j]
                //const localConflicts = [...possibleConflicts]
                if (op.type == 'select') {
                    continue
                }
                if (!mergedOperations.some(operation => operation.uuid == op.uuid)) {
                    /*if(firstOperation) {
                        firstOperation = false
                        if (op instanceof SelectOperation && op.after.length == 0) {
                            // first new operation is a unselect and will be skipped
                            continue
                        }
                    }*/
                    if (['move', 'rotate', 'delete'].includes(op.type)) {//op instanceof MoveOperation || op instanceof RotateOperation || op instanceof DeleteOperation) {
                        //Conflict detection
                        const currentIds = op.getIds()
                        for (const element of possibleConflicts.local) {
                            if (element.getIds().some(obj => currentIds.includes(obj))) {
                                //TODO Conflict !!!
                                console.log("CONFLICT!!!!!", op, possibleConflicts.local, mergedOperations , "\nTest\n", possibleConflicts.local.filter(operation => operation.getIds().some(id => currentIds.includes(id))))
                                conflictOperations.inserted = possibleConflicts.local.filter(operation => operation.getIds().some(id => currentIds.includes(id)))
                                conflictOperations.new = op
                                //setConflictOperations({inserted: copy, new: op})
                                //setMergingIndex1(i)
                                //setMergingIndex2(j)
                                mergingIndex.i = i
                                mergingIndex.j = j
                                setConflictSolver(true)
                                const preview = mergedModel.clone()
                                preview.children.find(obj => obj.name == 'manipulator').visible = false
                                setPreviewModel(preview)
                                return
                            }
                        }
                        //possibleConflicts.push(op)
                        //newConflicts.push(op)
                        possibleConflicts.all.push(op)
                    }
                    await op.redo(mergedModel, LDRAW_LOADER)
                    //includedOperations.push(op.uuid)
                    mergedOperations.push(op)
                } else if (possibleConflicts.local.some(obj => obj.uuid == op.uuid)) {
                    console.log("Splice", possibleConflicts.local,possibleConflicts.local.findIndex(obj => obj.uuid == op.uuid), "\n Operation causing splice\n", op, mergedOperations.filter(a => a.uuid == op.uuid))
                    possibleConflicts.local.splice(possibleConflicts.local.findIndex(obj => obj.uuid == op.uuid),1)
                }
            }
            //console.log("-------",newConflicts)
            //possibleConflicts.all.push(...newConflicts)
    
            // unselect between different models 
            /*if (i < operations.length - 1) {
                // find all selected parts
                const parts: string[] = []
                for (const child of model.children) {
                    child.name.endsWith('.dat') && child.traverse(object => {
                        if (object instanceof Mesh) {
                            if (object.material instanceof MeshStandardMaterial) {
                                if (object.material.emissive.r == 0.1) {
                                    parts.push(child.userData['id'])
                                }
                            }
                        }
                    })
                }
                // create  new operation for unselecting the parts
                if (parts.length > 0) {
                    const unselect = new SelectOperation(shortid(),[],parts)
                    await unselect.redo(model)
                    mergedOperations.push(unselect)
                    //unselectOps.push(unselect) 
                }
            }
            firstOperation = true*/
            possibleConflicts.local = []
        }
        //console.log(model)
        //setMergingIndex1(operations.length)
        //setMergingIndex2(-1)
        
        // remove all selections
        for (const child of mergedModel.children) {
            child.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        if (object.material.emissive.r == 0.1) {
                            object.material.emissive.setScalar(0)
                        }
                    }
                }
            })
        }
        // correct all selections and redo last selection
        const correctedOperations = selectCleanup(mergedOperations)
        for (let index = correctedOperations.length - 1; index >= 0; index--) {
            if (correctedOperations[index].type == 'select') {
                correctedOperations[index].redo(mergedModel,LDRAW_LOADER)
                break
            } else if (correctedOperations[index].type == 'delete') {
                break
            } else if (correctedOperations[index].type == 'insert') {
                selectbyId(mergedModel,correctedOperations[index].getIds())
                break
            }
        }
        setMergedOperations(correctedOperations)
        setMergingIndex({i: operations.length, j: -1})

        //return mergedOperations
    }

    async function onManualMerge() {
        setConflictSolver(false)
        console.log(conflictOperations)

        /*switch (decision) {
            case 'existing':
                // skip operation that caused the conflict
                //setMergingIndex2(mergingIndex2+1)
                break
            case 'new':
                while (conflictOperations.inserted.length > 0) {
                    const removedOp = conflictOperations.inserted.pop()
                    removedOp.undo(mergedModel,LDRAW_LOADER)
                    possibleConflicts.all.splice(possibleConflicts.all.indexOf(removedOp),1)
                    possibleConflicts.local.splice(possibleConflicts.local.indexOf(removedOp),1)
                }
                await conflictOperations.new.redo(mergedModel,LDRAW_LOADER)
                possibleConflicts.all.push(conflictOperations.new)
                break
            case 'both':
                await conflictOperations.new.redo(mergedModel,LDRAW_LOADER)
                possibleConflicts.all.push(conflictOperations.new)
                break
        }*/
        if (decision == 'new') {
            while (conflictOperations.inserted.length > 0) {
                console.log("Manuall merge",conflictOperations, mergedOperations)
                const removedOp = conflictOperations.inserted.pop()

                removedOp.undo(mergedModel,LDRAW_LOADER)
                mergedOperations.splice(mergedOperations.indexOf(removedOp), 1)

                possibleConflicts.all.splice(possibleConflicts.all.indexOf(removedOp), 1)
                possibleConflicts.local.splice(possibleConflicts.local.indexOf(removedOp), 1)
            }
            await conflictOperations.new.redo(mergedModel,LDRAW_LOADER)
            mergedOperations.push(conflictOperations.new)
            possibleConflicts.all.push(conflictOperations.new)
        } else if (decision == 'both') {
            await conflictOperations.new.redo(mergedModel, LDRAW_LOADER)
            mergedOperations.push(conflictOperations.new)
            possibleConflicts.all.push(conflictOperations.new)
        } else if (decision == 'choose') {
            for (let index = conflictOperations.inserted.length - 1; index > selectedOperation; index--) {
                await conflictOperations.inserted[index].undo(mergedModel, LDRAW_LOADER)
            }
        }
        mergingIndex.j++
        setDecision('existing')
        setStartMerger(!startMerging)
    }

    async function onSave() {
        const baseVersionIds =  versionIds
        
        let relative
        for (const version of versions.filter(version => versionIds.includes((version.versionId)))) {
            if(!relative) {
                relative = version
            }
            if (version.major > relative.major) {
                relative = version
            } else if (version.major == relative.major && version.minor > relative.minor) {
                relative = version
            } else if (version.major == relative.major && version.minor == relative.minor && version.patch > relative.patch) {
                relative = version
            }
        }
        
        let major = relative && (number == 'major' || number == 'minor' || number == 'patch') ? relative.major : 0
        let minor = relative && (number == 'minor' || number == 'patch') ? relative.minor : 0
        let patch = relative && (number == 'patch') ? relative.patch : 0

        for (const version of versions) {
            if (number == 'major' && version.major == major) {
                major++
            } else if (number == 'minor' && version.major == major && version.minor == minor) {
                minor++
            } else if (number == 'patch' && version.major == major && version.minor == minor && version.patch == patch) {
                patch++
            }
        }

        const data = { baseVersionIds, major, minor, patch, description }

        const ldrawModel: CustomLDrawModel = mergedModel.children.filter(child => child.name && child.name.endsWith('.dat')).map(child => {
            return {
                id: child.userData['id'],
                name: child.name,
                color: getObjectMaterialCode(child),
                position: child.position,
                orientation: child.matrix.makeRotationY(-child.rotation.y).elements
            }
        })

        const ldrawDelta: AbstractOperation[] = mergedOperations
        const ldrawModelS = JSON.stringify(ldrawModel)
        const ldrawDeltaS = JSON.stringify(ldrawDelta)

        console.log(ldrawModelS)
        console.log(ldrawDeltaS)

        const modelBlob = new Blob([ldrawModelS], { type: 'application/x-ldraw-model' })
        const deltaBlob = new Blob([ldrawDeltaS], { type: 'application/x-ldraw-delta' })
        const imageBlob: Blob = null

        const files = { model: modelBlob, delta: deltaBlob, image: imageBlob }

        const newVers = await VersionClient.addVersion(productId, data, files)

        setContextVersion(newVers)

        await goBack()
    }
    
    //console.log("Model", mergedModel, "\nOperations", mergedOperations)
    //console.log(models.length != 0 ? models : "no model", operations.length != 0 ? operations : "no operation")

    const versionIds = versionId.split('+')

    return (
        <main className={`view product-version sidebar ${!hash ? 'hidden' : 'visible'}` }>
            <div className='mergeData'>
                <div className='header'>
                    <a className='button green fill' onClick={() => setSave(true)}>
                        Save
                    </a>
                    <a className='button red fill' onClick={goBack}>
                        Cancel
                    </a>
                </div>
                <div className='main'>
                    Versions:
                    <ul>
                        {versionIds.map(versionId => (
                            <li key={versionId}>
                                {versionId}
                            </li>
                        ))}
                    </ul>
                    Models:
                    <ul>
                        {models.map((model, index) => (
                            <li key={index}>
                                {model.uuid}
                                <ul>
                                    {model.children.map((object, i) => {
                                        const Data: string = object.userData['id'] + " part: " + object.name + " position: " + object.position.x + " " + object.position.y + " " + object.position.z + " rotation: " + object.rotation.y
                                        return <li key={i}>{Data}</li>
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                    Deltas:
                    <ul>
                        {operations.map((delta, index) => (
                            <li key={index}>
                                {"operations from Group: " + index}
                                <ol>
                                    {delta.map((op, i) => {
                                        return <li key={i}>{op.type}</li>
                                    })}
                                </ol>
                            </li>
                        ))}
                    </ul>
                    MergedModels:
                    <ul>
                        {mergedModel.children.map((object, i) => {
                            if (object.userData['id']) {
                                const Data: string = object.userData['id'] + " part: " + object.name + " position: " + object.position.x + " " + object.position.y + " " + object.position.z + " rotation: " + object.rotation.y
                                return <li key={i}>{Data}</li>
                            } else {return  undefined}
                        })}
                    </ul>
                    MergedDeltas:
                    <ol>
                        {mergedOperations.map((op, i) => {
                            const Data: string = "OperationType:" + op.type + " uuid: " + op.uuid
                            return <li key={i}>{Data}</li>
                        })}
                    </ol>
                </div>
            </div>
            <div>
                <ModelView3D model={mergedModel}/>
            </div>
            {save && (
                <div className='save'>
                    <div className='form'>
                        <div className='text'>
                            <input ref={inputRef} className='button fill lightgray' placeholder='Description' required={true} value={description} onChange={event => setDescription(event.currentTarget.value)}/>
                        </div>
                        <div className='number'>
                            <input type='radio' name='number' value='major' checked={number == 'major'} onChange={event => setNumber(event.currentTarget.value)}/>
                            <span>Major</span>
                            <input type='radio' name='number' value='minor' checked={number == 'minor'} onChange={event => setNumber(event.currentTarget.value)}/>
                            <span>Minor</span>
                            <input type='radio' name='number' value='patch' checked={number == 'patch'} onChange={event => setNumber(event.currentTarget.value)}/>
                            <span>Patch</span>
                        </div>
                        <div className='action'>
                            <button className='button fill green' onClick={onSave}>
                                Save
                            </button>
                            <button className='button stroke green' onClick={() => setSave(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {conflictSolver && (
                <div className='ConflictSolver'>
                    <div className='form'>
                        <div className='text'>
                            <p>A merge conflict occured.</p>
                            <p>Choose how the result should look like</p>
                        </div>
                        <div className='decision'>
                            <input type='radio' name='decision' value='existing' checked={decision == 'existing'} onChange={event => setDecision(event.currentTarget.value)}/>
                            <span>existing</span>
                            <input type='radio' name='decision' value='new' checked={decision == 'new'} onChange={event => setDecision(event.currentTarget.value)}/>
                            <span>new</span>
                            <input type='radio' name='decision' value='both' checked={decision == 'both'} onChange={event => setDecision(event.currentTarget.value)}/>
                            <span>both</span>
                            {/*<input type='radio' name='decision' value='choose' checked={decision == 'choose'} onChange={event => setDecision(event.currentTarget.value)}/>
                            <span>choose operation</span>*/}
                        </div>
                        { decision == 'choose' && (
                            <div className='operation selection'>
                                Choose which operation should be the last before the new operation:
                                <ol>
                                    {conflictOperations.inserted.map((op, i) => {
                                        return <li key={i} className={selectedOperation==i ? 'selected' : ''} onClick={() => setSelectedOperation(i)}>{op.type}</li>
                                    })}
                                </ol>
                            </div>
                        )}
                        <div className='previewModel'>
                            <ModelView3D model={previewModel}/>
                        </div>
                        <div className='action'>
                            <button className='button fill green' onClick={onManualMerge}>
                                Save
                            </button>
                            <button className='button stroke green' onClick={goBack}>
                                Abbort
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}