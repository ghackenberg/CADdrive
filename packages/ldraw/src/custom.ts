export interface CustomLDrawModelPart {
    id: string
    name: string
    color: string
    position: { x: number, y: number, z: number }
    orientation: number[]
}

export type CustomLDrawModel = CustomLDrawModelPart[]