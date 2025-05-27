import { SignJWT } from 'jose'
import { connect } from 'mqtt'
import { nanoid } from 'nanoid'

import { KEY_PAIR } from './key'

const protocol = 'mqtt'
const hostname = 'localhost'
const port = 3003

export const MqttAPI = KEY_PAIR.then(async keys => {
    const privateKey = keys.privateKey
    const payload = { userId: 'backend' }
    const username = await new SignJWT(payload).setProtectedHeader({ alg: 'PS256' }).setExpirationTime('1y').sign(privateKey)
    return connect({ protocol, hostname, port, clientId: `productboard-backend-${nanoid()}`, username })
})