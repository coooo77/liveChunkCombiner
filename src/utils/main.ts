'use strict'

import path from 'path'

import {
  moveFile,
  combineVideos,
  getFilesByExt,
  getMediaDuration,
  sortFileByFileDate,
  groupVideosByUserName,
  extractDateFromFilename,
  makeDirIfNotExist as mDINE,
} from './'

const distanceBetweenStreamsInMs = 1000 * 60 * 60

export async function combineChunks(checkFolders: string[]) {
  for (const folder of checkFolders) {
    const mp4Videos = getFilesByExt(folder, ['.mp4'])
    const videoGroupByName = groupVideosByUserName(mp4Videos)

    if (videoGroupByName.size === 0) continue

    const errorFiles: string[] = []
    const combineFiles: string[][] = []
    const singleFiles = new Set<string>()

    // 檢查是否有斷片
    for (const [_, files] of videoGroupByName) {
      if (files.length < 2) {
        files.forEach((f) => singleFiles.add(f))
        continue
      }

      const fileSorted = sortFileByFileDate(files)

      const acc: string[] = []

      for (let i = 0; i < fileSorted.length; i++) {
        const file = fileSorted[i]
        console.log('check file:', file)

        const fileDate = extractDateFromFilename(file)
        if (!fileDate) {
          errorFiles.push(file)
          continue
        }

        const preFile = acc.at(-1)
        if (!preFile) {
          acc.push(file)
          continue
        }

        const preFileDate = extractDateFromFilename(preFile)
        if (!preFileDate) {
          errorFiles.push(file)
          continue
        }
        if (fileDate.getTime() === preFileDate.getTime()) {
          // 合併的檔案 直接移動到 single
          singleFiles.add(file)
          singleFiles.add(preFile)
          continue
        }

        const preFileDuration = getMediaDuration(path.join(folder, preFile), true)
        if (preFileDuration === null) {
          errorFiles.push(preFile)
          acc.push(file)
          continue
        }

        // 注意一下因為合併的影片是用 4X 壓縮的，所以時間還原要 4X，但一般影片不需要
        const postFileTime = fileDate.getTime()
        const preFileTime = preFileDate.getTime() + preFileDuration * 1000 * 4
        const shouldBreak = postFileTime - preFileTime >= distanceBetweenStreamsInMs

        if (!shouldBreak) {
          acc.push(file)
          continue
        }

        // 斷片只有一個檔案，移動到 single
        if (acc.length === 1) {
          const [singleFile] = acc
          singleFiles.add(singleFile)

          acc.length = 0
          acc.push(file)
          continue
        }

        // 多筆斷片，列入合併清單
        const clone = [...acc]
        combineFiles.push(clone)

        acc.length = 0
        acc.push(file)
      }

      // loop 結束，檢查 acc 是否還有斷片
      if (acc.length) {
        if (acc.length === 1) {
          const [singleFile] = acc
          singleFiles.add(singleFile)
        } else {
          const clone = [...acc]
          combineFiles.push(clone)
        }
      }
    }

    if (errorFiles.length) {
      const errorFileFolder = mDINE(path.join(folder, 'chunk/error'))
      errorFiles.forEach((f) => moveFile(f, folder, errorFileFolder))
    }

    if (singleFiles.size) {
      const singleFileFolder = mDINE(path.join(folder, 'chunk/single'))
      singleFiles.forEach((f) => moveFile(f, folder, singleFileFolder))
    }

    if (combineFiles.length === 0) continue

    const combineInputFolder = mDINE(path.join(folder, 'chunk/combine/input'))
    const sourceExportFolder = mDINE(path.join(folder, 'chunk/combine/source'))
    const combineExportFolder = mDINE(path.join(folder, 'chunk/combine/output'))
    combineFiles.flat().forEach((f) => moveFile(f, folder, combineInputFolder))

    for (const list of combineFiles) {
      const [firstFile] = list
      if (!firstFile) {
        console.error(`no file found, list`, list)
        continue
      }

      if (list.length === 1) {
        const singleFileFolder = mDINE(path.join(folder, 'chunk/single'))
        list.forEach((f) => moveFile(f, combineInputFolder, singleFileFolder))
        continue
      }

      list.forEach((file) => moveFile(file, combineInputFolder, sourceExportFolder))
      const filesWithFullPath = sortFileByFileDate(list).map((file) => path.join(sourceExportFolder, file))
      await combineVideos(filesWithFullPath, combineExportFolder)
    }

    console.log('done ...')
  }
}
