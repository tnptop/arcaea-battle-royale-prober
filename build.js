'use strict'

const fs = require('fs')
const songdata = require('./js/songdata')

const songInfoData = songdata.reduce((sid, song) => {
  return Object.assign({}, sid, { [song.id]: song })
}, {})


// create songinfo.js
fs.writeFileSync(
  './js/songinfo.js',
  `songinfo=${JSON.stringify(songInfoData)}`,
  'utf8',
)

// create songkeys.js
const songKeys = Object.entries(songInfoData).map(([key, value]) => [key, value.en])
fs.writeFileSync(
  './js/songkeys.js',
  `songkeys=${JSON.stringify(songKeys)}`,
  'utf8',
)
