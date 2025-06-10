import * as React from 'react'
import { useContext } from 'react'
import { useParams } from 'react-router'

import shortid from 'shortid'
import { Box3, Group, Mesh, Object3D, Vector3, Material, LineSegments, MeshStandardMaterial, LineBasicMaterial, Intersection, Event, BoxHelper, Euler, GridHelper, BoxGeometry } from 'three'

import { CustomLDrawModel, parseCustomLDrawDelta, parseCustomLDrawModel, AbstractOperation, InsertOperation, SelectOperation, DeleteOperation, MoveOperation, RotateOperation, ColorOperation, updateGrid as updateGrid, updateBox, updateHelper, selectbyId } from 'productboard-ldraw'

import { LoadingView } from './Loading'
import { FileClient } from '../../clients/rest/file'
import { VersionClient } from '../../clients/rest/version'
import { UserContext } from '../../contexts/User'
import { VersionContext } from '../../contexts/Version'
import { COLOR_S, COLOR_X, COLOR_Y, COLOR_Z, createScene } from '../../functions/editor'
import { render } from '../../functions/render'
import { useVersion } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useVersions } from '../../hooks/list'
import { getMaterialColor, getMaterials, getObjectMaterialCode, LDRAW_LOADER, loadLDrawModel, MATERIAL_LOADING, parseLDrawModel } from '../../loaders/ldraw'
import { ModelGraph } from '../widgets/ModelGraph'
import { ModelView3D } from '../widgets/ModelView3D'
import { UserPictureWidget } from '../widgets/UserPicture'

import SaveIcon from '/src/images/save.png'
import CopyIcon from '/src/images/copy.png'
import DeleteIcon from '/src/images/delete_bucket.png'
import AbbortIcon from '/src/images/delete.png'
import BackIcon from '/src/images/back.png'
import JumpDownIcon from '/src/images/jump_down.png'
import JumpUpIcon from '/src/images/jump_up.png'
import BlankIcon from '/src/images/blank.png'
import PlusIcon from '/src/images/plus.png'
import MinusIcon from '/src/images/minus.png'
import ColorChangeIcon from '/src/images/color_change.png'
import MoveIcon from '/src/images/crosshair.png'
import RotateIcon from '/src/images/reopen.png'

const BLANK = new Image()
BLANK.src = BlankIcon

const BLOCKS:{group: string, items: string[]}[] = [
    {group: 'brick', items: ['3005', '3004', '3622', '3010', '3009', '3008', '6111', '6112', '2465', '3003', '3002', '3001', '2456', '3007', '3006', '2356', '6212', '4202', '4201', '4204', '30072']},
    {group: 'round', items: ['3062b', '6141', '6177', '3942b', '3943b', '4150']},
    {group: 'flat', items: ['3024', '3023b', '3021', '3020', '3070a', '3069b']}    
    ]
const GRIDLOCK = new Vector3(20, 8, 20)

const OPERATIONICONS: {[key: string]: "*.png"} = {'insert': PlusIcon, 'delete': MinusIcon, 'color change': ColorChangeIcon, 'move': MoveIcon, 'rotate': RotateIcon}

// TODO find better buttons at uxwing
//      Modify user widget with useuser hook so that it can load the image from the id

export const ProductVersionEditorView = () => {

    // HISTORY

    const { goBack } = useAsyncHistory()

    // PARAMS

    const { productId, versionId } = useParams<{ productId: string, versionId: string }>()

    // CONTEXTS

    const { setContextVersion } = useContext(VersionContext)
    const { contextUser } = useContext(UserContext)

    // HOOKS

    const versions = useVersions(productId)
    const version = versionId != 'new' && useVersion(productId, versionId)

    // REFS

    const viewRef = React.createRef<ModelView3D>()
    const inputRef = React.createRef<HTMLInputElement>()

    // STATES

    const [availableMaterials, setAvailableMaterials] = React.useState<Material[]>()
    const [selectedMaterial, setSelectedMaterial] = React.useState<Material>()

    const [model, setModel] = React.useState<Group>()
    const [manipulator, setManipulator] = React.useState<Group>()
    const [arrowX, setArrowX] = React.useState<Group>()
    const [arrowY, setArrowY] = React.useState<Group>()
    const [arrowZ, setArrowZ] = React.useState<Group>()
    const [arrowRotY, setArrowRotY] = React.useState<Group>()
    const [box, setBox] = React.useState<BoxHelper>()

    const [loaded, setLoaded] = React.useState<number>()
    const [total, setTotal] = React.useState<number>()

    const [selection, setSelection] = React.useState<{ part: Object3D, parts: Object3D[] }>() 

    const [copiedParts, setCopiedParts] = React.useState<Object3D[]>()

    const [operations, setOperations] = React.useState<AbstractOperation[]>([])
    const [operationIndex, setOperationIndex] = React.useState<number>()
    const [dataUrl, setDataUrl] = React.useState<string[]>([])

    const [gridHeight, setGridHeight] = React.useState<number>(0)

    const [isPartCreate, setIsPartCreate] = React.useState<boolean>()
    const [isPartInserted, setIsPartInserted] = React.useState<boolean>()

    const [offset] = React.useState<Vector3>(new Vector3(0, 0, 0))

    const [movement] = React.useState(new Vector3())

    const [rotationStart, setRotationStart] = React.useState<Vector3>()
    const [rotationAngle, setRotationAngle] = React.useState<number>()

    const [save, setSave] = React.useState<boolean>()
    const [description, setDescription] = React.useState<string>()
    const [number, setNumber] = React.useState<string>()

    const [showOperations, setShowOperations] = React.useState<boolean>(true)

    // EFFECTS

    // Load available materials and set initial selected material
    React.useEffect(() => {
        let exec = true
        getMaterials().then(materials => {
            if (exec) {
                setAvailableMaterials(materials)
                setSelectedMaterial(materials[10])
            }
        })
        return () => { exec = false }
    }, [])

    // Check if version refers to plain LDraw model, else go back
    React.useEffect(() => {
        if (version && version.modelType != 'ldr' && version.modelType != 'ldraw-model') {
            goBack()
        }
    }, [version])

    // Initialize 3D scene with grid and manipulators
    React.useEffect(() => {
        let exec = true
        let selectionPart: Object3D = undefined
        const selectionParts: Object3D[] = []

        if (versionId == 'new' || (version && (version.modelType == 'ldr' || version.modelType == 'ldraw-model'))) {
            const { model, manipulator, arrowX, arrowY, arrowZ, arrowRotY, box } = createScene()
            
            if (version) {
                if (version.modelType == 'ldr') {
                    // Load existing LDraw model
                    (async () => {
                        const group = await loadLDrawModel(`${versionId}.ldr`, (_part, loaded, total) => {
                            if (exec) {
                                setLoaded(loaded)
                                setTotal(total)
                                if (loaded > 0) {
                                    for (const child of group.children) {
                                        model.add(child)
                                    }
                                    updateEditorGrid(model)
                                }
                            }
                        })
                    })()
                } else if (version.modelType == 'ldraw-model') {
                    setLoaded(0)
                    setTotal(1)
                    const process = async () => {
                        const data = await FileClient.getFile(`${version.versionId}.ldraw-model`)
                        const text = new TextDecoder().decode(data)
                        const group = await parseCustomLDrawModel(LDRAW_LOADER, MATERIAL_LOADING, text)
                        if (exec) {
                            setLoaded(1)
                            for (const child of group.children) {
                                model.add(child.clone(true))
                            }
                            updateEditorGrid(model)
                        } 

                        const deltadata = await FileClient.getFile(`${version.versionId}.ldraw-delta`)
                        const deltatext = new TextDecoder().decode(deltadata)
                        const ops = await parseCustomLDrawDelta(deltatext)
                        console.log(ops)

                        /*const screenshotModel = model.clone()
                        screenshotModel.remove(...screenshotModel.children.filter(child => child.name.endsWith('.dat')))
                        for (const operation of ops) {
                            await operation.redo(screenshotModel, LDRAW_LOADER)
                            const renderModel = await renderPreperation(operation, screenshotModel.clone())
                            await render(renderModel,150,150).then(result => {
                                dataUrl.push(result.dataUrl)
                            })
                        }*/
                        setOperations(ops)
                        setOperationIndex(ops.length-1)
                        
                        // reselect the selected parts
                        for ( let index = ops.length - 1; index >= 0; index--) {
                            if (ops[index].type == "select") {
                                const selectOp = ops[index] as SelectOperation
                                await selectOp.redo(model)
                                if (selectOp.after.length > 0) {
                                    selectionParts.push(...model.children.filter(child => selectOp.after.includes(child.userData['id'])))
                                    selectionPart = selectionParts[0]
                                    console.log("SELECT\n",selectionPart,selectionParts)
                                }
                                break
                            } else if (ops[index].type == "insert") {
                                const insertOp = ops[index] as InsertOperation
                                selectbyId(model, insertOp.id)
                                updateHelper(model, insertOp.id, model.children.find(child => child.userData['id'] == insertOp.id[0]).position)
                                updateGridHeight()
                                if (insertOp.id.length > 0) {
                                    selectionParts.push(...model.children.filter(child => insertOp.id.includes(child.userData['id'])))
                                    selectionPart = selectionParts[0]
                                }
                                manipulator.visible = true
                                break
                            } else if (ops[index].type == "delete") {
                                // nothing is selected after a delete operation
                                break
                            }
                        }
                        setSelection({part: selectionPart, parts: selectionParts})
                        selectionPart && selectionPart.traverse(object => {
                            if (object instanceof Mesh) {
                                if (object.material instanceof MeshStandardMaterial) {
                                    setSelectedMaterial(object.material)
                                } else {
                                    throw 'Material type not supported'
                                }
                            }
                        })
                        
                        /*const select = ops.reverse().find(op => op.type == 'select') as SelectOperation
                        console.log(select)
                        selectionParts.push(...model.children.filter(child => select.after.includes(child.userData['id'])))
                        selectionPart = selectionParts[0]*/
                    }
                    process()
                }
            }
            setModel(model)

            setManipulator(manipulator)
            setArrowX(arrowX)
            setArrowY(arrowY)
            setArrowZ(arrowZ)
            setArrowRotY(arrowRotY)

            setBox(box)

            setSelection({ part: selectionPart, parts: selectionParts })

            setCopiedParts([])

            offset.x = 0
            offset.y = 0
            offset.z = 0

            setRotationStart(undefined)
            setRotationAngle(undefined)

            setSave(false)
            setDescription('')
            setNumber('patch')
        }

        return () => { exec = false }
    }, [versionId, version])

    React.useEffect(() => {
        model && updateEditorGrid()
    }, [model])

    React.useEffect(() => {
        inputRef.current && inputRef.current.focus()
    }, [inputRef])

    React.useEffect(() => {
       updateGridHeight()
    }, [gridHeight])

    React.useEffect(() => {
        if (dataUrl.length > 0) {
            return
        }
        if (model && availableMaterials && operations.length > 0) {
            (async() => {
                const screenshotModel = createScene().model
                const urls: string[] = []
                //screenshotModel.remove(...screenshotModel.children.filter(child => child.name.endsWith('.dat')))
                for (const operation of operations) {
                    await operation.redo(screenshotModel, LDRAW_LOADER)
                    const renderModel = await renderPreperation(operation, screenshotModel.clone())
                    await render(renderModel,150,150).then(result => {
                        urls.push(result.dataUrl)
                    })
                }
                setDataUrl(urls)
            })()
        }
    },[model, operations, availableMaterials])

    // FUNCTIONS

    // Update

    function updateOffset() {
        // Calculate bounding box
        const bbox = new Box3()
        if (selection.part) {
           bbox.setFromObject(selection.part)
        } else {
            for (const element of selection.parts) {
                bbox.expandByObject(element,true)
            }
        }

        // Calculate offset vector
        bbox.getSize(offset)

        offset.x = Math.round(100 * (offset.x % 40) / 2) / 100
        offset.z = Math.round(100 * (offset.z % 40) / 2) / 100
        offset.y = Math.round(100 * (offset.y - 4 + ((offset.y - 4) % 8) / 2)) / 100
    }

    function updateEditorGrid(updatingModel: Group = model) {
        updateGrid(updatingModel)
        updateGridHeight(updatingModel)
    }

    function updateGridHeight(updatingModel: Group = model, height = gridHeight) {
         if (updatingModel != undefined) {
            const grid = updatingModel.children.find(child => child instanceof GridHelper)
            grid.position.y = - height * GRIDLOCK.y
        }
    }

    // Move

    function moveBy(x: number, y: number, z: number) {
        for (const part of selection.parts) {
            part.position.set(part.position.x + x, part.position.y + y, part.position.z + z)
        }
        manipulator.position.set(manipulator.position.x + x, manipulator.position.y + y, manipulator.position.z + z)

        // Remember relative movement
        movement.set(movement.x + x, movement.y + y, movement.z + z)
    }

    function moveTo(x: number, y: number, z: number) {
        for (const part of selection.parts) {
            part.position.set(x, y, z)
        }
        manipulator.position.set(x, y, z)
    }

    function moveByAxis(axis: string, pos: Vector3) {
        if (selection.parts.length > 0) {
            const position = manipulator.position
            switch (axis) {
                case "x": {
                    const xcoord = Math.round(pos.x / GRIDLOCK.x) * GRIDLOCK.x - position.x + position.x % GRIDLOCK.x
                    moveBy(xcoord, 0, 0)
                    break
                }
                case "y": {
                    const ycoord = Math.round(-pos.y / GRIDLOCK.y) * GRIDLOCK.y - position.y
                    moveBy(0, ycoord, 0)
                    break
                }
                case "z": {
                    const zcoord = Math.round(-pos.z / GRIDLOCK.z) * GRIDLOCK.z - position.z + position.z % GRIDLOCK.z
                    moveBy(0, 0, zcoord)
                    break
                }
                case "rotation y": {
                    if (!rotationStart) {
                        return
                    }

                    const vecA = new Vector3(rotationStart.x, -rotationStart.y, -rotationStart.z)
                    const vecB = new Vector3(pos.x, -pos.y, -pos.z)

                    vecA.sub(manipulator.position)
                    vecB.sub(manipulator.position)

                    let angle = -Math.round(vecA.angleTo(vecB) * 8 / Math.PI) * Math.PI / 8

                    if (vecA.cross(vecB).y > 0) {
                        angle *= -1 
                    }

                    if (angle != rotationAngle) {
                        angle -= rotationAngle
                        for (const element of selection.parts) {
                            const rotationVec = element.position.clone()
                            element.position.sub(rotationVec.sub(manipulator.position))
                            element.position.add(rotationVec.applyAxisAngle(new Vector3(0, 1, 0), angle))
                            element.rotateY(angle)
                        }
                        setRotationAngle(rotationAngle + angle)
                        console.log(angle)
                    }
                }
            }
        }
    }

    // Part drag & drop

    // Define selected parts and start moving
    function onPartDragStart(part: Object3D) {
        //console.log('onPartDragStart', part, pos)

        // Update create state
        setIsPartCreate(false)
        setIsPartInserted(true)

        // Update selection
        if (selection.parts.indexOf(part) == -1) {
            const idsbefore= []
            for (const part of selection.parts) {
                idsbefore.push(part.userData['id'])
            }
            unselect()

            selection.parts.push(part)

            // Update material
            part.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material = object.material.clone()
                        object.material.emissive.setScalar(0.1)
                    } else {
                        throw 'Material type not supported'
                    }
                }
            })
            if (idsbefore.length != 1 || idsbefore[0] != part.userData['id']) {
                addOperations([new SelectOperation(shortid(), contextUser.userId, null, Date.now(),[part.userData['id']], idsbefore)])
            }
        }

        selection.part = part

        // Remember material
        part.traverse(object => {
            if (object instanceof Mesh) {
                if (object.material instanceof MeshStandardMaterial) {
                    setSelectedMaterial(object.material)
                } else {
                    throw 'Material type not supported'
                }
            }
        })

        // Update bounding box
        updateBox(selection, box)
        
        // Calculate Offset
        updateOffset()

        // Remember relative movement
        movement.set(0, 0, 0)

        /* x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x
        const y = 0
        const z = Math.round((-pos.z + offset.z) / 20) * 20 - offset.z

        moveBy(x, y, z)*/
        
        // Move manipulator to dreged part
        manipulator.position.set(part.position.x, part.position.y, part.position.z)
        manipulator.visible = true

        updateEditorGrid()
    }

    // Move selected parts
    function onPartDrag(pos: Vector3) {
        //console.log('onPartDrag', pos)

        if (selection.parts.length > 0) {
            const x = Math.round((pos.x - offset.x) / GRIDLOCK.x) * GRIDLOCK.x + offset.x - selection.part.position.x
            const y = 0
            const z = Math.round((-pos.z - offset.z) / GRIDLOCK.z) * GRIDLOCK.z + offset.z - selection.part.position.z

            moveBy(x, y, z)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    // Move selected parts
    function onPartDrop(pos: Vector3) {
        //console.log('onPartDrop', pos)

        if (selection.parts.length > 0) {
            const x = Math.round((pos.x - offset.x) / GRIDLOCK.x) * GRIDLOCK.x + offset.x - selection.part.position.x
            const y = 0
            const z = Math.round((-pos.z - offset.z) / GRIDLOCK.z) * GRIDLOCK.z + offset.z - selection.part.position.z

            moveBy(x, y, z)

            updateEditorGrid()

            updateBox(selection, box)

            movement.length() != 0 && addOperations([new MoveOperation(shortid(), contextUser.userId, null, Date.now(), selection.parts.map(part => part.userData['id']), movement.clone())])
        }
    }

    // Remove new parts and move existing parts to their original location
    function onPartDragLeave() {
        //console.log('onPartDragLeave')
    }

    // New part drag & drop

    // Load part in the background
    function onNewPartDragStart(event: React.DragEvent, file: string) {
        //console.log('onDragStart', file)
        const idsBefore = []
        for (const element of selection.parts) {
            idsBefore.push(element.userData['id'])
        }

        idsBefore.length != 0 &&addOperations([new SelectOperation(shortid(), contextUser.userId, null, Date.now(),[], idsBefore)])
        unselect()

        event.dataTransfer.setDragImage(BLANK, 0, 0)
        
        parseLDrawModel(file, `1 ${selectedMaterial.userData.code} 0 0 0 1 0 0 0 1 0 0 0 1 ${file}`, null, false).then(part => {
            part.children[0].userData['id'] = shortid()

            // Add to selected parts
            selection.parts.push(part.children[0])
            // Set as selected part
            selection.part = part.children[0]
            
            // Calculate offset
            updateOffset()

            // Update part material
            part.children[0].traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material = object.material.clone()
                        object.material.emissive.setScalar(0.1)
                    } else {
                        throw 'Material type not supported'
                    }
                }
            })
        })
        
        setIsPartCreate(true)
        setIsPartInserted(false)
    }

    // Insert loaded part into scene and move part around the scene
    function onNewPartDragEnter(pos: Vector3) {
        //console.log('onDragEnter', pos)

        if (selection.parts.length > 0 && isPartCreate) {
            // Insert loaded part into scene
            if (isPartCreate && !isPartInserted) {
                for (const part of selection.parts) {
                    model.add(part)
                }
                setIsPartInserted(true)
                manipulator.visible = true
            }

            // Move part around the scene
            const x = Math.round((pos.x - offset.x) / GRIDLOCK.x) * GRIDLOCK.x + offset.x
            const y = -gridHeight * GRIDLOCK.y - offset.y//Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / GRIDLOCK.z) * GRIDLOCK.z - offset.z

            moveTo(x, y, z)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    // Insert loaded part into scene and move part around the scene
    function onNewPartDrag(pos: Vector3) {
        //console.log('onDrag', pos)

        if (selection.parts.length > 0 && isPartCreate) {
            // Insert loaded part into scene
            if (isPartCreate && !isPartInserted) {
                for (const part of selection.parts) {
                    model.add(part)
                }
                setIsPartInserted(true)
                manipulator.visible = true
            }

            // Move part around the scene
            const x = Math.round((pos.x - offset.x) / GRIDLOCK.x) * GRIDLOCK.x + offset.x
            const y = -gridHeight * GRIDLOCK.y - offset.y//Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / GRIDLOCK.z) * GRIDLOCK.z - offset.z

            moveTo(x, y, z)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    // Move loaded part to it's final position and stop moving
    function onNewPartDrop(pos: Vector3) {
        //console.log('onDrop', pos)

        if (selection.parts.length > 0 && isPartCreate) {
            // Insert loaded part into scene
            if (isPartCreate && !isPartInserted) {
                for (const part of selection.parts) {
                    model.add(part)
                }
                setIsPartInserted(true)
            }

            // Move part around the scene
            const x = Math.round((pos.x - offset.x) / GRIDLOCK.x) * GRIDLOCK.x + offset.x
            const y = -gridHeight * GRIDLOCK.y -offset.y//Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / GRIDLOCK.z) * GRIDLOCK.z - offset.z

            moveTo(x, y, z)

            updateEditorGrid()

            updateBox(selection, box)

            setIsPartCreate(false)

            // Update operations
            const ops: AbstractOperation[] = []
            for (const part of selection.parts) {
                ops.push(new InsertOperation(shortid(), contextUser.userId, null, Date.now(), [part.userData['id']], [part.name], [getObjectMaterialCode(part)], [new Vector3(x, y, z)], [new Euler(0, 0, 0)]))
            }
            addOperations(ops)

            // Update focus
            viewRef.current.focus()
        }
    }

    // Axis

    function onAxisDragStart(pos: Vector3, axis: string) {
        //console.log('onMoveOnAxisStart', object, pos)

        if (selection.parts.length > 0) {
            movement.set(0, 0, 0)

            moveByAxis(axis, pos)

            setRotationAngle(0)
            setRotationStart(pos)

            setIsPartCreate(false)
            setIsPartInserted(true)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    function onAxisDrag(pos: Vector3, axis: string) {
        //console.log('onMoveOnAxisContinue', pos, axisName)

        if (selection.parts.length > 0) {
            moveByAxis(axis, pos)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    function onAxisDrop(pos: Vector3, axis: string) {
        //console.log('onMoveOnAxisDrop', pos, axisName)

        if (selection.parts.length > 0) {
            moveByAxis(axis, pos)

            if (axis == 'rotation y') {
                rotationAngle != 0 && addOperations([new RotateOperation(shortid(), contextUser.userId, null, Date.now(), selection.parts.map(part => part.userData['id']), selection.part && selection.part.userData['id'], rotationAngle)])
            } else {
                movement.length() != 0 && addOperations([new MoveOperation(shortid(), contextUser.userId, null, Date.now(), selection.parts.map(part => part.userData['id']), movement.clone())])
            }
    
            setRotationStart(undefined)
            setRotationAngle(undefined)

            updateEditorGrid()

            updateBox(selection, box)
        }
    }

    // Mouse

    function onMouseOver(part: Object3D) {
        //console.log('onMouseOver', part)

        // Check manipulator objects
        if (part == arrowX || part == arrowY || part == arrowZ || part == arrowRotY) {
            // Update mesh color
            part.traverse(object => {
                if (object instanceof Mesh) {
                    object.material.color.set(COLOR_S)
                }
            })
        }
    }

    function onMouseOut(part: Object3D) {
        //console.log('onMouseOut', part)

        // Object mesh color
        if (part == arrowX || part == arrowY || part == arrowZ || part == arrowRotY) {
            part.traverse(object => {
                if(object instanceof Mesh) {
                    if (part == arrowX) {
                        object.material.color.set(COLOR_X)
                    } else if (part == arrowY) {
                        object.material.color.set(COLOR_Y)
                    } else if (part == arrowZ) {
                        object.material.color.set(COLOR_Z)
                    } else if (part == arrowRotY) {
                        object.material.color.set(COLOR_Y)
                    }
                }
            })
        }
    }

    function onClick(part: Object3D, _intersections: Intersection<Object3D<Event>>[], isCtrlPressed: boolean) {
        //console.log('onClick', part, isCtrlPressed)

        const IDsBeforeSelection : string[] = []
            for (const part of selection.parts) {
                IDsBeforeSelection.push(part.userData['id'])
        }

        // Unselect all parts
        if (!isCtrlPressed) {
            unselect()
        }

        // Check click target
        if (part != null) {
            // Branch 1: Click target is 3D object
            
            // Check click target is part
            if (part.name.endsWith(".dat")) {
                // Compute index of selected part and update part material
                const index = selection.parts.indexOf(part)
                if (index == -1) {
                    // Branch 1: Add part to selection
                    selection.parts.push(part)
    
                    // Update selection
                    selection.part = part

                    // Update offset
                    updateOffset()

                    // Update part material
                    part.traverse(object => {
                        if (object instanceof Mesh) {
                            // Update part material
                            if (object.material instanceof MeshStandardMaterial) {
                                object.material = object.material.clone()
                                object.material.emissive.setScalar(0.1)
                            } else {
                                throw 'Material type not supported'
                            }
                            // Update selected material
                            setSelectedMaterial(object.material)
                        }
                    })

                    // Update manipulator
                    manipulator.position.set(part.position.x, part.position.y, part.position.z)
                    manipulator.visible = true
                } else {
                    // Branch 2: Remove part from selection
                    selection.parts.splice(index, 1)

                    // Update selection
                    selection.part = selection.parts.length == 1 ? selection.parts[0] : undefined

                    // Update offset
                    updateOffset()

                    // Reset part material
                    part.traverse(object => {
                        if (object instanceof Mesh) {
                            if (object.material instanceof MeshStandardMaterial) {
                                object.material.emissive.setScalar(0)
                            }
                        }
                    })

                    // Update manipulator
                    if (selection.parts.length > 1) {
                        // Compute bounding box around selected parts
                        const box  = new Box3()
                        for (const element of selection.parts) {
                            box.expandByObject(element, true)
                        }
            
                        // Get center of bounding box
                        const center = box.getCenter(new Vector3())
            
                        // Move manipulator to center of bounding box
                        manipulator.position.set(center.x, 4 - box.max.y, 0 - center.z)
                    } else if (selection.parts.length == 1) {
                        // Move manipulator to origin of brick
                        manipulator.position.set(selection.part.position.x, selection.part.position.y, selection.part.position.z)
                    } else {
                        // Hide manipulator
                        manipulator.visible = false
                    }
                }
            }
        } else if (isCtrlPressed) {
            // Branch 2: Click target is background

            // Disable specific part selection
            selection.part = undefined

            // Compute bounding box around selected parts
            const box  = new Box3()
            for (const element of selection.parts) {
                box.expandByObject(element, true)
            }

            // Get center of bounding box
            const center = box.getCenter(new Vector3())

            // Move manipulator to center of bounding box
            manipulator.position.set(center.x, 4 - box.max.y, -center.z)
        }

        const IDsAfterSelection : string[] = []
        for(const part of selection.parts){
            IDsAfterSelection.push(part.userData['id'])
        }
        
        if((part != null || !isCtrlPressed) && (IDsBeforeSelection.length > 0 || IDsAfterSelection.length > 0) && (IDsBeforeSelection.length != IDsAfterSelection.length || IDsAfterSelection[0] != IDsBeforeSelection[0])){
            addOperations([new SelectOperation(shortid(), contextUser.userId, null, Date.now(), IDsAfterSelection, IDsBeforeSelection)])
        }
        updateBox(selection, box)
    }

    // Keyboard

    function onKeyDown(key: React.KeyboardEvent) {
        //console.log('onKeyDown', key.key)

        if (key.key == "Delete") {
            deleteParts()
        } else if (key.ctrlKey && key.key == "c") {
            copy()
        } else if (key.ctrlKey && key.key == "v") {
            paste()
        }
    }

    // Operation management

    async function updateOperations(undo:boolean) {
        //undo: true --> undo is used, false --> redo is used
        if(undo) {
            if (operationIndex >= 0) {
                await operations[operationIndex].undo(model,LDRAW_LOADER)
                let index = operationIndex - 1
                for (index ;index >= 0 && operations[index].type == 'select'; index--) {
                    await operations[index].undo(model, LDRAW_LOADER)
                    //console.log("local index", index)
                }
                //console.log("stored index", index)
                setOperationIndex(index)
                updateStates()
            }
            //operationIndex != undefined ? setOperationIndex(operationIndex-1) : setOperationIndex(-1)
        } else {
            if (operationIndex != undefined && operationIndex < operations.length - 1) {
                await operations[operationIndex + 1].redo(model, LDRAW_LOADER)
                let index = operationIndex + 1
                console.log(operations, index, operationIndex)
                for (index; index < operations.length && operations[index].type == 'select'; index++) {
                    await operations[index + 1].redo(model, LDRAW_LOADER)
                }
                setOperationIndex(index)
                updateStates()
                //setOperationIndex(operationIndex+1)
            } /*else {
                setOperationIndex(0)
                console.log("ERROR")
            }*/
        }
    }

    function updateStates() {
        // clear selection
        const selectParts: Object3D[] = []
        let selectPart: Object3D = undefined

        // update selection
        for (const part of model.children.filter(child => child.name.endsWith('.dat'))) {
            // Adding selectedd parts to the selection.parts array
            part.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        if (object.material.emissive.r == 0.1) {
                            selectParts.push(part)
                        }
                    } else {
                        throw 'Material type not supported'
                    }
                }
            })
            // Sets the selected part
            if (part.position.equals(manipulator.position) && manipulator.visible) {
                selectPart = part
            }
        }
        setSelection({part: selectPart, parts: selectParts})
        updateGridHeight()
    }

    async function addOperations(newOperations: AbstractOperation[]) {
        if (operations.length-1 > operationIndex || (operationIndex == undefined && operations.length > 0)) {
            operations.splice(operationIndex + 1)
            dataUrl.splice(operationIndex + 1)
        }
        let newIndex: number
        if (operationIndex != undefined) {
            newIndex = operationIndex + newOperations.length
        } else {
            newIndex = newOperations.length - 1
        }
        //console.log("rendering operations",newOperations)
        for (const ops of newOperations) {
            const renderModel = await renderPreperation(ops)
            await render(renderModel, 150, 150).then(result => {
                dataUrl.push(result.dataUrl)
            }) 
        }
        //console.log("operation saving", newOperations)
        operations.push(...newOperations)
        //setOperations([...operations, ...newOperations])
        console.log(newOperations, operationIndex, newIndex)
        setOperationIndex(newIndex)
    }

    async function onSelectedOperation(_event: React.MouseEvent,index: number) {
        //console.log(event, index)
        if (operationIndex > index) {
            for (let i = operationIndex; i > index; i--) {
                //console.log(operations[i], i, operationIndex)
                await operations[i].undo(model, LDRAW_LOADER)        
                //updateOperations(true)       
            }
        } else if (operationIndex < index) {
            for (let i = operationIndex+1; i <= index; i++) {
                //console.log(operations[i], i, operationIndex)
                await operations[i].redo(model, LDRAW_LOADER)
                //updateOperations(false)
            }
        }
        setOperationIndex(index)
        updateStates()
    }

    // Other

    function onColorChanged(event: React.MouseEvent, material: Material) {
        //console.log('onColorChanged', material)

        event.stopPropagation()

        // Remember material
        setSelectedMaterial(material)

        if (selection.parts.length == 0) {
            return
        }

        const oldMaterial : string[] = []
        const id : string[] = []

        // Change material of selected parts
        for (const part of selection.parts) {
            oldMaterial.push(getObjectMaterialCode(part))
            id.push(part.userData["id"])
            part.traverse(object => {
                if (object instanceof Mesh) {
                    object.material = material.clone()
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material.emissive.setScalar(0.1)
                    } else {
                        throw 'Material type not supported'
                    }
                } else if (object instanceof LineSegments) {
                    if (object.material instanceof LineBasicMaterial) {
                        object.material = material.userData.edgeMaterial
                    }
                }
            })  
        }
        console.log("color change: ", oldMaterial, material.userData.code)
        if (!oldMaterial.every(color => color == material.userData.code)) {
            console.log("Duplicate")
            addOperations([new ColorOperation(shortid(), contextUser.userId, null, Date.now(), id, oldMaterial, material.userData.code)])

        }
    }

    async function onSave() {
        unselect()

        const baseVersionIds =  versionId != 'new' ? [versionId] : []
        
        const relative = versionId != 'new' ? version : (versions.length > 0 ? versions[versions.length - 1] : null)
        
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

        /*
        let ldrawModel = ''

        for (const child of model.children) {
            if (child.name && child.name.endsWith('.dat')) {
                const color = getObjectMaterialCode(child)

                const x = child.position.x
                const y = child.position.y
                const z = child.position.z

                const a = child.matrix.elements[0]
                const b = child.matrix.elements[1]
                const c = -child.matrix.elements[2]
                const d = child.matrix.elements[4]
                const e = child.matrix.elements[5]
                const f = child.matrix.elements[6]
                const g = -child.matrix.elements[8]
                const h = child.matrix.elements[9]
                const i = child.matrix.elements[10]

                const file = child.name

                ldrawModel += `0 ID ${child.userData['id']}\n`
                ldrawModel += `1 ${color} ${x} ${y} ${z} ${a} ${b} ${c} ${d} ${e} ${f} ${g} ${h} ${i} ${file}\n`
            }
        }

        //console.log(ldraw)
        */

        const ldrawModel: CustomLDrawModel = model.children.filter(child => child.name && child.name.endsWith('.dat')).map(child => {
            return {
                id: child.userData['id'],
                name: child.name,
                color: getObjectMaterialCode(child),
                position: child.position,
                orientation: child.matrix.makeRotationY(-child.rotation.y).elements
            }
        })

        const ldrawDelta: AbstractOperation[] = []
        for (let index = 0; index <= operationIndex; index++) {
            if (operations[index].versionId == null) {
                operations[index].versionId = String(major + "." + minor + "." + patch)
            }
            ldrawDelta.push(operations[index])
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

    // Util

    function unselect() {
        while (selection.parts.length > 0) {
            selection.parts.pop().traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material.emissive.setScalar(0)
                    }
                }
            })        
        }
        selection.part = undefined
        manipulator.visible = false
    }

    function copy() {
        if (selection.parts.length == 0) {
            return
        }
        copiedParts.length = 0

        for (const obj of selection.parts) {
            const part = obj.clone()
            part.userData['id'] = shortid()
            copiedParts.push(part)
        }
    }

    function paste() {
        if (copiedParts.length == 0) {
            return
        }

        const selectedBefore: string[] = []
        for (const part of selection.parts) {
            selectedBefore.push(part.userData['id'])
        }

        unselect()
        const unselectOp = new SelectOperation(shortid(), contextUser.userId, null, Date.now(), [], selectedBefore)

        const id = []
        const part = []
        const color = []
        const position = []
        const  rotation = []

        for (const obj of copiedParts) {
            const copy = obj.clone()
            model.add(copy)
            selection.parts.push(copy)
            id.push(copy.userData['id'])
            part.push(copy.name)
            color.push(getObjectMaterialCode(copy))
            position.push(copy.position)
            rotation.push(copy.rotation)
            copy.traverse(object => {
                if (object instanceof Mesh) {
                    // Update part material
                    if (object.material instanceof MeshStandardMaterial) {
                        object.material = object.material.clone()
                        object.material.emissive.setScalar(0.1)
                    } else {
                        throw 'Material type not supported'
                    }
                }
            })
            obj.userData['id'] = shortid()
        }
        selection.part = selection.parts[selection.parts.length-1]
        selection.part.traverse(object => {object instanceof Mesh ? setSelectedMaterial(object.material) : null})

        manipulator.position.set(selection.part.position.x,selection.part.position.y, selection.part.position.z)
        manipulator.visible = true

        updateBox(selection, box)

        addOperations([unselectOp, new InsertOperation(shortid(), contextUser.userId, null, Date.now(), id, part, color, position, rotation)])
    }

    function deleteParts() {
        if (selection.parts.length == 0) {
            return
        }

        const id = []
        const partName = []
        const color = []
        const position = []
        const rotation = []
        let didDelete = false

        while (selection.parts.length > 0) {
            const part = selection.parts.pop()
            model.remove(part)
            id.push(part.userData['id'])
            partName.push(part.name)
            color.push(getObjectMaterialCode(part))
            position.push(part.position)
            rotation.push(part.rotation)
            didDelete = true
        }
        
        selection.part = undefined

        manipulator.visible = false

        updateEditorGrid()

        updateBox(selection, box)

        didDelete && addOperations([new DeleteOperation(shortid(), contextUser.userId, null, Date.now(), id, partName, color, position, rotation)])
    }

    async function renderPreperation(currentOperation: AbstractOperation = operations[operations.length - 1],renderModel: Group = model.clone()) {
        renderModel.remove(...renderModel.children.filter(child => !child.name.endsWith('.dat')))
        
        //console.log("Render Preperations", currentOperation)
        let brickMaterial: Material
        const transparentMaterial = availableMaterials.find(mat => mat.name == ' Trans_Clear')
        const coloredParts = currentOperation.getIds()
        if (currentOperation instanceof InsertOperation) {
            // color new parts green
            brickMaterial = availableMaterials.find(mat => mat.name == ' Green')
        } else if (currentOperation instanceof DeleteOperation) {
            // undo operation and color those parts red
            brickMaterial = availableMaterials.find(mat => mat.name == ' Red')

            const box = new BoxHelper(new Mesh(new BoxGeometry()))
            box.name = 'box'
            renderModel.add(box)

            //console.log("model", renderModel)
            await currentOperation.undo(renderModel, LDRAW_LOADER)
            renderModel.remove(...renderModel.children.filter(child => !child.name.endsWith('.dat')))
        } else if (currentOperation instanceof SelectOperation) {
            brickMaterial = availableMaterials.find(mat => mat.name == ' Yellow')
        } else {
            // color affected parts blue
            brickMaterial = availableMaterials.find(mat => mat.name == ' Blue')
        }
        for (const child of renderModel.children) {
            const isColorPart = coloredParts.includes(child.userData['id'])
            child.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        if (isColorPart) {
                            object.material = brickMaterial
                        } else {
                            object.material = transparentMaterial.clone()
                            object.material.emissive.setScalar(0.1)
                        }               
                    } else {
                        throw 'Material type not supported'
                    }
                } else if (object instanceof LineSegments) {
                    if (object.material instanceof LineBasicMaterial) {
                        if (isColorPart) {
                            object.material = brickMaterial.userData.edgeMaterial
                        } else {
                            object.material = transparentMaterial.userData.edgeMaterial
                        }
                       
                    }
                }
            })
        }
        return renderModel
    }

    function jumpGrid(up: boolean) {
        // up = true: move on top up = false: move to the lowest part
        let usedPart: Object3D
        let height: number
        let partList: Object3D[]

        // use selected parts if some items are selected otherwise use all parts of the model
        if (selection.parts.length > 0) {
            partList = selection.parts
        } else {
            partList = model.children.filter(child => child.name.endsWith('.dat'))
        }

        for (const part of partList) {
            if (!height) {
                height = part.position.y
                usedPart = part
            } else if (up && part.position.y < height) {
                // jump up and a higher located part is found
                height = part.position.y
                usedPart = part
            } else if (!up && part.position.y > height) {
                // jump down and a lower located part is found
                height = part.position.y
                usedPart = part
            }
        }
        //calculate height for compensation
        const bbox = new Box3()
        const dimensions = new Vector3
        bbox.setFromObject(usedPart)
        bbox.getSize(dimensions)

        //console.log("Grid",height, gridHeight)
        //updateGridHeight(model, gridHeight)
        setGridHeight(-height/GRIDLOCK.y - (dimensions.y-4)/GRIDLOCK.y)
    }

    //console.log(operations, operationIndex,  model)
    //console.log(operations.length,dataUrl ? dataUrl.length : 'undef', operations)
    //console.log(model && manipulator, model && model.clone().children.filter(obj => (obj.name == manipulator.name || obj.name == box.name)))

    return (
        versionId == 'new' || (version && (version.modelType == 'ldr' || version.modelType == 'ldraw-model')) ? (
            <main className={`view product-version-editor`}>
                <div className='editor'>
                    <div className='model'>
                        {model && (
                            <ModelView3D ref={viewRef} model={model} update={loaded} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onClick={onClick} onKeyDown={onKeyDown} onPartDragStart={onPartDragStart} onPartDrag={onPartDrag} onPartDrop={onPartDrop} onPartDropLeave={onPartDragLeave} onAxisDragStart={onAxisDragStart} onAxisDrag={onAxisDrag} onAxisDrop={onAxisDrop} onNewPartDrop={onNewPartDrop} onNewPartDrag={onNewPartDrag} onNewPartDragEnter={onNewPartDragEnter} onNewPartDragLeave={onPartDragLeave}/>
                        )}
                        {loaded != total && (
                            <div className='progress'>
                                <div className='bar' style={{width: `${Math.floor(loaded / total * 100)}%`}}></div>
                                <div className='text'>{loaded} / {total}</div>
                            </div>
                        )}
                    </div>
                    <div className='buttons' onWheel={e => {e.currentTarget.scrollLeft += e.deltaY}}>
                        <button className='button fill green' title='Save model' onClick={() => setSave(true)}>
                            <img src={SaveIcon}/>
                        </button>
                        <button className='button fill red' title='Abbort editing and leave editor without saving' onClick={() => goBack()}>
                            <img src={AbbortIcon}/>
                        </button>
                        <button className='button fill gray' title='Undo current operation' onClick={() => {
                            /*if (operationIndex != -1 && operationIndex != undefined) {
                                operations[operationIndex].undo(model, LDRAW_LOADER).then(()=>{
                                    updateOperations(true)
                                    updateStates()
                                })
                            }*/
                            updateOperations(true)
                        }}>
                            <img src={BackIcon}/>
                        </button>
                        <button className='button fill gray' title='Redo following operation (if possible)' onClick={() => {
                            /*if (operations.length > 0 && operationIndex == -1) {
                                operations[0].redo(model, LDRAW_LOADER).then(()=>{
                                    updateOperations(false)
                                    updateStates() 
                                })
                            } else if (operations.length - 1 > operationIndex) {
                                operations[operationIndex+1].redo(model, LDRAW_LOADER).then(()=>{
                                    updateOperations(false)
                                    updateStates()
                                })  
                            }*/
                            updateOperations(false)
                        }}>
                            <img src={BackIcon} style={{transform:'rotate(180deg)'}}/>
                        </button>
                        <button className='button fill blue' onClick={() => {
                            copy()
                            paste()
                        }}>
                            <img src={CopyIcon}/>
                        </button>
                        <button className='button fill red' title='Delete selected Parts' onClick={deleteParts}>
                            <img src={DeleteIcon}/>
                        </button>
                        {/*<label>
                            Insertion height:
                            <input type='number' value={gridHeight} min={-99} max={99} onChange={event => {
                                const number = Number(event.currentTarget.value)
                                if(number > -100 && number < 100) {
                                    setGridHeight(number)
                                }
                            }}/>
                        </label>*/}
                        <span>Insertion level:</span>
                        <button className='button fill white' title='Move grid upwards' onClick={() => {
                            setGridHeight(gridHeight + 1)
                            //updateGridHeight(model, gridHeight + 1)
                        }}>
                            <img src={BackIcon} style={{transform:'rotate(90deg)'}}/>
                        </button>
                        <button className='button fill white' title='Move grid downwards' onClick={() => {
                            setGridHeight(gridHeight - 1)
                            //updateGridHeight(model, gridHeight - 1)
                        }}>
                            <img src={BackIcon} style={{transform:'rotate(-90deg)'}}/>
                        </button>
                        <button className='button fill white' title='Move grid to the highest located brick of selected parts or model' onClick={() => jumpGrid(true)}>
                            <img src={JumpUpIcon}/>
                        </button>
                        <button className='button fill white' title='Move grid to the lowest located brick of selected parts or model' onClick={() => jumpGrid(false)}>
                            <img src={JumpDownIcon}/>
                        </button>
                    </div>
                    <div className="palette">
                        <div className='palette tabs'>
                            <a>
                                <span>Parts</span>
                            </a>
                        </div>
                        <div className="parts">
                            {BLOCKS.map(bricklist => (
                                <div className={bricklist.group} key={bricklist.group}>
                                    <span className='title'>{bricklist.group}</span>
                                    {bricklist.items.map(block => (
                                        <img key={block} src={`/rest/parts/${block}.png`} className={selection && selection.part && selection.part.name.split('.')[0] == block ? 'selected' : ''} onDragStart={event => onNewPartDragStart(event, `${block}.dat`)}/>
                                    ))}
                                </div>
                            ))}
                            {/*<div className='brick'>
                                <span className='title'>Brick</span>
                                {BLOCKS.map(block => (
                                <img key={block} src={`/rest/parts/${block}.png`} className={selection && selection.part && selection.part.name.split('.')[0] == block ? 'selected' : ''} onDragStart={event => onNewPartDragStart(event, `${block}.dat`)}/>
                            ))}
                            </div>*/}
                        </div>
                    </div>
                    <div className="colors" onWheel={e => {e.currentTarget.scrollLeft += e.deltaY}}>
                            {availableMaterials ? (
                                availableMaterials.map(mat => {
                                    const key = mat.userData.code
                                    const title = mat.name.trim()
                                    const className = selectedMaterial && mat.userData.code == selectedMaterial.userData.code ? 'selected' : ''
                                    const backgroundColor = getMaterialColor(mat)
                                    const borderColor = getMaterialColor(mat.userData.edgeMaterial)
                                    const style = { backgroundColor, borderColor }
                                    return <a key={key} title={title} className={className} style={style} onClick={event => onColorChanged(event,mat)}/>
                                })
                            ) : (
                                <span>Loading materials</span>
                            )}
                        </div>
                    <div className='History'>
                        <div className='history tabs'>
                            <a className={showOperations ? 'selected' : ''} onClick={() => setShowOperations(true)}>
                                <span>History</span>
                            </a>
                            <a className={!showOperations ? 'selected' : ''} onClick={()  => setShowOperations(false)}>
                                <span>Tree</span>
                            </a>
                        </div>
                        {showOperations ? (
                            <ul className='OperationList'>
                                {operations && operations.length > 0 ? (
                                    operations.filter(op => op.type != 'select').map((op, i, arr) => {
                                        const index = operations.indexOf(op)
                                        return(
                                            <React.Fragment key={'Fragment' + index}>
                                                {i != 0 && arr[i-1].versionId != op.versionId && <li className='Version Element' key={'Version'  + arr[i-1].versionId}>Version: {arr[i-1].versionId}</li>}
                                                <li key={index} className={operationIndex==index ? 'selected' : ''} onClick={event => onSelectedOperation(event,index)}>
                                                {dataUrl ? (
                                                    <div>
                                                        <img src={dataUrl[index]}/>
                                                        <img src={OPERATIONICONS[op.type]} className='operation icon' title={op.type + ' operation'}/>
                                                        <UserPictureWidget userId={op.userId} class={'user picture'}/>
                                                    </div>
                                                ) : op.type}
                                                </li>
                                                {arr.length-1 == i && <li className='Version Element' key={'Version'  + op.versionId}>{op.versionId==null ? 'New Operations': 'Version: '+ op.versionId}</li>}
                                            </React.Fragment>
                                        )
                                    })
                                ):(
                                    <span>No operations recorded</span>
                                )}
                            </ul>
                        ) : (
                            model ? (
                                //TODO: Improve model filtering
                                <ModelGraph model={new Group().add(...model.clone().children.filter(obj => obj.name != manipulator.name && obj.name != box.name))}/>
                            ) : <span>No parts are available</span>
                        )}
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
                </div>
            </main>
        ) : (
            <LoadingView/>
        )
    )
}