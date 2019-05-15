/**
 * Global variables
 */
// songinfo from js/songinfo.js
// songkeys from js/songkeys.js

/**
 * Shared variables
 */
let players = []
let roundNumber = -1

/**
 * Helpers
 */

/**
 * Convert the number of seconds to readable time
 *
 * @param seconds: the number of seconds in integer
 * @returns {string}: readable time in 'mm:ss' format
 */
convertSecondsToMinuteDisplay = (seconds) => {
  let minute = Math.floor(seconds / 60)
  let second = seconds % 60

  return `${minute}:${String(second).padStart(2, '0')}`
}

/**
 * Convert the readable time to the number of seconds
 *
 * @param minuteString: readable time in 'mm:ss' format
 * @returns {number}: the number of seconds in integer
 */
convertMinuteDisplayToSeconds = (minuteString) => {
  return ((minutes, seconds) => 60 * Number(minutes) + Number(seconds)).apply(null, minuteString.split(':'))
}

/**
 * Match management
 */

/**
 * Start the match by retrieving player info
 */
init = () => {
  players = []
  roundNumber = 1
  $('#round-number').html(roundNumber)
  $('.row.match').removeAttr('style')
  $('#init-match').attr('disabled', true)
  players = $('#player-id').val().split(',').map((id) => id.trim())
  players.forEach((playerId) => probe(playerId, 'init'))
}

/**
 * Round management
 */

/**
 * Start the round after the song is selected
 */
startRound = () => {
  let roundButton = $('#round-btn')
  let roundDurationElem = $('#round-duration')
  let secondsLeft = convertMinuteDisplayToSeconds(roundDurationElem.html())
  let handle = setInterval(() => {
    roundDurationElem.html(convertSecondsToMinuteDisplay(--secondsLeft))
    if (secondsLeft === 0) {
      clearInterval(handle)
      // probe for every players' score right after the round ends
      players.forEach((playerId) => probe(playerId, 'update'))
      roundButton.attr('disabled', false)
    }
  }, 10)

  // set the start and end time
  let start = Date.now()
  let end = start + (secondsLeft * 1000)
  $('#round-timestamp').html(`${new Date(start).toLocaleTimeString('default')} - ${new Date(end).toLocaleTimeString('default')}`)

  // clear the results of players who have not track lost
  players.forEach((playerId) => {
    updatePlayerRow(
      getLatestPlay(playerId,{
          name: $(`tr.${playerId} th`).html(),
          recent_score: [{}]
        },false)
    )
  })

  // convert button to allow ranking
  roundButton.attr('disabled', true)
  roundButton.attr('onclick', 'rankPlayers()')
  roundButton.html('Rank')
}

/**
 * End the current round
 */
endRound = () => {
  // increment roundNumber
  $('#round-number').html(++roundNumber)

  // clear song input
  $('#song').val('')
  $('#duration').html('')
  $('#round-duration').html('')
  $('#round-timestamp').html('')

  // convert button back to start
  $('#round-btn').attr('onclick', 'startRound()')
  $('#round-btn').html('Start')
}

/**
 * Eliminate the player with playerId out of the match
 *
 * @param playerId: the 9-digit player ID
 */
disqualifyPlayer = (playerId) => {
  // grey out the player in the scoreboard
  let playerRow = $(`tr.${playerId}`)
  let dqButton = $(`#dq-${playerId}`)
  let syncButton = $(`#sync-${playerId}`)
  playerRow.addClass('track-lost').removeClass('track-not-lost')
  dqButton.attr('disabled', true)
  dqButton.addClass('btn-secondary').removeClass('btn-primary')
  syncButton.attr('disabled', true)
  syncButton.addClass('btn-secondary').removeClass('btn-primary')

  // remove the player from the game
  let index = players.findIndex((id) => id === playerId)
  players.splice(index, 1)

  // place the player at the bottom of the scoreboard
  let playerRowsElem = $('tbody tr')
  let playerRows = []
  let dqPlayerRows = []
  for (let i = 0; i < playerRowsElem.length; i++) {
    if (playerRowsElem[i].getAttribute('class').includes('track-lost')) {
      dqPlayerRows.push(playerRowsElem[i].outerHTML)
    } else {
      playerRows.push(playerRowsElem[i].outerHTML)
    }
  }
  let newScoreboard = [...playerRows, ...dqPlayerRows].reduce((board, row) => {
    return board + row
  }, '<tbody>')
  newScoreboard += '</tbody>'

  $('tbody').replaceWith(newScoreboard)
}

/**
 * Rank and arrange the scoreboard
 */
rankPlayers = () => {
  const SCORE_TD_POSITION = 2
  const SCORE_POSITION = 0

  let playerElem = $('tbody tr.track-not-lost')
  let dqPlayerElem = $('tbody tr.track-lost')
  let getScore = (elem) => {
    return elem.children[SCORE_TD_POSITION].children[SCORE_POSITION].innerHTML
  }

  // sort by total score
  playerElem.sort((a, b) => {
    return getScore(b) - getScore(a)
  })

  // replace current scoreboard
  let rankedScoreboardDOM = [...playerElem, ...dqPlayerElem]
  for (let i = 0; i < rankedScoreboardDOM.length; i++) {
    rankedScoreboardDOM[i] = rankedScoreboardDOM[i].outerHTML
  }
  let rankedScoreboard = rankedScoreboardDOM.reduce((board, row) => {
    return board + row
  }, '<tbody>')
  rankedScoreboard += '</tbody>'

  $('tbody').replaceWith(rankedScoreboard)

  // convert button back to end
  $('#round-btn').attr('onclick', 'endRound()')
  $('#round-btn').html('End')
}

/**
 * Score probing
 */

/**
 * Communicate with the server to retrieve the latest play info of playerId
 *
 * @param playerId: the 9-digit player ID
 * @param action: either 'init' or 'update'
 */
probe = (playerId, action) => {
  const ws = new WebSocket('wss://arc.estertion.win:616')
  ws.binaryType = 'arraybuffer'

  // use declaration syntax for named function
  ws.onopen = function open() {
    console.log('querying the data of:', playerId)
    ws.send(String(playerId)) // there exist ID with leading zero, thus stringify it
  }

  ws.onclose = function close() {
    console.log(playerId, 'done')
  }

  ws.onmessage = function incoming({ data }) {
    if (data.byteLength) {
      let message = BrotliDecompress(new Uint8Array(data))
      message = String.fromCharCode.apply(String, message)
      message = JSON.parse(decodeURIComponent(escape(message)))
      let playerInfo = {}

      if (message.cmd === 'userinfo') {
        switch (action) {
          case 'init':
            playerInfo = getLatestPlay(playerId, message.data, false)
            generatePlayerRow(playerInfo)
            break
          case 'update':
            playerInfo = getLatestPlay(playerId, message.data, true)
            updatePlayerRow(playerInfo)
            break
        }
        ws.close()
      }
    }
  }
}

/**
 * Transform the latest play data to be more readable & meaningful
 *
 * @param playerId: the 9-digit player ID
 * @param data: the latest play info retrieved from the server
 * @param flag: retain the data or not (latest play or init match)
 * @returns {{score: number, name: *, rawScore: number, farCount: number, leadingScore: string, title: string, timestamp}}
 */
getLatestPlay = (playerId, data, flag) => {
  const {
    song_id,
    score,
    near_count,
    miss_count,
    shiny_perfect_count,
    time_played
  } = data.recent_score[0]

  return {
    id: playerId,
    name: data.name,
    title: flag ? songinfo[song_id].en : '----',
    score: flag ? score : '----',
    leadingScore: flag ? String(score).padStart(8, '0').slice(0, 4) : '----',
    rawScore: flag ? score - shiny_perfect_count : '----',
    farCount: flag ? near_count + (miss_count * 2) : '----',
    rawFarCount: flag ? `F${near_count}, L${miss_count}` : '----',
    timestamp: flag ? new Date(time_played).toLocaleString('en-US') : '----'
  }
}

/**
 * Add new player to the scoreboard
 *
 * @param playerInfo: the player info from getLatestPlay()
 */
generatePlayerRow = (playerInfo) => {
  const playerRow = `
    <tr class="track-not-lost ${playerInfo.id}">
      <th scope="row">${playerInfo.name}</th>
      <td>${playerInfo.title}</td>
      <td><span class="score">${playerInfo.score}</span><br>(${playerInfo.rawScore})</td>
      <td><span class="far-count">${playerInfo.farCount}</span><br>(${playerInfo.rawFarCount})</td>
      <td>${playerInfo.timestamp}</td>
      <td><button class="btn btn-primary" type="button" id="dq-${playerInfo.id}" onclick="disqualifyPlayer('${playerInfo.id}')">DQ</button></td>
      <td><button class="btn btn-primary" type="button" id="sync-${playerInfo.id}" onclick="probe('${playerInfo.id}', 'update')">↻</button></td>
    </tr>
  `
  $('#scoreboard tbody').append(playerRow)
}

/**
 * Update the player in the scoreboard
 *
 * @param playerInfo: the player info from getLatestPlay()
 */
updatePlayerRow = (playerInfo) => {
  const playerRow = `
    <tr class="track-not-lost ${playerInfo.id}">
      <th scope="row">${playerInfo.name}</th>
      <td>${playerInfo.title}</td>
      <td><span class="score">${playerInfo.score}</span><br>(${playerInfo.rawScore})</td>
      <td><span class="far-count">${playerInfo.farCount}</span><br>(${playerInfo.rawFarCount})</td>
      <td>${playerInfo.timestamp}</td>
      <td><button class="btn btn-primary" type="button" id="dq-${playerInfo.id}" onclick="disqualifyPlayer('${playerInfo.id}')">DQ</button></td>
      <td><button class="btn btn-primary" type="button" id="sync-${playerInfo.id}" onclick="probe('${playerInfo.id}', 'update')">↻</button></td>
    </tr>
  `
  $(`.${playerInfo.id}`).replaceWith(playerRow)
}

/**
 * Bootstrap Autocomplete
 */

/**
 * Custom function for Bootstrap Autocomplete to perform searching
 *
 * @param query: a string of partial song name
 * @param callback: a function passed by Autocomplete component
 */
searchSong = (query, callback) => {
  const hitResults = songkeys
    .filter(([key, name]) => key.toLowerCase().includes(query) || name.toLowerCase().includes(query))
    .map(([value, text]) => ({ value, text }))

  callback(hitResults)
}

/**
 * Retrieve the song duration and calculate the current round duration
 *
 * @param event: event from the component
 * @param item: an object represents selected song
 */
selectSong = (event, item) => {
  const { duration, baseRoundDuration } = songinfo[item.value]
  const roundNumber = Number($('#round-number').html())
  let roundDuration = baseRoundDuration

  // Song Base Duration
  $('#duration').html(duration)

  // Round Duration
  if (roundNumber === 1) roundDuration += 180
  else if (roundNumber >= 2 && roundNumber <= 4) roundDuration += 120
  else if (roundNumber >= 5 && roundNumber <= 7) roundDuration += 90
  else if (roundNumber >= 8) roundDuration += 60
  $('#round-duration').html(convertSecondsToMinuteDisplay(roundDuration))
}

// Set up autocomplete on element with .song-auto-complete class
$('.song-auto-complete').autoComplete({
  resolver: 'custom',
  minLength: 2,
  events: {
    search: searchSong
  }
})
$('.song-auto-complete').on('autocomplete.select', selectSong)
