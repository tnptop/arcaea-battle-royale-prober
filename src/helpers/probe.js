'use strict'

const puppeteer = require('./puppeteer')
const convert = require('./convert')

const url = 'https://redive.estertion.win/arcaea/probe/'

/**
 * Initialize the browser and pages for each players
 *
 * @param playerIds: an array of player codes
 * @returns {Promise<{browser: *, pages: *}>}: instances of Browser and Pages
 */
const setProbers = async (playerIds) => {
  const options = { headless: true, args: ['--no-sandbox'] }
  const browser = await puppeteer.setup(options)
  const pages = await puppeteer.newPages(browser, playerIds.length)

  return { browser, pages }
}

/**
 * Probe and retrieve the scores of a player
 *
 * @param playerId: a number representing player code
 * @param page: a Page instance corresponded to playerId
 * @returns {Promise<{title: string, score: number}>}: the song title and the player score
 */
const probeLatestPlay = async (playerId, page) => {
  console.log('probing:', playerId)
  // navigate to the prober & query the data by playerId
  await page.goto(url)
  await page.type('#user-code', playerId)
  await page.click('#submit')
  await page.waitForSelector('#user-info div.score-item .song-score')

  // extract song title and score from the page
  const title = await page.evaluate(
    () => document.querySelector('#user-info div.score-item .song-title').innerHTML
  )
  const score = await page.evaluate(
    () => document.querySelector('#user-info div.score-item .song-score').innerHTML
  )

  // close the page to unblock the process
  await page.close()

  return {
    [playerId]: {
      result: {
        title,
        score: convert.convertScoreToNumber(score)
      }
    }
  }
}

/**
 * Close the browser instance
 *
 * @param browser: a Browser instance
 * @returns {Promise<void>}
 */
const closeProbers = async (browser) => {
  await puppeteer.teardown(browser)
}

/**
 * Probe and retrieve scores of players
 *
 * @param playerIds: an array of player codes
 * @returns {Promise<[object]>}: an array of the scores
 */
const probe = async (playerIds) => {
  const { browser, pages } = await setProbers(playerIds)
  const players = playerIds.map((id, index) => [id, pages[index]])
  const results = await Promise.all(players.map((player) => probeLatestPlay(...player)))
  await closeProbers(browser)

  return results
}

// probe(['090102644', '058190603', '331080689'])

module.exports = { probe }
