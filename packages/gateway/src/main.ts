import express from 'express'
import proxy from 'http-proxy-middleware'

const app = express()

app.use('/rest', proxy({ target: 'http://localhost:3001' }))
app.use('/rest-doc', proxy({ target: 'http://localhost:3001' }))
app.use('/mqtt', proxy({ target: 'http://localhost:3004/', ws: true }))
app.use('/scripts/worker', proxy({ target: 'http://localhost:3005' }))
app.use('/', proxy({ target: 'http://localhost:3002' }))

app.listen(3000)