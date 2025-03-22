'use strict'
const fs = require('fs')
const path = require('path')

const cmd = `
@echo off
setlocal
node "${path.join(process.cwd(), './dist/index.js')}" %CD%
endlocal
`

fs.writeFileSync('combineChunk.bat', cmd)
