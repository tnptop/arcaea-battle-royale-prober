'use strict'

const fs = require('fs')
const songdata = require('./js/songdata')

const songInfoData = songdata.songs.reduce((songInfo, song) => {
  const { sid } = song
  return Object.assign({}, songInfo, { [sid]: song })
}, {})
const songKeys = songdata.songs.map(({ sid, name_en }) => [sid, name_en])

// create songinfo.js
fs.writeFileSync(
  './js/songinfo.js',
  `songinfo=${JSON.stringify(songInfoData)}`,
  'utf8',
)

// create songkeys.js
fs.writeFileSync(
  './js/songkeys.js',
  `songkeys=${JSON.stringify(songKeys)}`,
  'utf8',
)
