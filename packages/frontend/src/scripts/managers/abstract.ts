import deepEqual from "deep-equal"

export class AbstractManager<T extends { id: string, created: number, updated: number, deleted: number }> {

    // COMMON

    // ... private fields

    private readonly MIN_TIMEOUT = 30 // in seconds
    private readonly MAX_TIMEOUT = 90 // in seconds

    private readonly DELTA_TIMEOUT = this.MAX_TIMEOUT - this.MIN_TIMEOUT

    // ... private methods

    private random() {
        return (Math.random() * this.DELTA_TIMEOUT + this.MIN_TIMEOUT) * 1000
    }

    // ... public methods

    public clear() {
        this.clearItem()
        this.clearFind()
    }

    // ITEM

    // ... private fields

    private itemGetters: {[id: string]: () => Promise<T>} = {}
    private itemPromises: {[id: string]: Promise<T>} = {}
    private itemTimeouts: {[id: string]: NodeJS.Timeout} = {}
    private itemTimestamps: {[id: string]: number} = {}
    private itemObservers: {[id: string]: ((item: T) => void)[]} = {}
    private items: {[id: string]: T} = {}

    // ... private methods

    private clearItem() {
        this.itemGetters = {}
        this.itemPromises = {}
        this.itemTimeouts = {}
        this.itemTimestamps = {}
        this.itemObservers = {}
        this.items = {}
    }

    private observeItemInternal(id: string, getter: () => Promise<T>, observer: (item: T) => void) {
        this.itemGetters[id] = getter
        if (!(id in this.itemObservers)) {
            this.itemObservers[id] = []
        }
        this.itemObservers[id].push(observer)
        if (this.hasItem(id)) {
            observer(this.getItem(id))
            if (!this.hasItemTimeout(id)) {
                this.scheduleItem(id)
            }
        } else if (!this.hasItemPromise(id)) {
            this.reloadItem(id)
        }
    }

    private unobserveItemInternal(id: string, callback: (item: T) => void) {
        this.itemObservers[id].splice(this.itemObservers[id].indexOf(callback), 1)
        if (this.itemObservers[id].length == 0 && this.itemTimeouts[id]) {
            clearTimeout(this.itemTimeouts[id])
            delete this.itemTimeouts[id]
        }
    }

    private hasItemTimeout(id: string) {
        return id in this.itemTimeouts
    }
    private hasItemPromise(id: string) {
        return id in this.itemPromises
    }
    private hasItem(id: string) {
        return id in this.items
    }

    private async reloadItem(id: string) {
        delete this.itemTimeouts[id]
        this.resolveItem(await this.itemGetters[id]())
    }

    private async scheduleItem(id: string) {
        if ((this.itemObservers[id] || []).length > 0) {
            const duration = Math.max(this.random() - (Date.now() - this.itemTimestamps[id]), 0)
            this.itemTimeouts[id] = setTimeout(() => this.reloadItem(id), duration)
        }
    }

    // ... protected methods

    protected async promiseItem(id: string, promise: Promise<T>) {
        this.itemPromises[id] = promise
        const item = this.resolveItem(await promise)
        delete this.itemPromises[id]
        return item
    }

    protected resolveItem(item: T) {
        const previous = this.items[item.id]
        this.itemTimestamps[item.id] = Date.now()
        this.items[item.id] = item
        if (!previous || !deepEqual(previous, item)) {
            for (const observer of this.itemObservers[item.id] || []) {
                if (item.deleted === null) {
                    observer(item)
                } else {
                    observer(undefined)
                }
            }
            this.patchFindIndices(item)
        }
        this.scheduleItem(item.id)
        return item
    }

    protected getItem(id: string)  {
        return this.items[id]
    }

    protected observeItem(id: string, getter: () => Promise<T>, observer: (item: T, error?: string) => void) {
        this.observeItemInternal(id, getter, observer)
        return () => this.unobserveItemInternal(id, observer)
    }

    // FIND

    // ... private fields

    private findGetters: {[key: string]: () => Promise<T[]>} = {}
    private findSelectors: {[key: string]: (item: T) => boolean} = {}
    private findPromises: {[key: string]: Promise<T[]>} = {}
    private findTimeouts: {[key: string]: NodeJS.Timeout} = {}
    private findTimestamps: {[key: string]: number} = {}
    private findObservers: {[key: string]: ((item: T[]) => void)[]} = {}
    private finds: {[key: string]: {[id: string]: boolean}} = {}

    // ... private methods

    private clearFind() {
        this.findGetters = {}
        this.findSelectors = {}
        this.findPromises = {}
        this.findTimeouts = {}
        this.findTimestamps = {}
        this.findObservers = {}
        this.finds = {}
    }

    private observeFindInternal(key: string, getter: () => Promise<T[]>, selector: (item: T) => boolean, observer: (items: T[]) => void) {
        this.findGetters[key] = getter
        this.findSelectors[key] = selector
        if (!(key in this.findObservers)) {
            this.findObservers[key] = []
        }
        this.findObservers[key].push(observer)
        if (this.hasFind(key)) {
            observer(this.getFind(key))
            if (!this.hasFindTimeout(key)) {
                this.scheduleFind(key)
            }
        } else if (!this.hasFindPromise(key)) {
            this.reloadFind(key)
        }
    }

    private unobserveFindInternal(key: string, callback: (items: T[]) => void) {
        this.findObservers[key].splice(this.findObservers[key].indexOf(callback), 1)
        if (this.findObservers[key].length == 0 && this.findTimeouts[key]) {
            clearTimeout(this.findTimeouts[key])
            delete this.findTimeouts[key]
        }
    }

    private hasFindTimeout(key: string) {
        return key in this.findTimeouts
    }
    private hasFindPromise(key: string) {
        return key in this.findPromises
    }
    private hasFind(key: string) {
        return key in this.finds
    }

    private async reloadFind(key: string) {
        delete this.findTimeouts[key]
        const promise = this.findGetters[key]()
        this.findPromises[key] = promise
        const item = this.resolveFind(key, await promise)
        delete this.findPromises[key]
        return item
    }

    private scheduleFind(key: string) {
        if ((this.findObservers[key] || []).length > 0) {
            const duration = Math.max(this.random() - (Date.now() - this.findTimestamps[key]), 0)
            this.findTimeouts[key] = setTimeout(() => this.reloadFind(key), duration)
        }
    }

    private patchFindIndices(item: T) {
        for (const key of Object.keys(this.finds)) {
            if (item.deleted === null && this.findSelectors[key](item)) {
                this.finds[key][item.id] = true
            } else {
                delete this.finds[key][item.id]
            }
            for (const callback of this.findObservers[key]) {
                callback(this.getFind(key))
            }
        }
    }

    // ... protected methods

    private resolveFind(key: string, find: T[]) {
        const previous = this.finds[key]
        this.findTimestamps[key] = Date.now()
        this.finds[key] = {}
        if (
            !previous ||
            Object.keys(previous).length != find.length ||
            !find.map(item => item.id in previous).reduce((a, b) => a && b, true) ||
            !find.map(item => deepEqual(item, this.getItem(item.id))).reduce((a, b) => a && b, true)
        ) {
            for (const item of find) {
                this.resolveItem(item)
                this.finds[key][item.id] = true
            }
            for (const callback of this.findObservers[key]) {
                callback(find)
            }
        }
        this.scheduleFind(key)
        return find
    }

    protected getFind(key: string) {
        if (key in this.finds) {
            return Object.keys(this.finds[key]).map(id => this.getItem(id)).filter(t => t && t.deleted === null)
        } else {
            return undefined
        }
    }

    protected find(key: string, reload: () => Promise<T[]>, include: (item: T) => boolean, callback: (items: T[], error?: string) => void) {
        this.observeFindInternal(key, reload, include, callback)
        return () => { this.unobserveFindInternal(key, callback) }
    }
    
}