import { connect, MqttClient } from 'mqtt'
import { matches } from 'mqtt-pattern'

type handler = (topic: string, payload: string | Buffer) => void

const handlers: { [topic: string]: handler[] } = {}

let client: MqttClient

const protocol = location.protocol == 'http:' ? 'ws' : 'wss'
const hostname = location.hostname
const port = parseInt(location.port)

function init() {
    // Connect client
    client = connect({ protocol, hostname, port, path: '/mqtt', username: localStorage.getItem('jwt') })

    // Subscribe after connecting
    client.on('connect', packet => {
        console.log('connect', packet)
        for (const pattern in handlers) {
            client.subscribe(pattern)
        }
    })

    // Forward message to handlers
    client.on('message', (topic, payload, packet) => {
        console.log('message', topic, payload, packet)
        for (const pattern in handlers) {
            if (matches(pattern, topic)) {
                for (const handler of handlers[pattern]) {
                    handler(topic, payload)
                }
            }
        }
    })

    // Initialize client after disconnection
    client.on('end', () => {
        init()
    })
}

init()

export const MqttAPI = {
    subscribe(topic: string, handler: (topic: string, message: string | Buffer) => void) {
        // Initialize handlers
        if (!(topic in handlers)) {
            handlers[topic] = []
            if (client.connected) {
                client.subscribe(topic)
            }
        }
        // Add handler
        handlers[topic].push(handler)
        // Return unsubscribe function
        return () => {
            handlers[topic].splice(handlers[topic].indexOf(handler), 1)
            if (handlers[topic].length == 0) {
                delete handlers[topic]
                if (client.connected) {
                    client.unsubscribe(topic)
                }
            }
        }
    },
    publish(topic: string, message: string | Buffer) {
        client.publish(topic, message)
    },
    reconnect() {
        client.end()
    }  
}