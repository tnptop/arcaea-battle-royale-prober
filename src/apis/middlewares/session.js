'use strict'

const db = require('../../db')

/**
 * GET /sessions
 *
 * @param req: express request object
 * @param res: express response object
 * @param next: the next middleware in request chain
 */
const listSessions = (req, res, next) => {
  res.status(200).json({
    sessions: db.list()
  })
}

/**
 * GET /session/:sessionId
 *
 * @param req: express request object
 * @param req.params.sessionId: a session ID of the match
 * @param res: express response object
 * @param next: the next middleware in request chain
 */
const getSession = (req, res, next) => {
  const sessionId = req.params.sessionId
  const session = db.get(sessionId)

  res.status(200).json({ session })
}

/**
 * POST /session
 *
 * @param req: express request object
 * @param req.body.players: an array of player codes
 * @param res: express response object
 * @param next: the next middleware in request chain
 */
const newSession = (req, res, next) => {
  const playerIds = req.body.players
  const [newSessionId, newSession] = db.create(playerIds)

  res.status(201).json({
    sessionId: newSessionId,
    session: newSession,
    message: `Game ${newSessionId} has been created.`
  })
}

/**
 * PATCH /session/:sessionId
 *
 * @param req: express request object
 * @param req.params.sessionId: a session ID of the match
 * @param res: express response object
 * @param next: the next middleware in request chain
 */
const updateSession = (req, res, next) => {
  const sessionId = req.params.sessionId
  let payload = {}
  const updatedSession = db.update(sessionId, payload)

  res.status(200).json({
    session: updatedSession
  })
}

module.exports = {
  listSessions,
  getSession,
  newSession,
  updateSession
}
