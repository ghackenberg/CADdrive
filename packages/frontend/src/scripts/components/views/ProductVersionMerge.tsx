import * as React from 'react'
import { useLocation, useParams } from 'react-router'

import { BoxHelper, Group, Mesh, MeshStandardMaterial } from 'three'

import { AbstractOperation, CustomLDrawModel, parseCustomLDrawDelta, parseCustomLDrawModel, selectCleanup, updateBox, updateHelper } from 'productboard-ldraw'

import { FileClient } from '../../clients/rest/file'
import { VersionClient } from '../../clients/rest/version'
import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { createScene } from '../../functions/editor'
import { useAsyncHistory } from '../../hooks/history'
import { useVersions } from '../../hooks/list'
import { getObjectMaterialCode, LDRAW_LOADER, MATERIAL_LOADING } from '../../loaders/ldraw'
import { ModelView3D } from '../widgets/ModelView3D'

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

async function undoUntil(model: Group, operations: AbstractOperation[], index: number, disabledOperations: AbstractOperation[]) {
    for (let i = operations.length - 1; i >= index; i--) {
        if (!disabledOperations.includes(operations[i])) {
            await operations[i].undo(model,LDRAW_LOADER)
        }
    }
}
async function redoFrom(model: Group, operations: AbstractOperation[], index: number, disabledOperations: AbstractOperation[]) {
    for (let i = index; i < operations.length; i++) {
        if (!disabledOperations.includes(operations[i])) {
            await operations[i].redo(model,LDRAW_LOADER)
        }
    }
}
function updateSelection(model: Group, reselectIds: string[]) {//operation: AbstractOperation[], selectedOperation = operation[operation.length - 1]) {
    // unselect all parts
    for (const child of model.children) {
        if (child.name.endsWith('.dat')) {
            child.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material.emissive.setScalar(0)
                    }
                }
            })
        }
    }
    // select parts of last operation
    //const ids = operation[operation.length - 1].getIds()
    //console.log(operation[operation.length - 1], ids)
    if ( reselectIds.length > 0) {
        const parts = model.children.filter(child => reselectIds.includes(child.userData['id']))
        //console.log(operation[operation.length - 1], parts)
        if (parts.length > 0) {
            for (const part of parts) {
            //console.log(operation[operation.length - 1], part)
                part.traverse(object => {
                    if (object instanceof Mesh) {
                        if (object.material instanceof MeshStandardMaterial) {
                            object.material = object.material.clone()
                            object.material.emissive.setScalar(0.1)
                        }
                    }
                })
            }
            updateBox({part: parts[0], parts: parts},model.children.find(child => child.name == 'box') as BoxHelper)
        }
    }
}

export function ProductVersionMergeView() {

    const { hash } = useLocation()

    const { productId, versionId } = useParams<{ productId: string, versionId: string }>()

    const { goBack } = useAsyncHistory()

    const versions = useVersions(productId)

    // CONTEXTS

    const { setContextVersion } = React.useContext(VersionContext)
    const { contextUser } = React.useContext(UserContext)

    // REFS
    const inputRef = React.createRef<HTMLInputElement>()

    // STATES
    const [models, setModels] = React.useState<Group[]>([])
    const [operations, setOperations] = React.useState<AbstractOperation[][]>([])

    const [mergedModel, setMergedModel] = React.useState<Group>(new Group())
    const [mergedOperations, setMergedOperations] = React.useState<AbstractOperation[]>([])
    const [disabledOperations, setDisabledOperations] = React.useState<AbstractOperation[]>([])

    const [basicScene, setBasicScene] = React.useState<Group>(new Group())

    const [startMerging, setStartMerger] = React.useState<boolean>()
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

    const [currentOperation, setCurrentOperation] = React.useState<number>()

    React.useEffect(() => {
        let exec = true
        //const {model} = createScene()
        setMergedModel(createScene().model)
        //setBasicScene(createScene().model)
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

            setBasicScene(mergedModel.clone())
            setStartMerger(true)

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

    async function reconstruct() {
    
        for (let i = mergingIndex.i; i < operations.length; i++) {
            if (i == 0 || mergingIndex.i != i) {
               possibleConflicts.local = possibleConflicts.all.slice()
               console.log(possibleConflicts.local)
            }
            for (let j = mergingIndex.j; j < operations[i].length; j++) {
                const op = operations[i][j]
                if (op.type == 'select') {
                    continue
                }
                if (!mergedOperations.some(operation => operation.operationId == op.operationId)) {
                    if (['move', 'rotate', 'delete'].includes(op.type)) {//op instanceof MoveOperation || op instanceof RotateOperation || op instanceof DeleteOperation) {
                        //Conflict detection
                        const currentIds = op.getIds()
                        for (const element of possibleConflicts.local) {
                            if (element.getIds().some(obj => currentIds.includes(obj))) {
                                //TODO Conflict !!!
                                console.log("CONFLICT!!!!!", op, possibleConflicts.local, mergedOperations , "\nTest\n", possibleConflicts.local.filter(operation => operation.getIds().some(id => currentIds.includes(id))))
                                /*conflictOperations.inserted = possibleConflicts.local.filter(operation => operation.getIds().some(id => currentIds.includes(id)))
                                conflictOperations.new = op
                                mergingIndex.i = i
                                mergingIndex.j = j
                                setConflictSolver(true)
                                const preview = mergedModel.clone()
                                preview.children.find(obj => obj.name == 'manipulator').visible = false
                                setPreviewModel(preview)
                                return*/
                                mergedOperations.push(op)
                                disabledOperations.push(op)
                                break
                            }
                        }
                        if (mergedOperations[mergedOperations.length - 1] == op) {
                            continue
                        }
                        possibleConflicts.all.push(op)
                    }
                    await op.redo(mergedModel, LDRAW_LOADER)
                    mergedOperations.push(op)
                } else if (possibleConflicts.local.some(obj => obj.operationId == op.operationId)) {
                    console.log("Splice", possibleConflicts.local,possibleConflicts.local.findIndex(obj => obj.operationId == op.operationId), "\n Operation causing splice\n", op, mergedOperations.filter(a => a.operationId == op.operationId))
                    possibleConflicts.local.splice(possibleConflicts.local.findIndex(obj => obj.operationId == op.operationId),1)
                }
            }
            possibleConflicts.local = []
        }
        
        // remove all selections
        /*for (const child of mergedModel.children) {
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
        }*/
        updateSelection(mergedModel, mergedOperations[mergedOperations.length - 1].getIds())
        const manipulator = mergedModel.children.find(child => child.name == 'manipulator')
        manipulator.visible = false
        setMergedOperations(mergedOperations)
        setMergingIndex({i: operations.length, j: -1})
        setCurrentOperation(mergedOperations.length - 1)

        //return mergedOperations
    }

    async function onManualMerge() {
        setConflictSolver(false)
        console.log(conflictOperations)

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

    async function onMove(_event: React.MouseEvent,index: number, moveUp: boolean) {
        //moveUp = true: move upwards, moveUp = false: move downwards
        let operation: AbstractOperation = undefined
        if (moveUp) {
            try {
                if(index == 0) {
                    return
                }
                await undoUntil(mergedModel,mergedOperations, index - 1, disabledOperations)
                operation = mergedOperations.splice(index, 1)[0]
                mergedOperations.splice(index - 1, 0, operation)
                await redoFrom(mergedModel, mergedOperations, index - 1, disabledOperations)
                updateSelection(mergedModel, mergedOperations[index - 1].getIds())
                setCurrentOperation(index-1)
            } catch (error) {
                //TODO: if possible disable the button that was fireing the event
                //const element = event.currentTarget
                //console.log(event, element)
                //element.disabled = true
                console.log("error", mergedOperations[index].operationId, error)
                if(operation != undefined) {
                    // error occured during redo and splice operations will be undone
                    mergedOperations.splice(index - 1,1)
                    mergedOperations.splice(index,0,operation)
                }
                const newModel = basicScene.clone()
                console.log("Rotation: ", newModel.rotation.x)
                await redoFrom(newModel, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(child => child.name == 'manipulator')
                manipulator.visible = false
                console.log(newModel, newModel.rotation.x)
                updateSelection(newModel, mergedOperations[index].getIds())
                setMergedModel(newModel)
                return
            }
            
        } else {
            if(index ==  mergedOperations.length - 1) {
                return
            }
            try {
                await undoUntil(mergedModel, mergedOperations, index, disabledOperations)
                operation = mergedOperations.splice(index, 1)[0]
                mergedOperations.splice(index + 1, 0, operation)
                await redoFrom(mergedModel, mergedOperations, index, disabledOperations)
                updateSelection(mergedModel, mergedOperations[index + 1].getIds())
                setCurrentOperation(index+1)
            } catch (error) {
                //TODO: if possible disable the button that was fireing the event
                //const element = event.currentTarget
                //console.log(event, element)
                //element.disabled = true
                console.log("error", mergedOperations[index].operationId, error)
                if(operation != undefined) {
                    // error occured during redo and splice operations will be undone
                    mergedOperations.splice(index + 1,1)
                    mergedOperations.splice(index,0,operation)
                }
                const newModel = basicScene.clone()
                console.log("Rotation: ", newModel.rotation.x)
                await redoFrom(newModel, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(child => child.name == 'manipulator')
                manipulator.visible = false
                console.log(newModel, newModel.rotation.x)
                updateSelection(newModel, mergedOperations[index].getIds())
                setMergedModel(newModel)
                return
            }
        }
        const manipulator = mergedModel.children.find(child => child.name == 'manipulator')
        manipulator.visible = false
        console.log("After meoveement", operation, mergedOperations, currentOperation, index)
    }

    async function onToggleOperation(enable: boolean, operation: AbstractOperation, index: number) {
        if (enable) {
            try {
                await undoUntil(mergedModel, mergedOperations, index, disabledOperations)
                //disabledOperations.splice(disabledOperations.findIndex(op => op == operation))
                const newDisabledList = disabledOperations.filter(op => op != operation)
                await redoFrom(mergedModel, mergedOperations, index, newDisabledList)
                setDisabledOperations(newDisabledList)
            } catch (error) {
                const newModel = basicScene.clone()
                await redoFrom(newModel, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(obj => obj.name == 'manipulator')
                manipulator.visible = false
                updateSelection(newModel, operation.getIds())
                setMergedModel(newModel)
                return
            }
        } else {
            try {
                await undoUntil(mergedModel, mergedOperations, index, disabledOperations)
                //disabledOperations.splice(disabledOperations.findIndex(op => op == operation))
                const newDisabledList = disabledOperations.slice()
                newDisabledList.push(operation)
                await redoFrom(mergedModel, mergedOperations, index, newDisabledList)
                setDisabledOperations(newDisabledList)
            } catch (error) {
                const newModel = basicScene.clone()
                await redoFrom(newModel, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(obj => obj.name == 'manipulator')
                manipulator.visible = false
                setMergedModel(newModel)
                return
            }
        }
        const manipulator = mergedModel.children.find(obj => obj.name == 'manipulator')
        manipulator.visible = false
        updateSelection(mergedModel,operation.getIds())
    }

    function onClick(index: number, ids: string[]) {
        if (index != currentOperation) {
            updateSelection(mergedModel, ids)
            setCurrentOperation(index)
        }
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

        const ldrawDelta: AbstractOperation[] = [] // = selectCleanup
        const cleanUpOperation = selectCleanup(mergedOperations, contextUser.userId, String(major + "." + minor + "." + patch))
        for (const op of cleanUpOperation) {
            if (op.versionId == null) {
                op.versionId = String(major + "." + minor + "." + patch)
            }
            ldrawDelta.push(op)
        }
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
    console.log('disabled' , disabledOperations)
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
                    <ol className='mergedOperations'>
                        {mergedOperations.map((op, i) => {
                            return <li key={i} className={(currentOperation==i ? 'selected' : '') + (disabledOperations.includes(op) ? ' disabled' : '')} onClick={() => onClick(i, op.getIds())}>
                                {"OperationType:" + op.type + " uuid: " + op.operationId}
                                {currentOperation == i && (
                                    <div className='buttons'>
                                        <button onClick={event => onMove(event, i,true)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="18 15 12 9 6 15"></polyline>
                                            </svg>
                                        </button>
                                        <button onClick={event => onMove(event, i, false)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                        <button onClick={() => onToggleOperation(disabledOperations.includes(op), op, i)}>
                                            {disabledOperations.includes(op) ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                </svg> 
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z"/>
                                                    <circle cx="12" cy="12" r="3"/>
                                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                                </svg>                                      
                                            )}
                                        </button>
                                    </div>
                                )}
                            </li>
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