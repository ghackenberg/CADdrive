import { connect, MqttClient } from 'mqtt'
import matches from 'mqtt-match'
import { nanoid } from 'nanoid'

import { ProductMessage, UserMessage } from 'productboard-common'

type handler = (topic: string, object: unknown) => void

const handlers: { [topic: string]: handler[] } = {}

let client: MqttClient

const protocol = location.protocol == 'http:' ? 'ws' : 'wss'
const hostname = location.hostname
const port = parseInt(location.port)
const path = '/mqtt'
const clientId = `productboard-frontend-${nanoid()}`

function init() {
    const username = localStorage.getItem('jwt')
    
    // Connect client
    client = connect({ protocol, hostname, port, path, clientId, username })

    // Subscribe after connecting
    client.on('connect', () => {
        for (const pattern in handlers) {
            client.subscribe(pattern)
        }
    })

    // Forward message to handlers
    client.on('message', (topic, payload) => {
        const object = JSON.parse(payload.toString())
        //console.log(object)
        for (const pattern in handlers) {
            if (matches(pattern, topic)) {
                for (const handler of handlers[pattern]) {
                    handler(topic, object)
                }
            }
        }
    })

    // Initialize client after disconnection
    client.on('end', init)
}
    
function subscribe<T>(topic: string, handler: (topic: string, object: T) => void) {
    // Initialize handlers and subscribe if connected
    if (!(topic in handlers)) {
        handlers[topic] = []
        if (client.connected) {
            client.subscribe(topic)
        }
    }
    
    // Register handler
    handlers[topic].push(handler)

    // Cleanup function
    return () => {
        if (topic in handlers) {
            // Unregister handler
            handlers[topic].splice(handlers[topic].indexOf(handler), 1)
            // Unsubscribe topic if no more handlers and connected
            if (handlers[topic].length == 0) {
                delete handlers[topic]
                if (client.connected) {
                    client.unsubscribe(topic)
                }
            }
        }
    }
}

init()

export const MqttAPI = {

    // Subscribe entity

    subscribeUserMessages(userId: string, callback: (message: UserMessage) => void) {
        const topic = `/users/${userId}`
        return subscribe<UserMessage>(topic, (_topic, message) => callback(message))
    },
    subscribeProductMessages(productId: string, callback: (message: ProductMessage) => void) {
        const topic = `/products/${productId}`
        return subscribe<ProductMessage>(topic, (_topic, message) => callback(message))
    },

    // Other

    clear() {
        for (const pattern in handlers) {
            delete handlers[pattern]
        }
        client.end()
    }

}