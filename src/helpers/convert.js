'use strict'

/**
 * Convert score to javascript Number for ease of sorting
 *
 * @param scoreString: a string representing the score which following this pattern: "xx,xxx,xxx"
 * @return number: the converted score, in integer
 */
const convertScoreToNumber = (scoreString) => {
  // remove commas, then cast it as a javascript Number
  return Number(scoreString.replace(/,/g, ''))
}

module.exports = { convertScoreToNumber }
