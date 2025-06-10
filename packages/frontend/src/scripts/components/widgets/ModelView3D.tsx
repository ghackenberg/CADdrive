import * as React from 'react'

import { Scene, PerspectiveCamera, WebGLRenderer, Group, Object3D, Raycaster, Vector2, Mesh, Material, MeshStandardMaterial, Vector3, Intersection, Event, GridHelper } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { comparePath } from '../../functions/path'
import { initializeCamera, initializeOrbit, initializeRenderer, initializeScene, reset } from '../../functions/render'

const THRESHOLD = 3

interface Props {
    model: Group
    update?: number
    highlighted?: string[]
    marked?: string[]
    selected?: string[]

    onMouseOver?: (object: Object3D, intersections: Intersection<Object3D<Event>>[]) => void
    onMouseOut?: (object: Object3D, intersections: Intersection<Object3D<Event>>[]) => void
    
    onClick?: (object: Object3D, intersections: Intersection<Object3D<Event>>[], isCtrlPressed: boolean) => void

    onKeyDown?: (event: React.KeyboardEvent) => void

    onPartDragStart?: (object: Object3D, intersections: Intersection<Object3D<Event>>[], pos: Vector3) => void
    onPartDrag?: (pos: Vector3) => void
    onPartDrop?: (pos: Vector3) => void
    onPartDropLeave?: () => void

    onAxisDragStart?: (pos: Vector3, axis: string) => void
    onAxisDrag?: (pos: Vector3, axis: string) => void
    onAxisDrop?: (pos: Vector3, axis: string) => void

    onNewPartDragEnter?: (pos: Vector3) => void
    onNewPartDrag?: (pos: Vector3) => void
    onNewPartDrop?: (pos: Vector3) => void
    onNewPartDragLeave?: () => void
}

export class ModelView3D extends React.Component<Props> {

    // Fields

    private div: React.RefObject<HTMLDivElement>

    private update: number
    private scene: Scene
    private camera: PerspectiveCamera
    private renderer: WebGLRenderer
    private orbit: OrbitControls
    private raycaster: Raycaster

    private position_start: {clientX: number, clientY: number}
    private position_end: {clientX: number, clientY: number}
    
    private intersections: Intersection<Object3D<Event>>[] = []
    private hovered: Object3D

    // Constructor

    constructor(props: Props) {
        super(props)
        // Create
        this.div = React.createRef()
        // Bind
        this.resize = this.resize.bind(this)

        this.handleKeyDown = this.handleKeyDown.bind(this)

        this.handleMouseDown = this.handleMouseDown.bind(this)
        this.handleMouseMove = this.handleMouseMove.bind(this)
        this.handleMouseUp = this.handleMouseUp.bind(this)

        this.handleTouchStart = this.handleTouchStart.bind(this)
        this.handleTouchMove = this.handleTouchMove.bind(this)
        this.handleTouchEnd = this.handleTouchEnd.bind(this)

        this.handleDragEnter = this.handleDragEnter.bind(this)
        this.handleDragOver = this.handleDragOver.bind(this)
        this.handleDragLeave = this.handleDragLeave.bind(this)
        this.handleDrop = this.handleDrop.bind(this)

        this.paint = this.paint.bind(this)
    }

    // Override
    
    override componentDidMount() {
        // Scene
        this.scene = initializeScene()
        // Camera
        this.camera = initializeCamera(this.div.current.offsetWidth / this.div.current.offsetHeight)
        // Renderer
        this.renderer = initializeRenderer(this.div.current.offsetWidth, this.div.current.offsetHeight, this.paint)
        // Orbit
        this.orbit = initializeOrbit(this.camera, this.renderer)
        // Raycaster
        this.raycaster = new Raycaster()
        // Append
        this.div.current.appendChild(this.renderer.domElement)
        // Listen
        window.addEventListener('resize', this.resize)
        // Reload
        this.reload()
    }

    override componentDidUpdate() {
        this.reload()
    }
    
    override componentWillUnmount() {
        // Frame
        this.renderer.setAnimationLoop(null)
        this.renderer.forceContextLoss()
        // Resize
        window.removeEventListener('resize', this.resize)
        // Remove all active WebGl contexts
        while(this.div.current.childElementCount > 0) {
            this.div.current.removeChild(this.div.current.lastChild)
        }
        // Revert material
        if (this.select_cache) {
            this.revertSelect(this.props.model)
            this.select_cache = undefined
        }
        if (this.highlight_cache) {
            this.revertHighlight(this.props.model)
            this.highlight_cache = undefined
        }
    }
    
    override render() {
        return <div className="widget model_view_3d" tabIndex={0} onKeyDown={this.handleKeyDown} onMouseDown={this.handleMouseDown} onMouseMove={this.handleMouseMove} onMouseUp={this.handleMouseUp} onTouchStart={this.handleTouchStart} onTouchMove={this.handleTouchMove} onTouchEnd={this.handleTouchEnd} onDragEnter={this.handleDragEnter} onDragOver={this.handleDragOver} onDragLeave={this.handleDragLeave} onDrop={this.handleDrop} ref={this.div}/>
    }

    // Public

    focus() {
        this.div.current.focus()
    }

    // Core

    private reload() {
        // Reverting highlight and select
        if (this.select_cache) {
            this.revertSelect(this.scene.children[this.scene.children.length - 1])
            this.select_cache = undefined
        }
        if (this.highlight_cache) {
            this.revertHighlight(this.scene.children[this.scene.children.length - 1])
            this.highlight_cache = undefined
        }
        // Updating scene
        if (this.scene.children.length == 0 || this.scene.children[this.scene.children.length - 1] != this.props.model || this.update != this.props.update) {
            // Update
            this.update = this.props.update
            // Scene
            this.scene.remove(this.scene.children[this.scene.children.length - 1])
            this.scene.add(this.props.model)
            // Orbit
            reset(this.props.model, this.camera, this.orbit)
        }
        // Setting hghlight and select
        if ((this.props.highlighted && this.props.highlighted.length > 0) || (this.props.marked && this.props.marked.length > 0)) {
            this.highlight_cache = {}
            this.setHighlight(this.props.model)
        }
        if (this.props.selected && this.props.selected.length > 0) {
            this.select_cache = {}
            this.setSelect(this.props.model)
        }
        // Resize
        this.resize()
    }

    private resize() {
        if (this.div.current) {
            // Size
            const width = this.div.current.offsetWidth
            const height = this.div.current.offsetHeight
            // Camera
            this.camera.aspect = width / height
            this.camera.updateProjectionMatrix()
            // Renderer
            this.renderer.setSize(width, height)
        }
    }

    private paint() {
        this.orbit.update()
        this.renderer.render(this.scene, this.camera)
    }

    // Highlight

    private highlight_cache: {[uuid: string]: Material | Material[]}

    private setHighlight(object: Object3D, path = '0') {
        // Process object
        if (object.type == 'Mesh') {
            const mesh = object as Mesh
            this.highlight_cache[mesh.uuid] = mesh.material
            const highlighted = this.props.highlighted.filter(prefix => comparePath(prefix, path)).length > 0
            const marked = this.props.marked.filter(prefix => comparePath(prefix, path)).length > 0
            if (mesh.material instanceof MeshStandardMaterial && !mesh.material.wireframe) {
                if (highlighted && marked) {
                    mesh.material = new MeshStandardMaterial({
                        color: 0x0000ff
                    })
                } else if (highlighted) {
                    mesh.material = new MeshStandardMaterial({
                        color: 0xff0000
                    })
                } else if (marked) {
                    mesh.material = new MeshStandardMaterial({
                        color: 0x00ff00
                    })
                } else {
                    mesh.material = new MeshStandardMaterial({
                        color: 0xffffff, transparent: true, opacity: 0.25
                    })
                }
            }
        }
        // Process children
        for (let index = 0; index < object.children.length; index++) {
            const child = object.children[index]
            this.setHighlight(child, `${path}-${index}`)
        }
    }

    private revertHighlight(object: Object3D) {
        // Process object
        if (object.type == 'Mesh') {
            const mesh = object as Mesh
            mesh.material = this.highlight_cache[mesh.uuid]
        }
        // Process children
        for (const child of object.children) {
            this.revertHighlight(child)
        }
    }

    // Select

    private select_cache: {[uuid: string]: Material | Material[]}

    private setSelect(object: Object3D, path = '0') {
        if (object.type == 'Mesh') {
            const mesh = object as Mesh
            this.select_cache[mesh.uuid] = mesh.material
            if (this.props.selected.filter(prefix => comparePath(prefix, path)).length > 0) {
                if (Array.isArray(mesh.material)) {
                    const array: Material[] = []
                    for (const material of mesh.material) {
                        const copy = material.clone()
                        if (copy instanceof MeshStandardMaterial) {
                            const standard = copy as MeshStandardMaterial
                            if (!standard.wireframe) {
                                standard.emissive.setScalar(0.1)
                            }
                        }
                        array.push(copy)
                    }
                    mesh.material = array
                } else {
                    const copy = mesh.material.clone()
                    if (copy instanceof MeshStandardMaterial) {
                        const standard = copy as MeshStandardMaterial
                        if (!standard.wireframe) {
                            standard.emissive.setScalar(0.1)
                        }
                    }
                    mesh.material = copy
                }
            }
        }
        for (let index = 0; index < object.children.length; index++) {
            const child = object.children[index]
            this.setSelect(child, `${path}-${index}`)
        }
    }

    private revertSelect(object: Object3D) {
        if (object.type == 'Mesh') {
            const mesh = object as Mesh
            mesh.material = this.select_cache[mesh.uuid]
        }
        for (const child of object.children) {
            this.revertSelect(child)
        }
    }

    // Keyboard

    private handleKeyDown(event: React.KeyboardEvent) {
        if (this.props.onKeyDown) {
            this.props.onKeyDown(event)
        }
    }

    // Mouse

    private drag: boolean

    private handleMouseDown(event: React.MouseEvent) {
        // Check mouse button
        if (event.button != 0) {
            return
        }

        // Remember cursor position
        this.position_start = event
        this.position_end = event

        // Initialize drag start
        this.drag = false

        // Check selection target
        if (this.hovered) {
            // Disable orbit
            this.orbit.enabled = false
        }
    }

    private handleMouseMove(event: React.MouseEvent) {
        if (this.position_start && this.position_end) {
            // Update cursor position
            this.position_end = event

            // Check orbit
            if (this.hovered) {
                // Check distance
                if (this.drag || this.calculateDistance() > THRESHOLD) {
                    // Fire drag start and drag event
                    if (this.hovered.name == 'x' || this.hovered.name == 'y' || this.hovered.name == 'z' || this.hovered.name == 'rotation y') {
                        if (this.props.onAxisDragStart) {
                            // Initialize drag
                            if (!this.drag) {
                                // Move along one axis
                                this.props.onAxisDragStart(this.unprojectAxis(this.position_start), this.hovered.name)
                            }
                            // Set cursor
                            this.div.current.style.cursor = 'move'
                        }
                        if (this.props.onAxisDrag) {
                            // Move along one axis
                            this.props.onAxisDrag(this.unprojectAxis(this.position_end), this.hovered.name)
                        }
                    } else {
                        if (this.props.onPartDragStart) {
                            // Inititalize drag
                            if (!this.drag) {
                                // Move in x-z-plane
                                this.props.onPartDragStart(this.hovered, this.intersections, this.unprojectXZ(this.position_start.clientX, this.position_start.clientY, this.hovered.position.y))
                            }
                            // Set cursor
                            this.div.current.style.cursor = 'move'
                        }
                        if (this.props.onPartDrag) {
                            // Move in x-z-plane
                            this.props.onPartDrag(this.unprojectXZ(this.position_end.clientX, this.position_end.clientY, this.hovered.position.y))
                        }
                    }
                    // Remember drag state
                    this.drag = true
                }
            } else {
                // Check drag state
                if (!this.drag) {
                    this.drag = (this.calculateDistance() > THRESHOLD)
                }
            }
        } else {
            this.updateHovered(event)
        }
    }

    private handleMouseUp(event: React.MouseEvent) {
        if (this.position_start && this.position_end) {
            // Check drag state
            if (this.drag) {
                if (this.hovered) {
                    // Fire drop event
                    if (this.hovered.name == 'x' || this.hovered.name == 'y' || this.hovered.name == 'z' || this.hovered.name == 'rotation y') {
                        if (this.props.onAxisDrop) {
                            this.props.onAxisDrop(this.unprojectAxis(event), this.hovered.name)
                        }
                    } else {
                        if (this.props.onPartDrop) {
                            this.props.onPartDrop(this.unprojectXZ(event.clientX, event.clientY, this.hovered.position.y))
                        }
                    }
                    // Reset cursor
                    this.div.current.style.cursor = undefined
                }
            } else {
                // Fire click event
                if (this.props.onClick) {
                    this.props.onClick(this.hovered, this.intersections, event.ctrlKey)
                }
            }
            
            // Forget cursor position
            this.position_start = null
            this.position_end = null
            
            // Update drag state
            this.drag = null

            // Enable orbit
            this.orbit.enabled = true
        }
    }

    // Touch

    private handleTouchStart(event: React.TouchEvent) {
        // Remember cursor position
        this.position_start = event.touches[0]
        this.position_end = event.touches[0]
    }

    private handleTouchMove(event: React.TouchEvent) {
        // Update cursor position
        this.position_end = event.touches[0]
    }

    private handleTouchEnd(event: React.TouchEvent) {
        // Check distance
        if (this.calculateDistance() <= THRESHOLD) {
            // Fire click event
            if (this.props.onClick) {
                this.props.onClick(this.hovered, this.intersections, event.ctrlKey)
            }
        }
        // Forget cursor position
        this.position_start = null
        this.position_end = null
    }

    // Drag

    private handleDragEnter(e: React.DragEvent) {
        e.preventDefault()
        if (this.props.onNewPartDragEnter) {
            const grid = this.props.model.children.find(child => child instanceof GridHelper)
            this.props.onNewPartDragEnter(this.unprojectXZ(e.clientX, e.clientY, grid ? grid.position.y : 0))       
        }
    }

    private handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        if (this.props.onNewPartDrag) {
            const grid = this.props.model.children.find(child => child instanceof GridHelper)
            this.props.onNewPartDrag(this.unprojectXZ(e.clientX,e.clientY, grid ? grid.position.y : 0))
        }
    }

    private handleDrop(e: React.DragEvent) {
        e.preventDefault()
        if (this.props.onNewPartDrop) {
            const grid = this.props.model.children.find(child => child instanceof GridHelper)
            this.props.onNewPartDrop(this.unprojectXZ(e.clientX, e.clientY, grid ? grid.position.y : 0))
        }
    }

    private handleDragLeave(e: React.DragEvent) {
        e.preventDefault()
        if (this.props.onNewPartDragLeave) {
            this.props.onNewPartDragLeave()
        }
    }

    // Update

    private updateHovered(position: { clientX: number, clientY: number }) {
        // Remember state
        const intersections = this.intersections
        const hovered = this.hovered
        
        // Update raycaster
        this.raycaster.setFromCamera(this.normalizeMousePosition(position), this.camera)

        // Compute intersections
        this.intersections = this.raycaster.intersectObjects(this.scene.children, true)
        
        // Compute hovered
        this.hovered = null

        for (let i = 0; i < this.intersections.length; i++) {
            const intersection = this.intersections[i]
            let iterator = intersection.object
            if (iterator instanceof Mesh) {
                while (iterator && !iterator.name) {
                    iterator = iterator.parent
                }
                if (iterator && iterator.name) {
                    if (iterator.name == 'x' || iterator.name == 'y' || iterator.name == 'z' || iterator.name == 'rotation y') {
                        if (iterator.parent.visible) {
                            this.hovered = iterator
                            break
                        }
                    } else if (!this.hovered) {
                        this.hovered = iterator
                    }
                }
            }
        }
        
        // Update title and cursor
        if (this.hovered) {
            this.div.current.title = this.hovered.name
            this.div.current.style.cursor = 'pointer'
        } else {
            this.div.current.title = ''
            this.div.current.style.cursor = 'default'
        }

        // Call event handlers (if necessary)
        let call = false

        call = call || this.hovered != hovered
        call = call || this.intersections.length != intersections.length
        call = call || this.intersections.map((intersection, i) => intersection.object != intersections[i].object).reduce((a, b) => a || b, false)

        if (call) {
            if (hovered && this.props.onMouseOut) {
                this.props.onMouseOut(hovered, intersections)
            }
            if (this.hovered && this.props.onMouseOver) {
                this.props.onMouseOver(this.hovered, this.intersections)
            }
        }
    }

    // Unprojection

    private unprojectAxis(event: { clientX: number, clientY: number }) {
        const camDirection = this.camera.getWorldDirection(new Vector3())
        if (this.hovered.name == 'y') {
            if(Math.abs(camDirection.x) > Math.abs(camDirection.z)) {
                return this.unprojectYZ(event.clientX, event.clientY, this.hovered.parent.position.x)
            } else {
                return this.unprojectXY(event.clientX, event.clientY, this.hovered.parent.position.z)
            }
        } else if (this.hovered.name == 'x'){
            if (Math.abs(camDirection.z) > Math.abs(camDirection.y)) {
                return this.unprojectXY(event.clientX, event.clientY, this.hovered.parent.position.z)
            } else {
                return this.unprojectXZ(event.clientX, event.clientY, this.hovered.parent.position.y)
            }
        } else if (this.hovered.name == 'z'){
            if (Math.abs(camDirection.x) > Math.abs(camDirection.y)) {
                return this.unprojectYZ(event.clientX, event.clientY, this.hovered.parent.position.x)
            } else {
                return this.unprojectXZ(event.clientX, event.clientY, this.hovered.parent.position.y)
            }
        } else if (this.hovered.name == 'rotation y') {
            return this.unprojectXZ(event.clientX, event.clientY, this.hovered.parent.position.y)
        } else {
            throw 'Illegal state'
        }
    }

    private unprojectXZ(mouseX: number, mouseY: number, y = 0) {
        const vec = this.unproject(mouseX, mouseY)

        const distance = (-y - this.camera.position.y) / vec.y

        return new Vector3().copy(this.camera.position).add(vec.multiplyScalar(distance))
    }

    private unprojectXY(mouseX: number, mouseY: number, z = 0) {
        const vec = this.unproject(mouseX, mouseY)

        const distance = (z + this.camera.position.z) / -vec.z
            
        return new Vector3().copy(this.camera.position).add(vec.multiplyScalar(distance))
    }

    private unprojectYZ(mouseX: number, mouseY: number, x = 0) {
        const vec = this.unproject(mouseX, mouseY)

        const distance = (x - this.camera.position.x) / vec.x
            
        return new Vector3().copy(this.camera.position).add(vec.multiplyScalar(distance))
    }

    private unproject(mouseX: number, mouseY: number) {
        let i = this.renderer.domElement as HTMLElement

        let top = 0
        let left = 0

        while (i) {
            top += i.offsetTop
            left += i.offsetLeft

            i = i.offsetParent as HTMLElement
        }

        const width = this.renderer.domElement.offsetWidth
        const height = this.renderer.domElement.offsetHeight

        const x = ( (mouseX - left) / width ) * 2 - 1
        const y = - ( (mouseY - top) / height ) * 2 + 1
        const z = 0.5
            
        return new Vector3(x, y, z).unproject(this.camera).sub(this.camera.position).normalize()
    }

    // Util

    private normalizeMousePosition(position: { clientX: number, clientY: number }) {
        let x = position.clientX
        let y = position.clientY

        let i: HTMLElement = this.div.current

        while (i) {
            x -= i.offsetLeft
            y -= i.offsetTop

            i = i.offsetParent as HTMLElement
        }

        const w = this.div.current.offsetWidth
        const h = this.div.current.offsetHeight

        return new Vector2(x / w * 2 - 1, - y / h * 2 + 1)
    }

    private calculateDistance() {
        if (this.position_start && this.position_end) {
            const dx = this.position_start.clientX - this.position_end.clientX
            const dy = this.position_start.clientY - this.position_end.clientY
            return Math.sqrt(dx * dx + dy * dy)
        } else {
            return 0
        }
    }
    
}