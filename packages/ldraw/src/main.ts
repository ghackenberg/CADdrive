import shortid from 'shortid'
import { Box3, BoxGeometry, BoxHelper, Euler, EulerOrder, GridHelper, Group, LineBasicMaterial, LineSegments, Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader'

import { CustomLDrawModel } from './custom'
import { AbstractOperation, ColorOperation, DeleteOperation, InsertOperation, MoveOperation, RotateOperation, SelectOperation } from './operation'

export * from './custom'
export * from './operation'
export * from './model'
export * from './parser'

export function selectbyId(model: Group, id: string[]){
    for (const partId of id) {
        model.children.find(child => child.userData['id'] == partId)?.traverse(object => {
            if (object instanceof Mesh) {
                if (object.material instanceof MeshStandardMaterial) {
                    object.material = object.material.clone()
                    object.material.emissive.setScalar(0.1)
                }
            }
        })
    }
}

export function unselectbyId(model: Group, id: string[]){
    for (const partId of id) {
        model.children.find(child => child.userData['id'] == partId)?.traverse(object => {
            if (object instanceof Mesh) {
                if (object.material instanceof MeshStandardMaterial) {
                    object.material.emissive.setScalar(0)
                }
            }
        })
    }
}

export function updateHelper(model: Group, id: string[], movement: Vector3 = new Vector3(0,0,0)) {
    model.children.find(obj => obj.name == 'manipulator')?.position.add(movement)
    const parts = model.children.filter(obj => id.includes(obj.userData['id']))
    const part = parts[0]
    updateBox({ part, parts }, model.children.find(obj => obj.name == 'box') as BoxHelper)
    updateGrid(model)
}

export function updateBox(selection: { part: Object3D, parts: Object3D[] }, box: BoxHelper) {
    if (selection.parts.length > 0) {
        const bbox = new Box3()
        for (const part of selection.parts) {
            bbox.expandByObject(part, true)
        }

        bbox.max.y -= 4

        const pad = 4

        bbox.min.x -= pad
        bbox.min.y -= pad
        bbox.min.z -= pad

        bbox.max.x += pad
        bbox.max.y += pad
        bbox.max.z += pad

        const sx = bbox.max.x - bbox.min.x
        const sy = bbox.max.y - bbox.min.y
        const sz = bbox.max.z - bbox.min.z

        const cx = (bbox.min.x + bbox.max.x) / 2
        const cy = (bbox.min.y + bbox.max.y) / 2
        const cz = (bbox.min.z + bbox.max.z) / 2

        const geometry = new BoxGeometry(sx, sy, sz)

        const mesh = new Mesh(geometry)
        mesh.position.set(cx, -cy, -cz)

        box.setFromObject(mesh)
        box.visible = true                
    } else {
        box.visible = false
    }
}

export function updateGrid(model: Group) {
    // remove grid
    for (let i = 0; i < model.children.length; i++) {
        const child = model.children[i]
        if (child instanceof GridHelper) {
            model.remove(child)
        }
    }
    // bounding box
    const bboxModel = new Box3()
    if (model.children.length > 2) {
        for (const child of model.children) {
            if (child.name.endsWith('.dat')) {
                bboxModel.expandByObject(child, true)
            }
        }
    } else {
        bboxModel.expandByObject(model)
    }
    // calculate bounds
    const x = Math.max(Math.abs(bboxModel.min.x), Math.abs(bboxModel.max.x))
    const z = Math.max(Math.abs(bboxModel.min.z), Math.abs(bboxModel.max.z))
    const s = Math.max(x, z) * 2
    // add grid
    const size = (Math.ceil(s / 20) + (Math.ceil(s / 20) % 2 ? 1 : 0) + 2) * 20
    const divisions = size / 20
    const grid = new GridHelper(size, divisions, '#000', '#333')
    model.add(grid)
}

export function selectCleanup(operationlist: AbstractOperation[], userId: string, versionId: string = null) {
    const result: AbstractOperation[] = []
    let usedIds:  string[] = []
    for (const operation of operationlist) {
        const currentIds = operation.getIds()
        switch (operation.type) {
            case 'select':
                continue
            case 'move':
            case 'rotate':
            case 'color change':
                if (currentIds.length != usedIds.length || !currentIds.every(id => usedIds.includes(id))) {
                    result.push(new SelectOperation(shortid(), userId,  versionId, Date.now(),currentIds,usedIds))
                    usedIds = currentIds
                }
                break
            case 'delete':
                if (currentIds.length != usedIds.length || !currentIds.every(id => usedIds.includes(id))) {
                    result.push(new SelectOperation(shortid(), userId, versionId, Date.now(), currentIds,usedIds))
                }
                usedIds = []
                break
            case 'insert':
                if (usedIds.length != 0) {
                    result.push(new SelectOperation(shortid(), userId, versionId, Date.now(), [],usedIds))
                }
                usedIds = currentIds
                break
            default:
                throw 'Unknown operation detected'
        }
        result.push(operation)
    }
    return result
}

export async function renderPreperation(currentOperation: AbstractOperation, renderModel: Group, availableMaterials: Material[], LDRAW_LOADER: LDrawLoader) {
    // redo insert if it is not included in the model
    if (currentOperation instanceof InsertOperation && !currentOperation.id.every(id => renderModel.children.some(part => part.userData['id'] == id))) {
        await currentOperation.redo(renderModel, LDRAW_LOADER)
    }
    
    renderModel.remove(...renderModel.children.filter(child => !child.name.endsWith('.dat')))
    
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

        await currentOperation.undo(renderModel, LDRAW_LOADER)
        renderModel.remove(...renderModel.children.filter(child => !child.name.endsWith('.dat')))
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

export async function parseCustomLDrawModel(LDRAW_LOADER: LDrawLoader, MATERIAL_LOADING: Promise<void>, data: string): Promise<Group> {
    await MATERIAL_LOADING

    const group = new Group()

    const model = JSON.parse(data) as CustomLDrawModel

    for (const child of model) {
        const id = child.id

        const color = child.color

        const x = child.position.x
        const y = child.position.y
        const z = child.position.z

        const a = child.orientation[0]
        const b = child.orientation[1]
        const c = child.orientation[2]
        const d = child.orientation[4]
        const e = child.orientation[5]
        const f = child.orientation[6]
        const g = child.orientation[8]
        const h = child.orientation[9]
        const i = child.orientation[10]

        const name = child.name

        const ldraw = `1 ${color} ${x} ${y} ${z} ${a} ${b} ${c} ${d} ${e} ${f} ${g} ${h} ${i} ${name}`
    
        await new Promise<void>(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (LDRAW_LOADER as any).parse(ldraw, (subgroup: Group) => {
                for (const part of subgroup.children) {
                    const copy = part.clone(true)
                    copy.userData['id'] = id
                    group.add(copy)
                }
                resolve()
            })
        })
    }

    group.rotation.x = Math.PI

    return group
}

export async function parseCustomLDrawDelta(data: string): Promise<AbstractOperation[]> {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData = JSON.parse(data) as any[] // TODO

    const correctedData : AbstractOperation[] = parsedData.map(obj => {
        switch (obj.type) {
            case "insert":
                //console.log("insert")
                return new InsertOperation(
                    obj.operationId,
                    obj.userId,
                    obj.versionId,
                    obj.timestamp,
                    obj.id, 
                    obj.part, 
                    obj.color, 
                    obj.position.map((obj: {x:number, y:number, z:number}) => new Vector3(obj.x, obj.y, obj.z)), 
                    obj.rotation.map((obj: {x:number, y:number, z:number, order:EulerOrder}) => new Euler(obj.x, obj.y, obj.z, obj.order))
                )
            case "select":
                //console.log("select")
                return new SelectOperation(obj.operationId, obj.userId, obj.versionId, obj.timestamp, obj.after, obj.before)
            case "move":
                //console.log("move")
                return new MoveOperation(obj.operationId, obj.userId, obj.versionId, obj.timestamp, obj.id, new Vector3(obj.movement.x, obj.movement.y, obj.movement.z))
            case "rotate":
                //console.log("rotate")
                return new RotateOperation(obj.operationId, obj.userId, obj.versionId, obj.timestamp, obj.id, obj.selId, obj.rotation as number)
            case "delete":
                //console.log("delete")
                return new DeleteOperation(
                    obj.operationId,
                    obj.userId,
                    obj.versionId,
                    obj.timestamp,
                    obj.id, 
                    obj.part, 
                    obj.color, 
                    obj.position.map((obj: {x:number, y:number, z:number}) => new Vector3(obj.x, obj.y, obj.z)), 
                    obj.rotation.map((obj: {x:number, y:number, z:number, order:EulerOrder}) => new Euler(obj.x, obj.y, obj.z, obj.order))
                )
            case "color change":
                //console.log("color change")
                return new ColorOperation(obj.operationId, obj.userId, obj.versionId, obj.timestamp, obj.id, obj.oldcolor, obj.newcolor)
            default:
                return obj
        }
    })

    //console.log("Result: ", correctedData)
    
    return correctedData
}