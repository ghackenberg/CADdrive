import * as http from 'http'
import * as net from 'net'

import aedes from 'aedes'
import * as websocket from 'websocket-stream'

const handler = aedes()

const tcp = net.createServer(handler.handle)
const web = http.createServer()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
websocket.createServer({ server: web }, <any> handler.handle)

tcp.listen(1883)
web.listen(3004)