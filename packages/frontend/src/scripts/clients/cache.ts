import { JWK } from "jose"

import { Comment, Issue, Member, Milestone, Product, User, Version } from "productboard-common"

import { MqttAPI } from "./mqtt"
import { FileClient } from "./rest/file"
import { KeyClient } from "./rest/key"

type Index<T> = { [id: string]: T }
type Put<T> = (value: T) => T
type Callback<T> = (value: T) => void
type Unsubscribe = () => void
type Entity = { created: number, updated: number, deleted: number }

// Constant requests

const PUBLIC_JWK_REQUEST: Promise<JWK> = KeyClient.getPublicJWK()

// Variable requests

const FILE_REQUEST: Index<Promise<ArrayBuffer>> = {}

// Subscriptions

const USER_MESSAGE_SUBSCRIPTIONS: Index<Unsubscribe> = {}
const PRODUCT_MESSAGE_SUBSCRIPTIONS: Index<Unsubscribe> = {}

// Entity callbacks

const USER_CALLBACKS: Index<Callback<User>[]> = {}
const PRODUCT_CALLBACKS: Index<Callback<Product>[]> = {}
const MEMBER_CALLBACKS: Index<Callback<Member>[]> = {}
const ISSUE_CALLBACKS: Index<Callback<Issue>[]> = {}
const COMMENT_CALLBACKS: Index<Callback<Comment>[]> = {}
const MILESTONE_CALLBACKS: Index<Callback<Milestone>[]> = {}
const VERSION_CALLBACKS: Index<Callback<Version>[]> = {}

// Entities callbacks

const MEMBERS_CALLBACKS: Index<Callback<Member[]>[]> = {}
const ISSUES_CALLBACKS: Index<Callback<Issue[]>[]> = {}
const COMMENTS_CALLBACKS: Index<Callback<Comment[]>[]> = {}
const MILESTONES_CALLBACKS: Index<Callback<Milestone[]>[]> = {}
const VERSIONS_CALLBACKS: Index<Callback<Version[]>[]> = {}

// Entity caches

const USER_CACHE: Index<User> = {}
const PRODUCT_CACHE: Index<Product> = {}
const MEMBER_CACHE: Index<Member> = {}
const ISSUE_CACHE: Index<Issue> = {}
const COMMENT_CACHE: Index<Comment> = {}
const MILESTONE_CACHE: Index<Milestone> = {}
const VERSION_CACHE: Index<Version> = {}

const MEMBERS_CACHE: Index<Index<boolean>> = {}
const ISSUES_CACHE: Index<Index<boolean>> = {}
const COMMENTS_CACHE: Index<Index<boolean>> = {}
const MILESTONES_CACHE: Index<Index<boolean>> = {}
const VERSIONS_CACHE: Index<Index<boolean>> = {}

// Helper

function notify<T>(callbacks: Index<Callback<T>[]>, id: string, value: T) {
    for (const callback of callbacks[id] || []) {
        callback(value)
    }
}
function update<T extends Entity>(entityCache: Index<T>, childCache: Index<Index<boolean>>, entityCallbacks: Index<Callback<T>[]>, childCallbacks: Index<Callback<T[]>[]>, entityId: string, parentId: string, value: T) {
    if (!(entityId in entityCache) || entityCache[entityId].updated < value.updated) {
        // Update caches
        entityCache[entityId] = value
        if (parentId) {
            if (!(parentId in childCache)) {
                childCache[parentId] = {}
            }
            childCache[parentId][entityId] = true
        }
        // Notify callbacks
        notify(entityCallbacks, entityId, value)
        notify(childCallbacks, parentId, resolve(entityCache, childCache, parentId))
    }
    return entityCache[entityId]
}
function clear<T>(cache: Index<T>) {
    for (const key in cache) {
        delete cache[key]
    }
}
function putAll<T>(index: Index<T>, putOne: Put<T>) {
    for (const id in index || {}) {
        putOne(index[id])
    }
}
function subscribe<T>(index: Index<Callback<T>[]>, id: string, callback: Callback<T>) {
    if (!(id in index)) {
        index[id] = []
    }
    index[id].push(callback)
    return () => {
        index[id].splice(index[id].indexOf(callback), 1)
    }
}
function resolve<T extends Entity>(entityCache: Index<T>, childCache: Index<Index<boolean>>, parentId: string) {
    if (parentId in childCache) {
        const entityIds = Object.keys(childCache[parentId])
        const entities = entityIds.map(entityId => entityCache[`${parentId}-${entityId}`])
        return entities.filter(issue => !issue.deleted)
    }
    return null
}

// Subscribe

function subscribeUserMessage<T>(userId: string, index: Index<Callback<T>[]>, id: string, callback: Callback<T>, value: T) {
    const unsubscribe = subscribe(index, id, callback)
    if (!(userId in USER_MESSAGE_SUBSCRIPTIONS)) {
        USER_MESSAGE_SUBSCRIPTIONS[userId] = MqttAPI.subscribeUserMessages(userId, message => {
            putAll(message.data.users, CacheAPI.putUser)
        })
    }
    if (value) {
        callback(value)
    }
    return unsubscribe
}
function subscribeProductMessage<T>(productId: string, index: Index<Callback<T>[]>, id: string, callback: Callback<T>, value: T) {
    const unsubscribe = subscribe(index, id, callback)
    if (!(productId in PRODUCT_MESSAGE_SUBSCRIPTIONS)) {
        PRODUCT_MESSAGE_SUBSCRIPTIONS[productId] = MqttAPI.subscribeProductMessages(productId, message => {
            putAll(message.data.products, CacheAPI.putProduct)
            putAll(message.data.members, CacheAPI.putMember)
            putAll(message.data.issues, CacheAPI.putIssue)
            putAll(message.data.comments, CacheAPI.putComment)
            putAll(message.data.milestones, CacheAPI.putMilestone)
            putAll(message.data.versions, CacheAPI.putVersion)
        })
    }
    if (value) {
        callback(value)
    }
    return unsubscribe
}

// Put

export const CacheAPI = {

    // Load

    async loadPublicJWK() {
        return PUBLIC_JWK_REQUEST
    },
    async loadFile(fileId: string) {
        return FILE_REQUEST[fileId] || (FILE_REQUEST[fileId] = FileClient.getFile(fileId))
    },

    // Get entity

    getUser(userId: string) {
        return USER_CACHE[userId]
    },
    getProduct(productId: string) {
        return PRODUCT_CACHE[productId]
    },
    getMember(productId: string, memberId: string) {
        return MEMBER_CACHE[`${productId}-${memberId}`]
    },
    getIssue(productId: string, issueId: string) {
        return ISSUE_CACHE[`${productId}-${issueId}`]
    },
    getComment(productId: string, issueId: string, commentId: string) {
        return COMMENT_CACHE[`${productId}-${issueId}-${commentId}`]
    },
    getMilestone(productId: string, milestoneId: string) {
        return MILESTONE_CACHE[`${productId}-${milestoneId}`]
    },
    getVersion(productId: string, versionId: string) {
        return VERSION_CACHE[`${productId}-${versionId}`]
    },

    // Get entities

    getMembers(productId: string) {
        return resolve(MEMBER_CACHE, MEMBERS_CACHE, productId)
    },
    getIssues(productId: string) {
        return resolve(ISSUE_CACHE, ISSUES_CACHE, productId)
    },
    getComments(productId: string, issueId: string) {
        return resolve(COMMENT_CACHE, COMMENTS_CACHE, `${productId}-${issueId}`)
    },
    getMilestones(productId: string) {
        return resolve(MILESTONE_CACHE, MILESTONES_CACHE, productId)
    },
    getVersions(productId: string) {
        return resolve(VERSION_CACHE, VERSIONS_CACHE, productId)
    },

    // Subscribe entity

    subscribeUser(userId: string, callback: Callback<User>): Unsubscribe {
        return subscribeUserMessage(userId, USER_CALLBACKS, userId, callback, CacheAPI.getUser(userId))
    },
    subscribeProduct(productId: string, callback: Callback<Product>): Unsubscribe {
        return subscribeProductMessage(productId, PRODUCT_CALLBACKS, productId, callback, CacheAPI.getProduct(productId))
    },
    subscribeMember(productId: string, memberId: string, callback: Callback<Member>): Unsubscribe {
        return subscribeProductMessage(productId, MEMBER_CALLBACKS, `${productId}-${memberId}`, callback, CacheAPI.getMember(productId, memberId))
    },
    subscribeIssue(productId: string, issueId: string, callback: Callback<Issue>): Unsubscribe {
        return subscribeProductMessage(productId, ISSUE_CALLBACKS, `${productId}-${issueId}`, callback, CacheAPI.getIssue(productId, issueId))
    },
    subscribeComment(productId: string, issueId: string, commentId: string, callback: Callback<Comment>): Unsubscribe {
        return subscribeProductMessage(productId, COMMENT_CALLBACKS, `${productId}-${issueId}-${commentId}`, callback, CacheAPI.getComment(productId, issueId, commentId))
    },
    subscribeMilestone(productId: string, milestoneId: string, callback: Callback<Milestone>): Unsubscribe {
        return subscribeProductMessage(productId, MILESTONE_CALLBACKS, `${productId}-${milestoneId}`, callback, CacheAPI.getMilestone(productId, milestoneId))
    },
    subscribeVersion(productId: string, versionId: string, callback: Callback<Version>): Unsubscribe {
        return subscribeProductMessage(productId, VERSION_CALLBACKS, `${productId}-${versionId}`, callback, CacheAPI.getVersion(productId, versionId))
    },

    // Subscribe entities

    subscribeMembers(productId: string, callback: Callback<Member[]>): Unsubscribe {
        return subscribeProductMessage(productId, MEMBERS_CALLBACKS, productId, callback, CacheAPI.getMembers(productId))
    },
    subscribeIssues(productId: string, callback: Callback<Issue[]>): Unsubscribe {
        return subscribeProductMessage(productId, ISSUES_CALLBACKS, productId, callback, CacheAPI.getIssues(productId))
    },
    subscribeComments(productId: string, issueId: string, callback: Callback<Comment[]>): Unsubscribe {
        return subscribeProductMessage(productId, COMMENTS_CALLBACKS, `${productId}-${issueId}`, callback, CacheAPI.getComments(productId, issueId))
    },
    subscribeMilestones(productId: string, callback: Callback<Milestone[]>): Unsubscribe {
        return subscribeProductMessage(productId, MILESTONES_CALLBACKS, productId, callback, CacheAPI.getMilestones(productId))
    },
    subscribeVersions(productId: string, callback: Callback<Version[]>): Unsubscribe {
        return subscribeProductMessage(productId, VERSIONS_CALLBACKS, productId, callback, CacheAPI.getVersions(productId))
    },

    // Publish

    putUser(user: User) {
        const entityId = user.userId
        const parentId: string = null
        return update(USER_CACHE, {}, USER_CALLBACKS, {}, entityId, parentId, user)
    },
    putProduct(product: Product) {
        const entityId = product.productId
        const parentId: string = null
        return update(PRODUCT_CACHE, {}, PRODUCT_CALLBACKS, {}, entityId, parentId, product)
    },
    putMember(member: Member) {
        const entityId = `${member.productId}-${member.memberId}`
        const parentId = member.productId
        return update(MEMBER_CACHE, MEMBERS_CACHE, MEMBER_CALLBACKS, MEMBERS_CALLBACKS, entityId, parentId, member)
    },
    putIssue(issue: Issue) {
        const entityId = `${issue.productId}-${issue.issueId}`
        const parentId = issue.productId
        return update(ISSUE_CACHE, ISSUES_CACHE, ISSUE_CALLBACKS, ISSUES_CALLBACKS, entityId, parentId, issue)
    },
    putComment(comment: Comment) {
        const entityId = `${comment.productId}-${comment.issueId}-${comment.commentId}`
        const parentId = `${comment.productId}-${comment.issueId}`
        return update(COMMENT_CACHE, COMMENTS_CACHE, COMMENT_CALLBACKS, COMMENTS_CALLBACKS, entityId, parentId, comment)
    },
    putMilestone(milestone: Milestone) {
        const entityId = `${milestone.productId}-${milestone.milestoneId}`
        const parentId = milestone.productId
        return update(MILESTONE_CACHE, MILESTONES_CACHE, MILESTONE_CALLBACKS, MILESTONES_CALLBACKS, entityId, parentId, milestone)
    },
    putVersion(version: Version) {
        const entityId = `${version.productId}-${version.versionId}`
        const parentId = version.productId
        return update(VERSION_CACHE, VERSIONS_CACHE, VERSION_CALLBACKS, VERSIONS_CALLBACKS, entityId, parentId, version)
    },

    // Other

    clear() {
        // Requests
        
        clear(FILE_REQUEST)

        // Subscriptions

        for (const userId in USER_MESSAGE_SUBSCRIPTIONS) {
            USER_MESSAGE_SUBSCRIPTIONS[userId]()
        }
        for (const productId in PRODUCT_MESSAGE_SUBSCRIPTIONS) {
            PRODUCT_MESSAGE_SUBSCRIPTIONS[productId]()
        }

        clear(USER_MESSAGE_SUBSCRIPTIONS)
        clear(PRODUCT_MESSAGE_SUBSCRIPTIONS)

        // Entity callbacks

        clear(USER_CALLBACKS)
        clear(PRODUCT_CALLBACKS)
        clear(MEMBER_CALLBACKS)
        clear(ISSUE_CALLBACKS)
        clear(COMMENT_CALLBACKS)
        clear(MILESTONE_CALLBACKS)
        clear(VERSION_CALLBACKS)

        // Entities callbacks

        clear(MEMBERS_CALLBACKS)
        clear(ISSUES_CALLBACKS)
        clear(COMMENTS_CALLBACKS)
        clear(MILESTONES_CALLBACKS)
        clear(VERSIONS_CALLBACKS)

        // Entity caches

        clear(USER_CACHE)
        clear(PRODUCT_CACHE)
        clear(MEMBER_CACHE)
        clear(ISSUE_CACHE)
        clear(COMMENT_CACHE)
        clear(MILESTONE_CACHE)
        clear(VERSION_CACHE)

        // Entities caches

        clear(MEMBERS_CACHE)
        clear(ISSUES_CACHE)
        clear(COMMENTS_CACHE)
        clear(MILESTONES_CACHE)
        clear(VERSIONS_CACHE)
    }
}