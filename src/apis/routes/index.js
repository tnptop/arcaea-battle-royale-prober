'use strict'

const router = require('express').Router()
const session = require('../middlewares/session')

// GET /sessions
router.get('/sessions', session.listSessions)

// GET /session/:sessionId
router.get('/session/:sessionId', session.getSession)

// POST /session
router.post('/session', session.newSession)

// PATCH /session/:sessionId
router.patch('/session/:sessionId', session.updateSession)

module.exports = router

