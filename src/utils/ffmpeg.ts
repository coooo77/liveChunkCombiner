'use strict'

import fs from 'fs'
import path from 'path'
import cp from 'child_process'
import { wait } from './helper'

export function makeCombineList(filePaths: string[]) {
  if (filePaths.length === 0) throw Error('No file paths')

  const [firstFile] = filePaths
  const { dir: sourceDir, name } = path.parse(firstFile)
  const listPath = path.join(sourceDir, `${name}_${Date.now()}.txt`)
  const listContent = filePaths.map((f) => `file ${f.split('\\').join('/')}`).join('\r\n')

  fs.writeFileSync(listPath, listContent)
  return listPath
}

export async function combineVideos(filePaths: string[], exportFolder: string) {
  const [firstFile] = filePaths
  if (firstFile.length === 1 || !firstFile) {
    throw Error(`Invalid file path: ${filePaths}`)
  }

  if (!exportFolder) {
    throw Error('Export folder not found')
  }

  const { name, ext, dir } = path.parse(firstFile)
  const listPath = makeCombineList(filePaths)
  const exportPath = path.join(exportFolder, `${name}_combine${ext}`)

  try {
    let count = 0
    let listTxtFileIsExist = fs.existsSync(listPath)

    while (!listTxtFileIsExist || count++ <= 10) {
      await wait(1)
      listTxtFileIsExist = fs.existsSync(listPath)
      if (count === 10) throw new Error(`combine list ${listPath} not found`)
    }

    cp.execSync(`ffmpeg -v error -f concat -safe 0 -i ${listPath} -y -c copy ${exportPath}`, { cwd: dir })
    // 想要跳出視窗就 + start
    // cp.execSync(`start ffmpeg -f concat -safe 0 -i ${listPath} -y -c copy ${exportPath}`, { cwd: dir })
    fs.unlinkSync(listPath)
  } catch (error) {
    console.error(error)
  }
}

export function getMediaDuration(filePath: string, showInSeconds: false): string | null
export function getMediaDuration(filePath: string, showInSeconds: true): number | null
export function getMediaDuration(filePath: string, showInSeconds: boolean) {
  try {
    let command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1`
    if (!showInSeconds) {
      command += ` -sexagesimal`
    }
    command += ` ${filePath}`

    const stdout = cp.execSync(command, { timeout: 2000 }).toString()

    return showInSeconds ? parseFloat(stdout) : stdout
  } catch (error) {
    // console.error('Error occurred while trying to fetch media duration:', error)
    return null
  }
}
