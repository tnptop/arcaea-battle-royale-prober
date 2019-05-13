'use strict'

const fs = require('fs')
const fsPromises = fs.promises
const dbPath = `${process.cwd()}/sessions.json`

/**
 * Schema:
 * sessions {
 *   [sessionID1]: {
 *     players: {
 *       [playerID1]: {
 *         trackLost: true || false,
 *         results: [{
 *           title: '',
 *           score: [0, 10,000,000]
 *         }, {
 *           ...
 *         }]
 *       },
 *       [playerID2]: {
 *         ...
 *       },
 *       ...
 *     }
 *   },
 *   [sessionID2]: {
 *     ...
 *   },
 *   ...
 * }
 */

module.exports = async () => {
  let db = {}

  try {
    await fsPromises.access(dbPath)
    db = require(dbPath)
  } catch (e) {
    await fsPromises.writeFile(dbPath, JSON.stringify(db), 'utf8')
  }

  return db
}
