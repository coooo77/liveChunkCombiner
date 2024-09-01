'use strict'

import fs from 'fs'
import path from 'path'
import cp from 'child_process'
import { promisify } from 'util'
import { wait } from './helper'

const writeFileAsync = promisify(fs.writeFile)

export function makeCombineList(filePaths: string[]): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (filePaths.length === 0) {
      return reject(new Error('No file paths'))
    }

    const [firstFile] = filePaths
    const { dir: sourceDir, name } = path.parse(firstFile)
    const listPath = path.join(sourceDir, `${name}_${Date.now()}.txt`)
    const listContent = filePaths.map((f) => `file ${f.split(path.sep).join('/')}`).join('\r\n')

    try {
      await writeFileAsync(listPath, listContent)
      resolve(listPath)
    } catch (error) {
      reject(error)
    }
  })
}

export async function combineVideos(filePaths: string[], exportFolder: string, retryCount: number = 0) {
  const [firstFile] = filePaths
  if (firstFile.length === 1 || !firstFile) {
    throw Error(`Invalid file path: ${filePaths}`)
  }

  if (!exportFolder) {
    throw Error('Export folder not found')
  }

  const { name, ext, dir } = path.parse(firstFile)

  let listPath

  try {
    listPath = await makeCombineList(filePaths)

    let count = 0
    let isListExist = fs.existsSync(listPath)

    while (!isListExist) {
      console.log(`no combine list found.., retry ${count} times`)
      await wait(2)
      isListExist = fs.existsSync(listPath)
      if (count++ > 10) throw new Error(`${listPath} is unavailable!`)
    }

    const exportPath = path.join(exportFolder, `${name}_combine${ext}`)

    cp.execSync(`ffmpeg -v error -f concat -safe 0 -i ${listPath} -y -c copy ${exportPath}`, { cwd: dir })
    // 想要跳出視窗就 + start
    // cp.execSync(`start ffmpeg -f concat -safe 0 -i ${listPath} -y -c copy ${exportPath}`, { cwd: dir })
  } catch (error) {
    console.error(error)
    retryCount++

    if (retryCount > 3) return

    console.log(`combine task failed, retry ${retryCount} times`)
    await combineVideos(filePaths, exportFolder, retryCount)
  } finally {
    if (listPath && fs.existsSync(listPath)) fs.unlinkSync(listPath)
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

export function retryGetDuration(filePath: string, retryCount = 0, max = 5): number | null {
  try {
    const result = getMediaDuration(filePath, true)
    return result
  } catch (error) {
    retryCount++

    if (retryCount < max) return retryGetDuration(filePath, retryCount, max)

    console.log(`Cannot get duration from ${filePath}`)
    return null
  }
}
