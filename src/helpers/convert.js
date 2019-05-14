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

/**
 * Rank the players by their scores
 *
 * @param results
 * @returns [object]: the sorted scores, in descending order
 */
const rankPlayers = (results) => {
  return results.sort((a, b) => {
    return Object.values(b)[0].result.score > Object.values(a)[0].result.score
  })
}

module.exports = {
  convertScoreToNumber,
  rankPlayers
}
