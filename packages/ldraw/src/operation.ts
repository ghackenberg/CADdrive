import { Box3, BoxHelper, Euler, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, Vector3 } from "three"
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader"

import { selectbyId, unselectbyId, updateBox, updateHelper } from "./main"

export abstract class AbstractOperation {
    constructor(public type: string, public uuid: string) {
        // empty
    }
    abstract undo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void>
    abstract redo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void>
    abstract operatesWithId(id: string): boolean
    abstract getIds(): string[]
}

export class InsertOperation extends AbstractOperation {
    constructor(uuid: string, public id: string[], public part: string[], public color: string[], public position: Vector3[], public rotation: Euler[]) {
        super('insert', uuid)
    }
    override async undo(model: Group): Promise<void> {
        unselectbyId(model, this.id)

        for (const element of this.id) {
            model.remove(model.children.find(obj => obj.userData['id'] == element))
        }
        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        if (manipulator) {
            manipulator.visible = false
        }
        updateHelper(model, this.id)
    }
    override async redo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void> {
        unselectbyId(model, this.id)

        for (const index in this.id) {
            /*await parseLDrawModel(this.part[index], `1 ${this.color[index]} 0 0 0 1 0 0 0 1 0 0 0 1 ${this.part[index]}`, null, false).then(part => {
                part.children[0].userData['id'] = this.id[index]
                
                // Calculate offset
                const bbox = new Box3()
                const offset = new Vector3()
                bbox.setFromObject(part.children[0])

                bbox.getSize(offset)
                offset.x = Math.round(100 * (offset.x % 40) / 2) / 100
                offset.z = Math.round(100 * (offset.z % 40) / 2) / 100
                offset.y = Math.round(100 * (offset.y - 4 + ((offset.y - 4) % 8) / 2)) / 100
                
                part.children[0].position.set(this.position[index].x,this.position[index].y,this.position[index].z)
                part.children[0].rotation.set(this.rotation[index].x, this.rotation[index].y, this.rotation[index].z)
                model.add(part.children[0])
                //updateGrid(model)
                //updateBox(selection, box)
            })*/
            await new Promise<void>(resolve => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (LDRAW_LOADER as any).parse(`1 ${this.color[index]} 0 0 0 1 0 0 0 1 0 0 0 1 ${this.part[index]}`, (subgroup: Group) => {
                    for (const part of subgroup.children) {
                        const copy = part.clone(true)
                        copy.userData['id'] = this.id[index]
                        
                        copy.position.set(this.position[index].x,this.position[index].y,this.position[index].z)
                        copy.rotation.set(this.rotation[index].x, this.rotation[index].y, this.rotation[index].z)
                        model.add(copy)
                    }
                    resolve()
                })
            })
        } 
        selectbyId(model, this.id)
        updateHelper(model, this.id) 
        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        if (manipulator) {
            manipulator.position.set(this.position[this.position.length - 1].x, this.position[this.position.length - 1].y, this.position[this.position.length - 1].z)
            manipulator.visible = true
        }
    }
    override operatesWithId(id: string): boolean {
        return this.id.includes(id)
    }
    override getIds(): string[] {
        return this.id
    }
}

export class SelectOperation extends AbstractOperation {
    constructor(uuid: string,public after: string[], public before: string[]) {
        super('select', uuid)
    }
    override async undo(model: Group): Promise<void> {
        unselectbyId(model,this.after)

        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        
        if (this.before.length > 0)  {
            selectbyId(model, this.before)
            //selection.part = selection.parts[selection.parts.length-1]
            const focusPart = model.children.find(child => child.userData['id'] == this.before[this.before.length-1])
            //console.log("Part: ", focusPart, "Pos: ", focusPart.position, "Manipulator: ", manipulator)
            if(focusPart) {
                manipulator.visible = true
                manipulator.position.set(focusPart.position.x, focusPart.position.y, focusPart.position.z) 
            } else {
                console.log("Part is undefiened")
                manipulator.visible = false
            }
        } else {
            if (manipulator) {
                manipulator.visible = false
            }
        }
        const parts = model.children.filter(child => this.before.includes(child.userData['id']))
        const part = parts[0]
        updateBox({ parts, part }, model.children.find(obj => obj.name == 'box') as BoxHelper)
        //console.log("new", model.children.filter(obj => this.before.includes(obj.userData['id'])), "old", model.children.filter(obj => this.after.includes(obj.userData['id'])))
    }
    override async redo(model: Group): Promise<void> {
        unselectbyId(model,this.before)

        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        
        if (this.after.length > 0)  {
            selectbyId(model, this.after)

            const focusPart = model.children.find(child => child.userData['id'] == this.after[this.after.length-1])
            if(focusPart) {
                manipulator.visible = true
                manipulator.position.set(focusPart.position.x, focusPart.position.y, focusPart.position.z) 
            } else {
                console.log("Part is undefiened")
                manipulator.visible = false
            }
        } else {
            if (manipulator) {
                manipulator.visible = false
            }
        }
        const parts = model.children.filter(child => this.after.includes(child.userData['id']))
        const part = parts[0]
        updateBox({ parts, part }, model.children.find(obj => obj.name == 'box') as BoxHelper)
        //console.log("new", model.children.filter(obj => this.after.includes(obj.userData['id'])), "old", model.children.filter(obj => this.before.includes(obj.userData['id'])))
    }
    override operatesWithId(id: string): boolean {
        return this.after.includes(id) || this.before.includes(id)
    }
    override getIds(): string[] {
        return [...this.after, ...this.before]
    }
}

export class MoveOperation extends AbstractOperation {
    constructor(uuid: string, public id: string[], public movement: Vector3) {
        super('move', uuid)
    }
    override async undo(model: Group): Promise<void> {
        for ( const element of this.id) {
            model.children.find(obj => obj.userData['id'] == element)?.position.add(this.movement.clone().negate())
        }
        updateHelper(model, this.id, this.movement.clone().negate())
    }
    override async redo(model: Group): Promise<void> {
        for ( const element of this.id) {
            model.children.find(obj => obj.userData['id'] == element)?.position.add(this.movement)
        }
        updateHelper(model, this.id, this.movement)
    }
    override operatesWithId(id: string): boolean {
        return this.id.includes(id)
    }
    override getIds(): string[] {
        return this.id
    }
}

export class RotateOperation extends AbstractOperation {
    constructor(uuid: string, public id: string[], public selId: string, public rotation: number) {
        super('rotate', uuid)
    }
    override async undo(model: Group): Promise<void> {
        //console.log("undo rotation", this.rotation)
        // Step 1: Get center of rotation
        let rotationCenter : Vector3
        if (this.selId) {
            // center of rotation is part with selId
            rotationCenter = model.children.find(obj => obj.userData['id'] == this.selId).position
        } else {
            // center of rotation is the center of the bounding box
            const box  = new Box3()
            
            for (const partid of this.id) {
                const part = model.children.find(obj => obj.userData['id'] == partid)
                box.expandByObject(part, true)
            }

            // Get center of bounding box
            const center = box.getCenter(new Vector3())

            // Move manipulator to center of bounding box
            const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
            manipulator?.position.set(center.x, 4 - box.max.y, 0 - center.z)
            rotationCenter = manipulator?.position
        }

        // Step 2: Rotate all objects around the center
        //console.log("Schritt 2",this.id,rotationCenter, this.rotation)

        for (const element of this.id) {
            const object = model.children.find(obj => obj.userData['id'] == element)
            const rotationVec = object.position.clone()
            object.position.sub(rotationVec.sub(rotationCenter))
            object.position.add(rotationVec.applyAxisAngle(new Vector3(0, 1, 0), -this.rotation))
            object.rotateY(-this.rotation)
            //console.log(object.position)
        }
        updateHelper(model,this.id)
    }
    override async redo(model: Group): Promise<void> {
        //console.log("redo rotation", this.rotation)
        // Step 1: Get center of rotation
        let rotationCenter : Vector3
        if (this.selId) {
            // center of rotation is part with selId
            rotationCenter = model.children.find(obj => obj.userData['id'] == this.selId).position
        } else {
            // center of rotation is the center of the bounding box
            const box  = new Box3()
            
            for (const partid of this.id) {
                const part = model.children.find(obj => obj.userData['id'] == partid)
                box.expandByObject(part, true)
            }

            // Get center of bounding box
            const center = box.getCenter(new Vector3())

            // Move manipulator to center of bounding box
            const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
            manipulator?.position.set(center.x, 4 - box.max.y, 0 - center.z)
            rotationCenter = manipulator?.position
        }
 
        // Step 2: Rotate all objects around the center
        //console.log("Schritt 2",this.id,rotationCenter, -this.rotation)

        for (const element of this.id) {
            const object = model.children.find(obj => obj.userData['id'] == element)
            const rotationVec = object.position.clone()
            object.position.sub(rotationVec.sub(rotationCenter))
            object.position.add(rotationVec.applyAxisAngle(new Vector3(0, 1, 0), this.rotation))
            object.rotateY(this.rotation)
            //console.log(object.position)
        }
        updateHelper(model,this.id)
    }
    override operatesWithId(id: string): boolean {
        return this.id.includes(id)      
    }
    override getIds(): string[] {
        return this.id
    }
}

export class DeleteOperation extends AbstractOperation {
    constructor(uuid: string, public id: string[], public part: string[], public color: string[], public position: Vector3[], public rotation: Euler[]) {
        super('delete', uuid)
    }
    override async undo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void> {
        //unselectbyId(model, this.id)

        for (const index in this.id) {
            /*await parseLDrawModel(this.part[index], `1 ${this.color[index]} 0 0 0 1 0 0 0 1 0 0 0 1 ${this.part[index]}`, null, false).then(part => {
                part.children[0].userData['id'] = this.id[index]
                
                // Calculate offset
                const bbox = new Box3()
                const offset = new Vector3()
                bbox.setFromObject(part.children[0])

                bbox.getSize(offset)
                offset.x = Math.round(100 * (offset.x % 40) / 2) / 100
                offset.z = Math.round(100 * (offset.z % 40) / 2) / 100
                offset.y = Math.round(100 * (offset.y - 4 + ((offset.y - 4) % 8) / 2)) / 100
                
                part.children[0].position.set(this.position[index].x,this.position[index].y,this.position[index].z)
                part.children[0].rotation.set(this.rotation[index].x, this.rotation[index].y, this.rotation[index].z)
                model.add(part.children[0])
            })*/
            await new Promise<void>(resolve => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (LDRAW_LOADER as any).parse(`1 ${this.color[index]} 0 0 0 1 0 0 0 1 0 0 0 1 ${this.part[index]}`, (subgroup: Group) => {
                    for (const part of subgroup.children) {
                        const copy = part.clone(true)
                        copy.userData['id'] = this.id[index]
                        
                        copy.position.set(this.position[index].x,this.position[index].y,this.position[index].z)
                        copy.rotation.set(this.rotation[index].x, this.rotation[index].y, this.rotation[index].z)
                        model.add(copy)
                    }
                    resolve()
                })
            })
        } 
        selectbyId(model,this.id)
        updateHelper(model, this.id) 
        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        if (manipulator) {
            manipulator.position.set(this.position[this.position.length - 1].x, this.position[this.position.length - 1].y, this.position[this.position.length - 1].z)
            manipulator.visible = true
        }
    }
    override async redo(model: Group): Promise<void> {
        unselectbyId(model, this.id)

        for (const element of this.id) {
            model.remove(model.children.find(obj => obj.userData['id'] == element))
        }
        const manipulator = model.children.find(obj => obj.name == 'manipulator') as Group
        if (manipulator) {
            manipulator.visible = false
        }
        updateHelper(model, this.id)
    }
    override operatesWithId(id: string): boolean {
        return this.id.includes(id)
    }
    override getIds(): string[] {
        return this.id
    }
}

export class ColorOperation extends AbstractOperation {
    constructor(uuid: string, public id: string[], public oldcolor: string[], public newcolor: string) {
        super('color change', uuid)
    }
    override async undo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void> {
        //Load all available materials
        //let availableMaterials : Material[]
        //await getMaterials().then(material => {availableMaterials = material})

        //Change color of every part to their respective color before change
        for (let index = 0; index < this.id.length; index++) {
            const material = LDRAW_LOADER.getMaterial(this.oldcolor[index])
            //const material = availableMaterials.find(mat => mat.userData["code"] == this.oldcolor[index])
            //const part = model.children.find(obj => obj.userData["id"] == this.id[index])
            model.children.find(obj => obj.userData["id"] == this.id[index])?.traverse(object => {
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
    }
    override async redo(model: Group, LDRAW_LOADER: LDrawLoader): Promise<void> {
        // Load all available materials
        //let availableMaterials : Material[]
        //await getMaterials().then(material => {availableMaterials = material})

        // Load new color
        const material = LDRAW_LOADER.getMaterial(this.newcolor)

        // Paint every part in the new color
        for (const nr of this.id) {
            //const part = model.children.find(obj => obj.userData["id"] == nr)
            //const material = availableMaterials.find(mat => mat.userData["code"] == this.newcolor)
            model.children.find(obj => obj.userData["id"] == nr)?.traverse(object => {
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
    }
    override operatesWithId(id: string): boolean {
        return this.id.includes(id)
    }
    override getIds(): string[] {
        return this.id
    }
}