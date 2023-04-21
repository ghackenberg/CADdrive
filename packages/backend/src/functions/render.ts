import * as gl from 'gl'
import * as Jimp from 'jimp'
import { AmbientLight, Box3, DirectionalLight, Group, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js'

function initializeScene() {
    const ambient_light = new AmbientLight(0xffffff, 0.5)
    const directional_light = new DirectionalLight(0xffffff, 1)

    const scene = new Scene()
    scene.add(ambient_light)
    scene.add(directional_light)
    scene.add(new Object3D())

    return scene
}

function initializeCamera(aspect = 1, near = 1, far = 1) {
    const camera = new PerspectiveCamera(45, aspect, near, far)

    return camera
}

function initializeCanvas(width = 1, height = 1) {
    return {
        width,
        height,
        addEventListener: () => {
            // empty
        },
        removeEventListener: () => {
            // empty
        },
    }
}

function initializeContext(width = 1, height = 1) {
    return gl(width, height)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initializeRenderer(canvas: any, context: any) {
    const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: true,
        canvas,
        context
    })

    return renderer
}

function initializeOrbit(camera: PerspectiveCamera, renderer: WebGLRenderer) {
    const orbit = new OrbitControls(camera, renderer.domElement)
    orbit.enableDamping = true

    return orbit
}

function reset(model: Group, camera: PerspectiveCamera, orbit: OrbitControls) {
    // Analyze
    const box = new Box3().setFromObject(model)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.75

    // Camera
    camera.near = radius * 0.01
    camera.far = radius * 100

    // Orbit
    orbit.target0.copy(center)
    orbit.position0.set(-2.3, 1, 2).multiplyScalar(radius).add(center)
    orbit.reset()
}

function render(model: Group, width: number, height: number): Promise<Jimp> {
    return new Promise<Jimp>((resolve, reject) => {
        // Scene
        const scene = initializeScene()
        scene.remove(scene.children[scene.children.length - 1])
        scene.add(model)

        // Camera
        const camera = initializeCamera()
        camera.aspect = width / height

        // Orbit
        const canvas = initializeCanvas(width, height)

        // Context
        const context = initializeContext(width, height)

        // Renderer
        const renderer = initializeRenderer(canvas, context)

        // Orbit
        const orbit = initializeOrbit(camera, renderer)

        // Prepare
        reset(model, camera, orbit)

        // Renderer
        renderer.render(scene, camera)

        // Write buffer
        const buffer = new Uint8Array(width * height * 4)
        context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, buffer)

        // Write image
        new Jimp(width, height, (error, image) => {
            if (error) {
                reject(error)
            } else {
                const data = image.bitmap.data
                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        const offset = y * width + x
                        data[offset + 0] = buffer[offset + 0]
                        data[offset + 1] = buffer[offset + 1]
                        data[offset + 2] = buffer[offset + 2]
                        data[offset + 3] = buffer[offset + 3]
                    }
                }
                resolve(image)
            }
        })
    })
}

export async function renderLDraw(model: string, width: number, height: number) {
    return new Promise<Jimp>((resolve, reject) => {
        new LDrawLoader().parse(model, undefined, group => {
            render(group, width, height).then(resolve).catch(reject)
        })
    })
}

export async function renderGlb(buffer: Buffer, width: number, height: number) {
    return new Promise<Jimp>((resolve, reject) => {
        new GLTFLoader().parse(buffer, undefined, model => {
            render(model.scene, width, height).then(resolve).catch(reject)
        }, error => {
            reject(error)
        })
    })
}