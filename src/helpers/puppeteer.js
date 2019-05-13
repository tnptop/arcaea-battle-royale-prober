'use strict'

const puppeteer = require('puppeteer')

/**
 * Instantiate a new Browser instance
 *
 * @param options: an object represents puppeteer browser options
 * @returns {Promise<object>}: the new Browser instance
 */
const setup = async (options) => {
  return await puppeteer.launch(options)
}

/**
 * Close the Browser instance
 *
 * @param browser: a Browser instance
 * @returns {Promise<void>}
 */
const teardown = async (browser) => {
  await browser.close()
}

/**
 * Instantiate pageNum amount of Page instances
 *
 * @param browser: a Browser instance
 * @param pageNum: a total number of Page instances to be created
 * @returns {Promise<[page]>}: an array of Page instances
 */
const newPages = async (browser, pageNum) => {
  let pages = []
  for (let i = 0; i < pageNum; i++) {
    pages.push(browser.newPage())
  }

  return await Promise.all(pages)
}

module.exports = {
  setup,
  teardown,
  newPages
}
