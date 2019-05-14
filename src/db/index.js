'use strict'

const uuidv4 = require('uuid/v4')
const fs = require('fs')
const model = require('./model')
const db = model()
const dbPath = `${process.cwd()}/sessions.json`

/**
 * List all sessions saved in the database
 *
 * @returns object: the db itself
 */
const list = () => {
  return db
}

/**
 * Get one session by sessionId saved in the database
 *
 * @param sessionId: a session id of the match
 * @returns object: an object representing one match of the provided sessionId
 */
const get = (sessionId) => {
  return db[sessionId]
}

/**
 * Create a new match with the given players
 *
 * @param playerIds: an array of player codes
 * @returns [object]: an array containing a new session id and an object representing the match
 */
const create = (playerIds) => {
  const sessionId = uuidv4()

  db[sessionId] = { players: {} }
  playerIds.forEach((playerId) => {
    db[sessionId].players[playerId] = {
      trackLost: false,
      results: []
    }
  })

  fs.writeFileSync(dbPath, JSON.stringify(db), { encoding: 'utf8', flag: 'w' })

  return [sessionId, db[sessionId]]
}

/**
 * Update the match status
 *
 * @param sessionId: a session id of the match
 * @param payload: an object containing score updates
 * @param payload[].trackLost: a boolean representing the status of player in the match,
 *  whether they are still in the match (true) or are eliminated from the match (false)
 * @param payload[].result: an object representing the score of the current round
 * @param payload[].result.title: the song name for the current round
 * @param payload[].result.score: the score of the current round
 * @returns object: an object representing the updated match
 */
const update = (sessionId, payload) => {
  const playerIds = Object.keys(payload)

  playerIds.forEach((playerId) => {
    db[sessionId].players[playerId].trackLost = payload[playerId].trackLost
    db[sessionId].players[playerId].results.push(payload[playerId].result)
  })

  fs.writeFileSync(dbPath, JSON.stringify(db), { encoding: 'utf8', flag: 'w' })

  return db[sessionId]
}

module.exports = {
  list,
  get,
  create,
  update
}
