'use strict'

import fs from 'fs'
import path from 'path'

export function getFilesByExt(dirPath: string, ext: string[]) {
  if (!dirPath) throw Error('dir path not specified')
  return fs.readdirSync(dirPath).filter((f) => ext.includes(path.extname(f)))
}

export function sortFilesByCreateTime(filenames: string[], fileDir: string) {
  return filenames.map((filename) => fs.statSync(path.join(fileDir, filename))).sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime())
}

export function makeDirIfNotExist(fileLocation?: string) {
  if (!fileLocation) throw new Error(`Invalid file location`)
  if (fs.existsSync(fileLocation)) return fileLocation
  fs.mkdirSync(fileLocation, { recursive: true })
  return fileLocation
}

export function moveFile(filename: string, fromDir: string, toDir: string) {
  const from = path.join(fromDir, filename)

  if (!fs.existsSync(from)) {
    console.error(`No file found, name: ${filename}, from: ${fromDir}`)
    return
  }

  const to = path.join(toDir, filename)
  fs.renameSync(from, to)
}
