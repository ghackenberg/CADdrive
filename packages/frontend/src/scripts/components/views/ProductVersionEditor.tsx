import * as React from 'react'
import { useContext } from 'react'
import { useParams } from 'react-router'

import shortid from 'shortid'
import { Box3, Group, Mesh, Object3D, Vector3, Material, LineSegments, MeshStandardMaterial, LineBasicMaterial, Intersection, Event, BoxHelper, Euler } from 'three'

import { CustomLDrawModel, parseCustomLDrawDelta, parseCustomLDrawModel, AbstractOperation, InsertOperation, SelectOperation, DeleteOperation, MoveOperation, RotateOperation, ColorOperation, updateGrid, updateBox, selectbyId, updateHelper } from 'productboard-ldraw'

import { FileClient } from '../../clients/rest/file'
import { VersionClient } from '../../clients/rest/version'
import { VersionContext } from '../../contexts/Version'
import { COLOR_S, COLOR_X, COLOR_Y, COLOR_Z, createScene } from '../../functions/editor'
import { useVersion } from '../../hooks/entity'
import { useAsyncHistory } from '../../hooks/history'
import { useVersions } from '../../hooks/list'
import { getMaterialColor, getMaterials, getObjectMaterialCode, LDRAW_LOADER, loadLDrawModel, MATERIAL_LOADING, parseLDrawModel } from '../../loaders/ldraw'
import { ModelView3D } from '../widgets/ModelView3D'
import { LoadingView } from './Loading'

import BlankIcon from '/src/images/blank.png'

const BLANK = new Image()
BLANK.src = BlankIcon

const BLOCKS = ['3005', '3004', '3622', '3010', '3009', '3008', '6111', '6112', '2465', '3003', '3002', '3001', '2456', '3007', '3006', '2356', '6212', '4202', '4201', '4204', '30072']

export const ProductVersionEditorView = () => {

    // HISTORY

    const { goBack } = useAsyncHistory()

    // PARAMS

    const { productId, versionId } = useParams<{ productId: string, versionId: string }>()

    // CONTEXTS

    const { setContextVersion } = useContext(VersionContext)

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

    const [isPartCreate, setIsPartCreate] = React.useState<boolean>()
    const [isPartInserted, setIsPartInserted] = React.useState<boolean>()

    const [offset] = React.useState<Vector3>(new Vector3(0, 0, 0))

    const [movement] = React.useState(new Vector3())

    const [rotationStart, setRotationStart] = React.useState<Vector3>()
    const [rotationAngle, setRotationAngle] = React.useState<number>()

    const [save, setSave] = React.useState<boolean>()
    const [description, setDescription] = React.useState<string>()
    const [number, setNumber] = React.useState<string>()

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
                                    updateGrid(model)
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
                            updateGrid(model)
                        } 

                        const deltadata = await FileClient.getFile(`${version.versionId}.ldraw-delta`)
                        const deltatext = new TextDecoder().decode(deltadata)
                        const ops = await parseCustomLDrawDelta(deltatext)
                        console.log(ops)
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
                                }
                                break
                            } else if (ops[index].type == "insert") {
                                const insertOp = ops[index] as InsertOperation
                                selectbyId(model, insertOp.id)
                                updateHelper(model, insertOp.id, model.children.find(child => child.userData['id'] == insertOp.id[0]).position)
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
        model && updateGrid(model)
    }, [model])

    React.useEffect(() => {
        inputRef.current && inputRef.current.focus()
    }, [inputRef])

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
                    const xcoord = Math.round(pos.x / 20) * 20 - position.x + position.x % 20
                    moveBy(xcoord, 0, 0)
                    break
                }
                case "y": {
                    const ycoord = Math.round(-pos.y / 24) * 24 - position.y
                    moveBy(0, ycoord, 0)
                    break
                }
                case "z": {
                    const zcoord = Math.round(-pos.z / 20) * 20 - position.z + position.z % 20
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
                addOperations([new SelectOperation(shortid(),[part.userData['id']], idsbefore)])
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

        /*moveBy(x, y, z)*/
        
        // Move manipulator to dreged part
        manipulator.position.set(part.position.x, part.position.y, part.position.z)
        manipulator.visible = true

        updateGrid(model)
    }

    // Move selected parts
    function onPartDrag(pos: Vector3) {
        //console.log('onPartDrag', pos)

        if (selection.parts.length > 0) {
            const x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x - selection.part.position.x
            const y = 0
            const z = Math.round((-pos.z - offset.z) / 20) * 20 + offset.z - selection.part.position.z

            console.log(x,y,z)
            moveBy(x, y, z)

            updateGrid(model)

            updateBox(selection, box)
        }
    }

    // Move selected parts
    function onPartDrop(pos: Vector3) {
        //console.log('onPartDrop', pos)

        if (selection.parts.length > 0) {
            const x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x - selection.part.position.x
            const y = 0
            const z = Math.round((-pos.z - offset.z) / 20) * 20 + offset.z - selection.part.position.z

            moveBy(x, y, z)

            updateGrid(model)

            updateBox(selection, box)

            movement.length() != 0 && addOperations([new MoveOperation(shortid(), selection.parts.map(part => part.userData['id']), movement.clone())])
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

        idsBefore.length != 0 &&addOperations([new SelectOperation(shortid(),[], idsBefore)])
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
            const x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x
            const y = Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / 20) * 20 - offset.z

            moveTo(x, y, z)

            updateGrid(model)

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
            const x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x
            const y = Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / 20) * 20 - offset.z

            moveTo(x, y, z)

            updateGrid(model)

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
            const x = Math.round((pos.x - offset.x) / 20) * 20 + offset.x
            const y = Math.round(-pos.y / 8) * 8 - offset.y
            const z = Math.round((-pos.z + offset.z) / 20) * 20 - offset.z

            moveTo(x, y, z)

            updateGrid(model)

            updateBox(selection, box)

            setIsPartCreate(false)

            // Update operations
            const ops: AbstractOperation[] = []
            for (const part of selection.parts) {
                ops.push(new InsertOperation(shortid(), [part.userData['id']], [part.name], [getObjectMaterialCode(part)], [new Vector3(x, y, z)], [new Euler(0, 0, 0)]))
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

            updateGrid(model)

            updateBox(selection, box)
        }
    }

    function onAxisDrag(pos: Vector3, axis: string) {
        //console.log('onMoveOnAxisContinue', pos, axisName)

        if (selection.parts.length > 0) {
            moveByAxis(axis, pos)

            updateGrid(model)

            updateBox(selection, box)
        }
    }

    function onAxisDrop(pos: Vector3, axis: string) {
        //console.log('onMoveOnAxisDrop', pos, axisName)

        if (selection.parts.length > 0) {
            moveByAxis(axis, pos)

            if (axis == 'rotation y') {
                rotationAngle != 0 && addOperations([new RotateOperation(shortid(), selection.parts.map(part => part.userData['id']), selection.part && selection.part.userData['id'], rotationAngle)])
            } else {
                movement.length() != 0 && addOperations([new MoveOperation(shortid(), selection.parts.map(part => part.userData['id']), movement.clone())])
            }
    
            setRotationStart(undefined)
            setRotationAngle(undefined)

            updateGrid(model)

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
            addOperations([new SelectOperation(shortid(), IDsAfterSelection, IDsBeforeSelection)])
        }
        updateBox(selection, box)
    }

    // Keyboard

    function onKeyDown(key: React.KeyboardEvent) {
        //console.log('onKeyDown', key.key)

        if (key.key == "Delete") {
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

            updateGrid(model)

            updateBox(selection, box)

            didDelete && addOperations([new DeleteOperation(shortid(), id, partName, color, position, rotation)])
        } else if (key.ctrlKey && key.key == "c") {
            if (selection.parts.length == 0) {
                return
            }
            copiedParts.length = 0

            for (const obj of selection.parts) {
                const part = obj.clone()
                part.userData['id'] = shortid()
                copiedParts.push(part)
            }
        } else if (key.ctrlKey && key.key == "v") {
            unselect()

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

            addOperations([new InsertOperation(shortid(), id, part, color, position, rotation)])
        }
    }

    // Operation management

    function updateOperations(undo:boolean) {
        //undo: true --> undo is used, false --> redo is used
        if(undo) {
            operationIndex != undefined ? setOperationIndex(operationIndex-1) : setOperationIndex(-1)
        } else {
            if (operationIndex != undefined) {
                setOperationIndex(operationIndex+1)
            } else {
                setOperationIndex(0)
            }
        }
    }

    function updateStates() {
        // clear selection
        selection.parts = []
        selection.part = undefined

        // update selection
        for (const part of model.children) {
            // Adding selectedd parts to the selection.parts array
            part.name.endsWith('.dat') && part.traverse(object => {
                if (object instanceof Mesh) {
                    if (object.material instanceof MeshStandardMaterial) {
                        if (object.material.emissive.r == 0.1) {
                            selection.parts.push(part)
                        }
                    } else {
                        throw 'Material type not supported'
                    }
                }
            })

            // Sets the selected part
            if (part.position == manipulator.position) {
                selection.part = part
            }
        }
    }

    function addOperations(newOperations: AbstractOperation[]) {
        if (operations.length-1 > operationIndex || (operationIndex == undefined && operations.length > 0)) {
            operations.splice(operationIndex+1)
        }
        if (operationIndex != undefined) {
            setOperationIndex(operationIndex+1)
        } else {
            setOperationIndex(0)
        }

        setOperations([...operations, ...newOperations])
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
        addOperations([new ColorOperation(shortid(), id,oldMaterial,material.userData.code)])
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

    console.log(operations, operationIndex,  model)

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
                        <div className='buttons'>
                            <button className='button fill green' onClick={() => setSave(true)}>
                                Save
                            </button>
                            <button className='button fill gray' onClick={() => {
                                if (operationIndex != -1 && operationIndex != undefined) {
                                    operations[operationIndex].undo(model, LDRAW_LOADER).then(()=>{
                                        updateOperations(true)
                                        updateStates()
                                    })
                                }
                                
                                }}>
                                Undo
                            </button>
                            <button className='button fill gray' onClick={() => {
                                if (operations.length > 0 && operationIndex == -1) {
                                    operations[0].redo(model, LDRAW_LOADER).then(()=>{
                                        updateOperations(false)
                                        updateStates() 
                                    })
                                } else if (operations.length - 1 > operationIndex) {
                                    operations[operationIndex+1].redo(model, LDRAW_LOADER).then(()=>{
                                        updateOperations(false)
                                        updateStates()
                                    })  
                                }
                                }}>
                                Redo
                            </button>
                        </div>
                    </div>
                    <div className="palette">
                        <div className="parts">
                            {BLOCKS.map(block => (
                                <img key={block} src={`/rest/parts/${block}.png`} onDragStart={event => onNewPartDragStart(event, `${block}.dat`)}/>
                            ))}
                        </div>
                        <div className="colors">
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
                    </div>
                    <div className='OperationHistory'>
                        <ol>
                            {operations && operations.length > 0 ? (
                                operations.map(op => {
                                    const index = operations.indexOf(op)
                                    return <li key={index} className={operationIndex==index ? 'selected' : ''} onClick={event => onSelectedOperation(event,index)}>{op.type}</li>
                                })
                            ):(
                                <span>No operations recorded</span>
                            )}
                        </ol>
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