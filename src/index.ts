'use strict'
import fs from 'fs'

import { combineChunks } from './utils'

const main = async () => {
  console.log('app start...')

  const folder = process.argv.at(-1)
  if (!folder || !fs.existsSync(folder)) throw Error(`Invalid folder path, receive: ${folder}`)

  await combineChunks([folder])
}

main()
