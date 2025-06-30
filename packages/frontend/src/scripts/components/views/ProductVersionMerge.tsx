import * as React from 'react'
import { useLocation, useParams } from 'react-router'

import { BoxHelper, Group, Material, Mesh, MeshStandardMaterial } from 'three'

import { VersionRead } from 'productboard-common'
import { AbstractOperation, ColorOperation, CustomLDrawModel, DeleteOperation, InsertOperation, parseCustomLDrawDelta, selectCleanup, updateBox, renderPreperation, parseCustomLDrawModel, SelectOperation } from 'productboard-ldraw'

import { FileClient } from '../../clients/rest/file'
import { VersionClient } from '../../clients/rest/version'
import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { createScene } from '../../functions/editor'
import { render } from '../../functions/render'
import { computeColor } from '../../functions/tree'
import { useAsyncHistory } from '../../hooks/history'
import { useVersions } from '../../hooks/list'
import { getMaterials, getObjectMaterialCode, LDRAW_LOADER, MATERIAL_LOADING } from '../../loaders/ldraw'
import { ModelView3D } from '../widgets/ModelView3D'

import BackIcon from '/src/images/back.png'
import ShowIcon from '/src/images/show.png'
import HideIcon from '/src/images/hide.png'
import AbbortIcon from '/src/images/delete.png'
import SaveIcon from '/src/images/save.png'

const MOVE_INSIDE_VERSIONS = false

//TODO: remove model
//      indicate conflict with picture or something else
//NEW:  
//      Copy designe for merger from version view
//      render affected parts that are not included in model
//      rework base operation to avoid false base operations (check if no other ops are between base ops)

function updateSelection(model: Group, reselectIds: string[]) {
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
            updateBox({part: parts[0], parts: parts}, model.children.find(child => child.name == 'box') as BoxHelper)
        } else {
            updateBox({part: undefined,  parts: []}, model.children.find(child => child.name == 'box') as BoxHelper)
        }
    }
} 

function correctColorChanges(operationList: AbstractOperation[]) {
    // Corrects the colors in delete and color change operations and removes useles color changes
    const partIDs: string[] = []
    const colorList: string[] = []
    const result: AbstractOperation[] = []

    for (const operation of operationList) {
        if (operation instanceof InsertOperation){
            for (let i = 0; i < operation.id.length; i++) {
                partIDs.push(operation.id[i])
                colorList.push(operation.color[i])
            }
        } else if (operation instanceof DeleteOperation) {
            /*const ids: string[] = []
            const parts: string[] = []
            const rotation: Euler[] = []
            const position: Vector3[] = []
            const colors: string[] = []*/
            for (let i = 0; i < operation.id.length; i++) {
                const foundIndex = partIDs.findIndex(entry => entry == operation.id[i])
                if (foundIndex != -1) {
                    /*ids.push(operation.id[i])
                    parts.push(operation.part[i])
                    rotation.push(operation.rotation[i])
                    position.push(operation.position[i])
                    colors.push(colorList[foundIndex])*/
                    operation.color[i] = colorList[foundIndex]
                }
            }
            /*if (ids.length != operation.id.length) {
                result.push(new DeleteOperation(operation.operationId, operation.userId, operation.versionId, operation.timestamp, ids, parts, colors, position, rotation))
                continue
            }*/
        } else if (operation instanceof ColorOperation) {
            /*const ids: string[] = []
            const colors: string[] = []*/
            for (let i = 0; i < operation.id.length; i++) {
                const foundIndex = partIDs.findIndex(entry => entry == operation.id[i])
                if (foundIndex != -1) {
                    /*ids.push(partIDs[foundIndex])
                    console.log("Farbe", colorList[foundIndex])
                    colors.push(colorList[foundIndex])
                    console.log("Re change", colorList[foundIndex], colorList)
                    colorList[foundIndex] = operation.newcolor
                    console.log("CC", foundIndex, colorList[foundIndex], colorList, partIDs)*/
                    operation.oldcolor[i] = colorList[foundIndex]
                    colorList[foundIndex] = operation.newcolor
                }
            }
            /*if (ids.length != operation.id.length || operation.oldcolor.some((color,index) => color != colors[index])) {
                if (ids.length != 0) {
                    console.log("Hallo",operation.oldcolor,colors)
                    result.push(new ColorOperation(operation.operationId, operation.userId, operation.versionId, operation.timestamp, ids, colors, operation.newcolor))
                }
                continue
            }*/
        }
        result.push(operation)
    }
    return result
}

function getVersionHSL(versionId: string, color:{[versionId: string]: number}, versions: VersionRead[]) {
    const hue = color[versions.find(version => version.major == Number(versionId.split('.')[0]) && version.minor == Number(versionId.split('.')[1]) && version.patch == Number(versionId.split('.')[2])).versionId]
    return `hsl(${hue}, ${50}%, ${50}%)`
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

    const [availableMaterials, setAvailableMaterials] = React.useState<Material[]>()

    const [mergedModel, setMergedModel] = React.useState<Group>(new Group())
    const [mergedOperations] = React.useState<AbstractOperation[]>([])
    const [disabledOperations, setDisabledOperations] = React.useState<AbstractOperation[]>([])
    const [dataUrl] = React.useState<string[]>([])

    const [basicScene, setBasicScene] = React.useState<Group>(new Group())

    const [startMerging, setStartMerging] = React.useState<boolean>()
    const [mergingIndex, setMergingIndex] = React.useState<{i: number, j:number}>({i: 0, j: 0})
    const [possibleConflicts] = React.useState<{all: AbstractOperation[], local: AbstractOperation[]}>({all: [], local:[]})
    const [baseIndex, setBaseIndex] = React.useState<number>()

    const [save, setSave] = React.useState<boolean>()
    const [number, setNumber] = React.useState<string>('minor')
    const [description,setDescription] = React.useState<string>('')

    const [currentOperation, setCurrentOperation] = React.useState<number>()

    const [renderToggle, setRenderToggle] = React.useState(false)

    const [update, setUpdate] = React.useState(0)

    // CONSTANTS
    const color = computeColor(versions)
    
    // Load available materials and set initial selected material
    React.useEffect(() => {
        let exec = true
        getMaterials().then(materials => {
            if (exec) {
                setAvailableMaterials(materials)
            }
        })
        return () => { exec = false }
    }, [])

    React.useEffect(() => {
        if (versions && versions.filter(version => versionId.includes(version.versionId)).some(version => version.modelType != 'ldraw-model')) {
            goBack()
        }
    }, [versions])

    React.useEffect(() => {
        let exec = true
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
                return {loadedModels,loadedDeltas}
            })().then(({loadedModels,loadedDeltas}) => {
                if (exec) {
                    setModels(loadedModels)
                    setOperations(loadedDeltas)  
                }        
            })
        })
        return () => {exec = false}
    }, [versions])

    React.useEffect(() => {
        let exec = true
        if (models.length > 0 && operations.length > 0 && models.length == operations.length) {
            //console.log("Activate")
            
            if (exec) {
                setBasicScene(mergedModel.clone())
                setStartMerging(true)
            }

            //console.log("mergedModel", mergedModel, "\nmergedOperation", mergedOperations)
        }
        return () => { exec = false }
    },[models, operations])
    React.useEffect(()=>{
        let exec = true
        if (exec && operations.length != 0 && mergingIndex.j != -1) {
            reconstruct(exec)
        }

        return () => { exec = false }
    },[startMerging])

    async function reconstruct(exec: boolean) {
        console.log("Reconstruct", mergedOperations)

        // Operation diffing
        let sameOperations = operations[0].slice().filter(op => op.type != 'select')
        console.log(sameOperations)
        for (let index = 1; index < operations.length; index++) {
            const newSameOperations: AbstractOperation[] = []
            for (const op of operations[index]) {
                const foundOperation = sameOperations.find(operation => operation.operationId == op.operationId)
                console.log("found op: ",foundOperation)
                if (!(op instanceof SelectOperation) && foundOperation/*sameOperations.some(operation => operation.operationId == op.operationId)*/) {
                    if (foundOperation.versionId < op.versionId) {
                        newSameOperations.push(foundOperation)
                    } else {
                        newSameOperations.push(op)
                    }
                }
                console.log(newSameOperations)
            }
            sameOperations = newSameOperations
        }
        
        console.log(sameOperations)
        for (const operation of sameOperations) {
            await operation.redo(mergedModel, LDRAW_LOADER)
            mergedOperations.push(operation)
            const renderModel = await renderPreperation(operation, mergedModel.clone(), availableMaterials, LDRAW_LOADER)
            await render(renderModel, 150, 150).then(result => {
                dataUrl.push(result.dataUrl)
                console.log("Render")
            })
            //possibleConflicts.all.push(operation)
        }
        /*for (let index = 0; index < operations.length; index++) {
            operations[index].findIndex(op => sameOperations.includes())
        }*/

        const lastCommonAncestorIndex: number = sameOperations.length - 1
        for (let i = mergingIndex.i; i < operations.length; i++) {
            if (i == 0 || mergingIndex.i != i) {
               possibleConflicts.local = possibleConflicts.all.slice()
               //console.log(possibleConflicts.local)
            }

            //let lastCommonOpID: string
            //let lastCommonOpIDIndex = -1
            for (let j = mergingIndex.j; j < operations[i].length; j++) {
                const op = operations[i][j]
                if (op.type == 'select') {
                    continue
                }
                if (!mergedOperations.some(operation => operation.operationId == op.operationId)) {
                    if (['move', 'rotate', 'delete', 'color change'].includes(op.type)) {
                        //Conflict detection
                        const currentIds = op.getIds()
                        for (const element of possibleConflicts.local) {
                            if (element.getIds().some(obj => currentIds.includes(obj)) && (op.type != 'color change' || op.type == element.type)) {
                                // Conflict detected
                                mergedOperations.push(op)
                                disabledOperations.push(op)
                                // render image
                                const renderModel = await renderPreperation(op, mergedModel.clone(), availableMaterials, LDRAW_LOADER)
                                await render(renderModel, 150, 150).then(result => {
                                    dataUrl.push(result.dataUrl)
                                    console.log("Render")
                                })
                                break
                            }
                        }
                        if (mergedOperations[mergedOperations.length - 1] == op) {
                            // continue if conflict was detected
                            continue
                        }
                        possibleConflicts.all.push(op)
                    }
                    await op.redo(mergedModel, LDRAW_LOADER)
                    mergedOperations.push(op)
                    // render image
                    const renderModel = await renderPreperation(op, mergedModel.clone(), availableMaterials, LDRAW_LOADER)
                    await render(renderModel, 150, 150).then(result => {
                        dataUrl.push(result.dataUrl)
                        //console.log("Render")
                    })
                } else {
                    //lastCommonOpID = op.operationId
                    /*const index = mergedOperations.findIndex(operation => operation.operationId == op.operationId)
                    if (index == lastCommonOpIDIndex + 1) {
                        lastCommonOpIDIndex = index
                    }*/
                    if (possibleConflicts.local.some(obj => obj.operationId == op.operationId)) {
                        //console.log("Splice", possibleConflicts.local,possibleConflicts.local.findIndex(obj => obj.operationId == op.operationId), "\n Operation causing splice\n", op, mergedOperations.filter(a => a.operationId == op.operationId))
                        possibleConflicts.local.splice(possibleConflicts.local.findIndex(obj => obj.operationId == op.operationId),1)
                    }
                }
            }
            //const commonIndex = mergedOperations.findIndex(op => op.operationId == lastCommonOpID)
            //console.log(lastCommonOpID, commonIndex, lastCommonAncestorIndex)
            /*if (lastCommonAncestorIndex == undefined) {
                lastCommonAncestorIndex = mergedOperations.length - 1
            } else if(lastCommonAncestorIndex > lastCommonOpIDIndex) {
                lastCommonAncestorIndex = lastCommonOpIDIndex
            }*/
            possibleConflicts.local = []
        }
        
        if (exec) {
            setBaseIndex(lastCommonAncestorIndex)
            updateSelection(mergedModel, mergedOperations[mergedOperations.length - 1].getIds())
            const manipulator = mergedModel.children.find(child => child.name == 'manipulator')
            manipulator.visible = false
            //setMergedOperations(mergedOperations)
            setMergingIndex({i: operations.length, j: -1})
            setCurrentOperation(mergedOperations.length - 1)

            setUpdate(update+1)
        }
        //return mergedOperations
    }

    async function onMove(_event: React.MouseEvent,index: number, moveDwon: boolean) {
        // moveDown = true: move downwards on UI, moveDown = false: move upwards on UI
        let operation: AbstractOperation = undefined
        setUpdate(update+1)

        if (moveDwon) {
            try {
                if(index == 0 || index <= baseIndex + 1 || (!MOVE_INSIDE_VERSIONS && mergedOperations[index].versionId == mergedOperations[index - 1].versionId)) {
                    return
                }
                //await undoUntil(mergedModel,mergedOperations, index - 1, disabledOperations)
                mergedModel.remove(...mergedModel.children.filter(child => child.name.endsWith('.dat')))
                operation = mergedOperations.splice(index, 1)[0]
                mergedOperations.splice(index - 1, 0, operation)
                await redoFrom(mergedModel, index - 1)//, mergedOperations, 0, disabledOperations)
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
                await redoFrom(newModel, index - 1)//, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(child => child.name == 'manipulator')
                manipulator.visible = false
                console.log(newModel, newModel.rotation.x)
                updateSelection(newModel, mergedOperations[index].getIds())
                setMergedModel(newModel)
                return
            }
            
        } else {
            if(index ==  mergedOperations.length - 1 || (!MOVE_INSIDE_VERSIONS && mergedOperations[index].versionId == mergedOperations[index + 1].versionId)) {
                return
            }
            try {
                //await undoUntil(mergedModel, mergedOperations, index, disabledOperations)
                mergedModel.remove(...mergedModel.children.filter(child => child.name.endsWith('.dat')))
                operation = mergedOperations.splice(index, 1)[0]
                mergedOperations.splice(index + 1, 0, operation)
                await redoFrom(mergedModel, index)//, mergedOperations, 0, disabledOperations)
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
                await redoFrom(newModel, index)//, mergedOperations, 0, disabledOperations)
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
        //console.log("After meoveement", operation, mergedOperations, currentOperation, index)
    }

    async function onToggleOperation(enable: boolean, operation: AbstractOperation, index: number) {
        setUpdate(update+1)

        if (enable) {
            try {
                mergedModel.remove(...mergedModel.children.filter(child => child.name.endsWith('.dat')))
                const newDisabledList = disabledOperations.filter(op => op != operation)
                await redoFrom(mergedModel, index, newDisabledList)//, mergedOperations, 0, newDisabledList)
                setDisabledOperations(newDisabledList)
            } catch (error) {
                const newModel = basicScene.clone()
                await redoFrom(newModel, index)//, mergedOperations, 0, disabledOperations)
                const manipulator = newModel.children.find(obj => obj.name == 'manipulator')
                manipulator.visible = false
                updateSelection(newModel, operation.getIds())
                setMergedModel(newModel)
                return
            }
        } else {
            try {
                mergedModel.remove(...mergedModel.children.filter(child => child.name.endsWith('.dat')))
                const newDisabledList = disabledOperations.slice()
                newDisabledList.push(operation)
                await redoFrom(mergedModel, index, newDisabledList)//, mergedOperations, 0, newDisabledList)
                setDisabledOperations(newDisabledList)
            } catch (error) {
                const newModel = basicScene.clone()
                await redoFrom(newModel, index)//, mergedOperations, 0, disabledOperations)
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

    async function redoFrom(model:Group, firstRenderIndex = 0, disabledList: AbstractOperation[] = disabledOperations) {
        //console.log(disabledList, model)
        for (let i = 0; i < mergedOperations.length; i++) {
            if (!disabledList.includes(mergedOperations[i])) {
                //console.log(mergedOperations[i].type, mergedOperations[i], model, disabledList)
                await mergedOperations[i].redo(model,LDRAW_LOADER)
            }
            if (firstRenderIndex <= i) {
                const renderModel = await renderPreperation(mergedOperations[i],model.clone(), availableMaterials, LDRAW_LOADER)
                render(renderModel, 150, 150).then(result => {
                    dataUrl[i] = result.dataUrl
                    //dataUrl.push(result.dataUrl)
                    i == mergedOperations.length-1 && setRenderToggle(!renderToggle)
                })
            }
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

        // Removing disabled operations from result
        for (const op of disabledOperations) {
            mergedOperations.splice(mergedOperations.indexOf(op),1)
        }

        const ldrawDelta: AbstractOperation[] = [] // = selectCleanup
        const cleanUpOperation = selectCleanup(correctColorChanges(mergedOperations), contextUser.userId)
        console.log("Correction result", cleanUpOperation)
        let useNewVersion = false
        let lastMajor = 0
        let lastMinor = 0
        let lastPatch = 0
        for (const op of cleanUpOperation) {
            if (op.versionId == null || useNewVersion) {
                op.versionId = String(major + "." + minor + "." + patch)
            } else {
                const currentMajor = Number(op.versionId.split('.')[0])
                const currentMinor = Number(op.versionId.split('.')[1])
                const currentPatch = Number(op.versionId.split('.')[2])
                console.log(currentMajor, currentMinor, currentPatch, "   ", lastMajor, lastMinor, lastPatch)
                if (currentMajor < lastMajor || (currentMajor == lastMajor && currentMinor < lastMinor) || (currentMajor == lastMajor && currentMinor == lastMinor && currentPatch < lastPatch)) {
                    useNewVersion = true
                    op.versionId = String(major + "." + minor + "." + patch)
                }
                lastMajor = currentMajor
                lastMinor = currentMinor
                lastPatch = currentPatch

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
    //console.log('disabled' , disabledOperations)
    const versionIds = versionId.split('+')

    return (
        <main className={`view product-version sidebar ${!hash ? 'hidden' : 'visible'}` }>
            <div className='mergeData'>
                <div className='header'>
                    <a className='button green fill' title='Save merged models' onClick={() => setSave(true)}>
                        <img src={SaveIcon}/>
                    </a>
                    <a className='button red fill' title='Abbort merging and leave merger without saving' onClick={goBack}>
                        <img src={AbbortIcon}/>
                    </a>
                </div>
                <div className='main'>
                    <strong>Operations merging</strong>
                    <ol className='mergedOperations'>
                        {mergedOperations.map((op, i) => {
                            return <li key={i} className={(currentOperation==i ? 'selected' : '') + (disabledOperations.includes(op) ? ' disabled' : '')} onClick={() => onClick(i, op.getIds())}>
                                <div className='item'>
                                    <span className='operation type'>{op.type}</span> 
                                    <span className="version label" style={{backgroundColor: getVersionHSL(op.versionId,color, versions)}}>
                                        {op.versionId}
                                    </span>
                                    {dataUrl[i] ? <img className='preview image' src={dataUrl[i]}/> : "Version: " + op.versionId + " (id: " + op.operationId + ")"}
                                    {currentOperation == i && i > baseIndex && (
                                        <div className='buttons'>
                                            <a title='Move operation upwards' onClick={event => onMove(event, i,false)}>
                                                <img src={BackIcon} style={{transform:'rotate(90deg)'}}/>
                                            </a>
                                            <a title='Move operation downwards' onClick={event => onMove(event, i, true)}>
                                                <img src={BackIcon} style={{transform:'rotate(-90deg)'}}/>
                                            </a>
                                            <a title={disabledOperations.includes(op) ? 'Enable operation' : 'Disable operation'} onClick={() => onToggleOperation(disabledOperations.includes(op), op, i)}>
                                                {disabledOperations.includes(op) ? (
                                                    <img src={ShowIcon}/>
                                                ) : (
                                                    <img src={HideIcon}/>                                   
                                                )}
                                            </a>
                                        </div>
                                    )}
                                    {i <= baseIndex && (
                                        <div className='buttons' style={{marginLeft: '1em'}}>
                                            Unchangeable base operation
                                        </div>
                                    )}
                                </div>
                            </li>
                        })}
                    </ol>
                </div>
            </div>
            <div className='preview'>
                <ModelView3D model={mergedModel} update={update}/>
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
        </main>
    )
}