import http from 'http'
import net from 'net'

import Aedes from 'aedes'
import axios from "axios"
import { importJWK, jwtVerify, JWK, KeyLike } from 'jose'
import { IsNull } from 'typeorm'
import ws from 'ws'

import { ProductMessage, UserMessage } from 'productboard-common'
import { Database, compileProductMessage, compileUserMessage } from 'productboard-database'

type Index<T> = { [key: string]: T }

// Variables

let JWK_PUBLIC_KEY: KeyLike | Uint8Array // Load JWT public key from Nest.js backend later!

// Constants

const NET_PORT = 3003
const HTTP_PORT = 3004

const CLIENT_USER_IDS: Index<string> = {} // Remember user ID of each MQTT client
const USER_ADMINS: Index<boolean> = {} // Remember user admin flag of each MQTT client
const PRODUCT_PUBLIC: Index<boolean> = {} // Remember product public flag
const PRODUCT_MEMBERS: Index<Index<boolean>> = {} // Remember product members list

const MAX_REPETITIONS = 30
const REPETITION_TIMEOUT = 2000

// Functions

function tryLoadJWK(repetition: number, resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void) {
    axios.get<JWK>('http://localhost:3001/rest/keys').then(response => {
        importJWK(response.data, "PS256").then(jwkPublicKey => {
            JWK_PUBLIC_KEY = jwkPublicKey
            console.log(new Date(), 'JWK loaded and imported successfully')
            resolve()
        }).catch(error => {
            console.log(new Date(), `Could not import JWK ${repetition + 1} times (trying again in ${REPETITION_TIMEOUT} ms)`)
            if (repetition < MAX_REPETITIONS) {
                setTimeout(() => tryLoadJWK(repetition + 1, resolve, reject), REPETITION_TIMEOUT)
            } else {
                reject(error)
            }
        })
    }).catch(error => {
        console.log(new Date(), `Could not load JWK ${repetition + 1} times (trying again in ${REPETITION_TIMEOUT} ms)`)
        if (repetition < MAX_REPETITIONS) {
            setTimeout(() => tryLoadJWK(repetition + 1, resolve, reject), REPETITION_TIMEOUT)
        } else {
            reject(error)
        }
    })
}
async function loadJWK(): Promise<void> {
    return new Promise<void>((resolve, reject) => tryLoadJWK(0, resolve, reject))
}

async function boot() {
    // Database

    await Database.init()

    // MQTT Broker

    const aedes = new Aedes()

    // MQTT Broker - Authenticate

    aedes.authenticate = async (client, username, _password, callback) => {
        try {

            console.log(new Date(), 'authenticate', client.id)

            if (username) {
                // Load JWT public key from Nest.js backend if necessary!
                !JWK_PUBLIC_KEY && await loadJWK()
                // Verify JWT (throws exception if not valid!)
                const result = await jwtVerify(username, JWK_PUBLIC_KEY)
                // Parse user ID from token payload
                const payload = result.payload as { userId: string }
                const userId = payload.userId
                // Remember user ID of MQTT client
                CLIENT_USER_IDS[client.id] = userId
                // Remember user admin flag
                if (userId && !(userId in USER_ADMINS)) {
                    const user = await Database.get().userRepository.findOneBy({ userId })
                    USER_ADMINS[userId] = !user || user.admin
                }
                // Allow authenticate
                callback(null, true)
            } else {
                // Remember user ID of MQTT client
                CLIENT_USER_IDS[client.id] = null
                // Allow authenticate
                callback(null, true)
            }
        } catch (e) {

            console.error(new Date(), 'Authenticate exception', e)

            // Remember user ID of MQTT client
            CLIENT_USER_IDS[client.id] = null
            // Allow authenticate
            callback(null, true)
        }
    }

    // MQTT Broker - Authorize

    aedes.authorizeSubscribe = async (client, subscription, callback) => {
        try {

            console.log(new Date(), 'authorizeSubscribe', client.id, subscription.topic)

            // User topics do not require any further action
            const userMatch = subscription.topic.match(/\/users\/(.*)/)

            if (userMatch) {
                // Parse topic
                const userId = userMatch[1]

                // Schedule initialization
                setTimeout(async () => {
                    const users = await Database.get().userRepository.findBy({ userId, deleted: IsNull() })
                    const message = await compileUserMessage({ type: 'state', users })
                    client.publish({
                        cmd: 'publish',
                        dup: false,
                        payload: JSON.stringify(message),
                        qos: 0,
                        retain: false,
                        topic: subscription.topic,
                    }, error => {
                        if (error) {
                            console.error(new Date(), 'Could not initialize user', error)
                        }
                    })
                }, 0)

                // Allow subscribe
                return callback(null, subscription)
            }

            // For product topics, the product data has to be loaded
            const productMatch = subscription.topic.match(/\/products\/(.*)/)

            if (productMatch) {
                // Parse topic
                const productId = productMatch[1]

                // Load product public
                if (!(productId in PRODUCT_PUBLIC)) {
                    const product = await Database.get().productRepository.findOneByOrFail({ productId, deleted: IsNull() })
                    PRODUCT_PUBLIC[productId] = product.public
                }

                // Load product members
                if (!(productId in PRODUCT_MEMBERS)) {
                    const members = await Database.get().memberRepository.findBy({ productId, deleted: IsNull() })
                    PRODUCT_MEMBERS[productId] = {}
                    for (const member of members) {
                        PRODUCT_MEMBERS[productId][member.userId] = true
                    }
                }

                // Schedule initialization
                const userId = CLIENT_USER_IDS[client.id]
                if (USER_ADMINS[userId] || PRODUCT_PUBLIC[productId] || PRODUCT_MEMBERS[productId][userId]) {
                    setTimeout(async () => {
                        const products = await Database.get().productRepository.findBy({ productId, deleted: IsNull() })
                        const members = await Database.get().memberRepository.findBy({ productId, deleted: IsNull() })
                        const issues = await Database.get().issueRepository.findBy({ productId, deleted: IsNull() })
                        const comments = await Database.get().commentRepository.findBy({ productId, deleted: IsNull() })
                        const milestones = await Database.get().milestoneRepository.findBy({ productId, deleted: IsNull() })
                        const versions = await Database.get().versionRepository.findBy({ productId, deleted: IsNull() })
                        const message = await compileProductMessage({ type: 'state', products, members, issues, comments, milestones, versions })
                        client.publish({
                            cmd: 'publish',
                            dup: false,
                            payload: JSON.stringify(message),
                            qos: 0,
                            retain: false,
                            topic: subscription.topic
                        }, error => {
                            if (error) {
                                console.error(new Date(), 'Could not initialize product', error)
                            }
                        })
                    }, 0)
                }

                // Allow subscribe
                return callback(null, subscription)
            }

            // Deny subscribe
            return callback(new Error('Topic does not exist'), null)
        } catch (e) {

            console.error(new Date(), 'Authorize subscribe exception', e)

            // Deny subscribe
            return callback(e, null)
        }
    }
    
    aedes.authorizePublish = async (client, packet, callback) => {

        console.log(new Date(), 'authorizePublish', client.id, packet.topic)

        // Only backend can publish messages!
        if (CLIENT_USER_IDS[client.id] == 'backend') {

            // Allow publish
            callback(null)

            // Update user admin
            const userMatch = packet.topic.match(/\/users\/(.*)/)

            if (userMatch) {
                // Parse topic and payload
                const userId = userMatch[1]
                const userMessage = JSON.parse(packet.payload.toString()) as UserMessage

                // Update user asdmin
                if (userMessage.users) {
                    const user = userMessage.users[0]
                    USER_ADMINS[userId] = user.admin
                }
            }

            // Update product public
            const productMatch = packet.topic.match(/\/products\/(.*)/)

            if (productMatch) {
                // Parse topic and payload
                const productId = productMatch[1]
                const productMessage = JSON.parse(packet.payload.toString()) as ProductMessage

                // Update product public
                if (productMessage.products) {
                    const product = productMessage.products[0]
                    PRODUCT_PUBLIC[productId] = product.public
                }

                // Update product members
                if (productId in PRODUCT_MEMBERS && productMessage.members) {
                    for (const member of productMessage.members) {
                        PRODUCT_MEMBERS[productId][member.userId] = !member.deleted
                    }
                }
            }

        } else {
            // Deny publish
            callback(new Error('You are not allowed to publish'))
        }
    }

    aedes.authorizeForward = (client, packet) => {

        console.log(new Date(), 'authorizeForward', client.id, packet.topic)

        // User topics can be forwarded without further checks
        const userMatch = packet.topic.match(/\/users\/(.*)/)

        if (userMatch) {
            // Allow forward
            return packet
        }

        // Product topics have to be checked more carefully
        const productMatch = packet.topic.match(/\/products\/(.*)/)

        if (productMatch) {
            // Get IDs
            const userId = CLIENT_USER_IDS[client.id]
            const productId = productMatch[1]

            // Check user admin
            if (USER_ADMINS[userId]) {
                // Allow forward
                return packet
            }
            // Check product public
            if (PRODUCT_PUBLIC[productId]) {
                // Allow forward
                return packet
            }
            // Check product members
            if (PRODUCT_MEMBERS[productId][userId]) {
                // Allow forward
                return packet
            }

            // Deny forward
            return null
        }

        // Deny forward
        return null
    }

    // MQTT Broker - Events

    aedes.on('subscribe', (subscriptions, client) => {

        console.log(new Date(), 'subscribe', client.id, subscriptions[0].topic)

    })
    aedes.on('unsubscribe', (unsubscriptions, client) => {

        console.log(new Date(), 'unsubscribe', client.id, unsubscriptions[0])

    })
    aedes.on('publish', (packet, client) => {

        client && console.log(new Date(), 'publish', client.id, packet.topic)

    })
    aedes.on('clientDisconnect', client => {

        console.log(new Date(), 'clientDisconnect', client.id)

        delete CLIENT_USER_IDS[client.id]
    })

    // Net server

    const netServer = net.createServer(socket => aedes.handle(socket, undefined))
    netServer.listen(NET_PORT, () => {

        console.log(new Date(), 'NET server listening')

    })

    // HTTP server

    const httpServer = http.createServer()
    httpServer.listen(HTTP_PORT, () => {

        console.log(new Date(), 'HTTP server listening')

    })

    // WebSocket server

    const wsServer = new ws.Server({ server: httpServer })
    wsServer.on('connection', (socket, request) => {
        const stream = ws.createWebSocketStream(socket)
        aedes.handle(stream, request)
    })
}

// Calls

boot()