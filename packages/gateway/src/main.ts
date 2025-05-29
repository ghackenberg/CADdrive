import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()

app.use('/rest', createProxyMiddleware({
    target: 'http://localhost:3001'
}))
app.use('/rest-doc', createProxyMiddleware({
    target: 'http://localhost:3001'
}))
app.use('/mqtt', createProxyMiddleware({
    target: 'http://localhost:3004/', ws: true
}))
app.use('/modules/worker', createProxyMiddleware({
    target: 'http://localhost:3005'
}))
app.use('/scripts/worker', createProxyMiddleware({
    target: 'http://localhost:3005'
}))
app.use('/', createProxyMiddleware({
    target: 'http://localhost:3002'
}))

app.listen(3000)