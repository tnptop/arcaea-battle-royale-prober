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
let currentRoundScore = {}

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
init = async () => {
  // initialize values
  players = []
  roundNumber = 1
  currentRoundScore = {}
  $('#round-number').html(roundNumber)
  $('.row.init').attr('style', 'display:none')

  // show scoreboard
  $('.row.match').removeAttr('style')
  $('#song-description').attr('style', 'margin-top: 0.5em')

  // disable the start match button
  $('#init-match').attr('disabled', true)

  // clear the previous scoreboard
  $('tbody').html('')

  // add players to the match
  players = new Set($('#player-id').val().split(',').map((id) => id.trim()))

  // exclude IDs for Hiraki and Tairitsu
  players.delete('000000001')
  players.delete('000000002')

  // convert players from Set to Array for more operations
  players = Array.from(players)

  // check for any invalid ID
  let invalidId = players.filter((player) => !(/^[0-9]{9}$/.test(player)))
  if (invalidId.length > 0) {
    $('.row.match').attr('style', 'display:none')
    $('.row.init').removeAttr('style')
    setTimeout(() => {
      $('#init-match').attr('disabled', false)
    }, 3000)
    $.notify({
      message: `ID ${invalidId.reduce((e, id) => e.concat(id) + ', ', '').slice(0, -2)} ${invalidId.length === 1 ? 'is' : 'are'} invalid. Please try again.`
    }, {
      type: 'danger',
      delay: '5000',
      allow_dismiss: false
    })
    return 0
  }

  // initialize the scoreboard
  players.forEach((player) =>
    appendPlayerRow(
      getLatestPlay(player, {
        name: player,
        recent_score: [{}]
      }, false)
    )
  )
  // greedily probe players, not waiting for graceful socket closing
  let start = new Date()
  await Promise.all(players.map((player) => {
    return new Promise(async (resolve, reject) => {
      try {
        await probe(player)
        return resolve()
      } catch (error) {
        $.notify({
          message: error.message
        }, {
          type: 'danger',
          delay: '3000',
          allow_dismiss: false
        })
        resolve()
      }
    })
  }))
  let end = new Date()
  console.log(`Total load time for ${players.length} players:`, (end - start) / 1000)

  // let the user know whether every player data is loaded or not
  let failedToLoadPlayers = Object.entries(currentRoundScore)
    .reduce((players, [id, record]) => {
      if (!record.id) players.push(id)
      return players
    }, [])

  if (failedToLoadPlayers.length === 0) {
    $.notify({
      message: 'The match is ready.'
    }, {
      type: 'success',
      delay: '3000',
      allow_dismiss: false
    })
  } else {
    $.notify({
      message: `Some players are not loaded. Press ↻ to try again.`
    }, {
      type: 'warning',
      delay: '3000',
      allow_dismiss: false
    })
  }
}

/**
 * Round management
 */

/**
 * Start the round after the song is selected
 */
startRound = async () => {
  let roundButton = $('#round-btn')
  let roundDurationElem = $('#round-duration')
  let secondsLeft = convertMinuteDisplayToSeconds(roundDurationElem.html())
  let handle = setInterval(async () => {
    roundDurationElem.html(convertSecondsToMinuteDisplay(--secondsLeft))
    if (secondsLeft === 0) {
      clearInterval(handle)
      // greedily probe players, not waiting for graceful socket closing
      let start = new Date()
      await Promise.all(players.map((player) => {
        return new Promise(async (resolve, reject) => {
          try {
            await probe(player)
            return resolve()
          } catch (error) {
            $.notify({
              message: error.message
            }, {
              type: 'danger',
              delay: '3000',
              allow_dismiss: false
            })
            resolve()
          }
        })
      }))
      let end = new Date()
      console.log(`Total load time for ${players} players:`, (end - start) / 1000)
      roundButton.attr('disabled', false)
    }
  }, 1)

  // set the start and end time
  let start = Date.now()
  let end = start + (secondsLeft * 1000)
  $('#round-timestamp').html(`${new Date(start).toLocaleTimeString('default')} - ${new Date(end).toLocaleTimeString('default')}`)

  // clear the results of players who have not track lost
  players.forEach((playerId) => {
    updatePlayerRow(
      getLatestPlay(playerId,{
          name: $(`tr#${playerId} th`)[0].childNodes[0].data,
          recent_score: [{}]
        },false
      )
    )
  })

  // convert button to allow ranking
  roundButton.attr('disabled', true)
  roundButton.attr('onclick', 'rankPlayers()')
  roundButton.html('Rank')
}

/**
 * End the current round and eliminate all players marked DQ
 */
endRound = () => {
  // increment roundNumber
  $('#round-number').html(++roundNumber)

  // clear song input
  $('#song').val('')
  $('#duration').html('')
  $('#round-duration').html('')
  $('#round-timestamp').html('')

  // remove disqualified players from the match
  $('tr.track-lost').each((_, player) => {
    let index = players.findIndex((id) => id === player.id)
    players.splice(index, 1)
  })

  // make the buttons of disqualified players unusable
  $('.btn-danger').attr('disabled', true)
  $('.btn-danger').addClass('btn-secondary').removeClass('btn-danger')

  // convert button back to start
  $('#round-btn').attr('disabled', true)
  $('#round-btn').attr('onclick', 'startRound()')
  $('#round-btn').html('Start')
}

/**
 * Mark the player with playerId as disqualified; the status can be evoked before the end of the round
 *
 * @param playerId: the 9-digit player ID
 */
disqualifyPlayer = (playerId) => {
  // grey out the player in the scoreboard
  let dqButton = $(`#dq-${playerId}`)
  let syncButton = $(`#sync-${playerId}`)
  $(`tr#${playerId}`).addClass('track-lost').removeClass('track-not-lost')
  dqButton.addClass('btn-danger').removeClass('btn-primary')
  dqButton.attr('onclick', `undisqualifyPlayer('${playerId}')`)
  syncButton.addClass('btn-secondary').removeClass('btn-primary')
  syncButton.attr('disabled', true)

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
 * Revoke disqualified status from the player with playerId before the end of the round
 *
 * @param playerId: the 9-digit player ID
 */
undisqualifyPlayer = (playerId) => {
  // revert the color back to normal
  let dqButton = $(`#dq-${playerId}`)
  let syncButton = $(`#sync-${playerId}`)
  $(`tr#${playerId}`).addClass('track-not-lost').removeClass('track-lost')
  dqButton.addClass('btn-primary').removeClass('btn-danger')
  dqButton.attr('onclick', `disqualifyPlayer('${playerId}')`)
  syncButton.addClass('btn-primary').removeClass('btn-secondary')
  syncButton.attr('disabled', false)

  // rank players again if the scoreboard is already ranked
  if ($('#round-btn').html() === 'End') rankPlayers()
}

/**
 * Rank and arrange the scoreboard
 */
rankPlayers = () => {
  let playerElem = $('tr.track-not-lost')
  let dqPlayerElem = $('tr.track-lost')

  // sort by score (descending; the higher the better) then FAR count (ascending; the lower the better)
  playerElem.sort((a, b) => {
    // extract score and FAR count
    let aLeadingScore = currentRoundScore[a.id].leadingScore
    let bLeadingScore = currentRoundScore[b.id].leadingScore
    let aFarCount = currentRoundScore[a.id].farCount
    let bFarCount = currentRoundScore[b.id].farCount

    // calculate sort order
    let scoreSort = bLeadingScore - aLeadingScore
    let farSort = aFarCount - bFarCount

    // sort by score first; if tie then sort by FAR count
    return scoreSort !== 0 ? scoreSort : farSort
  })

  // replace current scoreboard
  let rankedScoreboardDOM = [...playerElem, ...dqPlayerElem]
  let rankedScoreboard = rankedScoreboardDOM.reduce((board, row) => {
    return board + row.outerHTML
  }, '<tbody>')
  rankedScoreboard += '</tbody>'

  $('tbody').replaceWith(rankedScoreboard)

  // set the players variable to reflect the ranking
  players = rankedScoreboardDOM.map((playerDOM) => playerDOM.id)

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
 * @returns {Promise<void>}: resolve if successfully probed, reject with error otherwise
 */
probe = (playerId) => {
  return new Promise((resolve, reject) => {
    let error = {}
    const ws = new WebSocket('wss://arc.estertion.win:616')
    ws.binaryType = 'arraybuffer'
    let start = 0, end = 0

    // use declaration syntax for named function
    ws.onopen = function open () {
      console.log('querying the data of:', playerId)
      start = new Date()
      ws.send(String(playerId)) // there exist ID with leading zero, thus stringify it
    }

    ws.onclose = function close () {
      end = new Date()
      console.log(playerId, 'done, time elapsed:', (end - start) / 1000)
      // wait until the connection close ensure the reliability of requesting multiple sockets
      return error.message ? reject(error) : resolve()
    }

    ws.onerror = function error (event) {
      currentRoundScore[playerId] = {}
      console.log(playerId, 'error, time elapsed:', (end - start) / 1000)
      // in a case that connection to the server failed
      return reject({ message: 'Cannot connect to server. Please try again.' })
    }

    ws.onmessage = function incoming ({data}) {
      if (data.byteLength) {
        let message = BrotliDecompress(new Uint8Array(data))
        message = String.fromCharCode.apply(String, message)
        message = JSON.parse(decodeURIComponent(escape(message)))
        let playerInfo = {}

        if (message.cmd === 'userinfo') {
          if (message.data) {
            playerInfo = getLatestPlay(playerId, message.data, true)
            currentRoundScore[playerId] = playerInfo
            updatePlayerRow(playerInfo)
            ws.close() // force close the socket session since the data needed is retrieved
          }
        }
      } else if (data === 'invalid id') {
        error.restart = true
        error.message = `The ID ${playerId} is invalid.`
        console.log(`The ID ${playerId} is invalid.`)
      } else if (data === 'error,add') {
        let player = currentRoundScore[playerId] ? $(`tr#${playerId} th`)[0].childNodes[0].data : playerId
        let playerInfo = getLatestPlay(player, {
          name: player,
          recent_score: [{}]
        }, false)
        currentRoundScore[player] = {}
        console.log(`Cannot load player ${player} info.`)
        error.message = `Cannot load player ${player} info. Please try again.`
        updatePlayerRow(playerInfo)
      }
    }
  })
}

/**
 * Manually probe for custom notification
 *
 * @param playerId: the 9-digit player ID
 */
probeAsync = async (playerId) => {
  try {
    await probe(playerId)
  } catch (error) {
    $.notify({
      message: error.message
    }, {
      type: 'danger',
      delay: '3000',
      allow_dismiss: false
    })
  }
}

/**
 * Transform the latest play data to be more readable & meaningful
 *
 * @param playerId: the 9-digit player ID
 * @param data: the latest play info retrieved from the server
 * @param flag: retain the data or not (true if the data is expected to be loaded, false otherwise)
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
    leadingScore: flag ? String(score).padStart(8, '0').slice(0, 3) : '----',
    rawScore: flag ? score - shiny_perfect_count : '----',
    farCount: flag ? near_count + (miss_count * 2) : '----',
    rawFarCount: flag ? `F${near_count}, L${miss_count}` : '----',
    timestamp: flag ? (new Date(time_played).toLocaleString('en-US')).replace(' ', '<br>') : '----'
  }
}

/**
 * Generate DOM for a player in the scoreboard
 *
 * @param playerInfo: the player info from getLatestPlay()
 * @returns {string}: a string representing DOM for the player in the scoreboard
 */
generatePlayerRow = (playerInfo) => {
  return `
    <tr class="track-not-lost" id="${playerInfo.id}">
      <th scope="row">${playerInfo.name}<br>(${playerInfo.id})</th>
      <td>${playerInfo.title}</td>
      <td><span class="score">${playerInfo.score}</span><br>(${playerInfo.rawScore})</td>
      <td><span class="far-count">${playerInfo.farCount}</span><br>(${playerInfo.rawFarCount})</td>
      <td>${playerInfo.timestamp}</td>
      <td><button class="btn btn-primary" type="button" id="dq-${playerInfo.id}" onclick="disqualifyPlayer('${playerInfo.id}')">DQ</button></td>
      <td><button class="btn btn-primary" type="button" id="sync-${playerInfo.id}" onclick="probeAsync('${playerInfo.id}')">↻</button></td>
    </tr>
  `
}

/**
 * Add new player to the scoreboard
 *
 * @param playerInfo: the player info from getLatestPlay()
 */
appendPlayerRow = (playerInfo) => {
  $('#scoreboard tbody').append(generatePlayerRow(playerInfo))
}

/**
 * Update the player in the scoreboard
 *
 * @param playerInfo: the player info from getLatestPlay()
 */
updatePlayerRow = (playerInfo) => {
  $(`#${playerInfo.id}`).replaceWith(generatePlayerRow(playerInfo))
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
    .filter(([key, name]) =>
      key.toLowerCase().includes(query.toLowerCase()) ||
      name.toLowerCase().includes(query.toLowerCase())
    )
    .map(([value, text]) => ({value, text}))

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
  if (roundNumber === 1) roundDuration += 180 // 3 minutes
  else if (roundNumber >= 2 && roundNumber <= 4) roundDuration += 150 // 2:30 minutes
  else if (roundNumber >= 5 && roundNumber <= 7) roundDuration += 120 // 2 minutes
  else if (roundNumber >= 8) roundDuration += 90 // 1:30 minutes
  $('#round-duration').html(convertSecondsToMinuteDisplay(roundDuration))

  // enable the start button
  // place here to make sure the the song really is selected
  $('#round-btn').attr('disabled', false)
}

/**
 * Toggle the round start button based on search box status
 *
 * @param event: event from the component
 */
toggleRoundButton = (event) => {
  // zero length = empty search box => ability to start round not allowed
  // otherwise allow the round to be started
  $('#round-btn').attr('disabled', event.target.value.length !== 0)
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
$('.song-auto-complete').on('change', toggleRoundButton)
