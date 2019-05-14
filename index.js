'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const cors = require('cors')
const helmet = require('helmet')
const router = require('./src/apis/routes')

const app = express()
app.use(cors())
app.use(compression())
app.use(bodyParser.json({ limit: '1mb' }))
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }))
app.use(helmet())
app.use(router)

app.listen(8000, () => console.log('listen on 127.0.0.1:8000'))
