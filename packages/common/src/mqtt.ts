import { Product, User } from "./main"

export interface TestUpMQTT {
    a(data: string): Promise<void>
    b(data: string): Promise<void>
}

export interface TestDownMQTT {
    c(data: string): void
    d(data: string): void
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserUpMQTT {
    // empty
}

export interface UserDownMQTT {
    create(user: User): void
    update(user: User): void
    delete(user: User): void
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProductUpMQTT {
    // empty
}

export interface ProductDownMQTT {
    create(product: Product): void
    update(product: Product): void
    delete(product: Product): void
}

// TODO Add missing MQTT interfaces