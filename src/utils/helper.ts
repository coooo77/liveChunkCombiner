'use strict'
export function extractDateFromFilename(filename: string) {
  const dateTimeRegex = /_(\d{8})_(\d{6})/
  const match = filename.match(dateTimeRegex)

  if (!match) return null

  const [_, dateStr, timeStr] = match

  const year = parseInt(dateStr.substring(0, 4), 10)
  const month = parseInt(dateStr.substring(4, 6), 10) - 1
  const day = parseInt(dateStr.substring(6, 8), 10)
  const hours = parseInt(timeStr.substring(0, 2), 10)
  const minutes = parseInt(timeStr.substring(2, 4), 10)
  const seconds = parseInt(timeStr.substring(4, 6), 10)

  return new Date(year, month, day, hours, minutes, seconds)
}

export function getUserName(filename: string) {
  const [defaultName] = filename.split('_')

  if (filename.toLocaleLowerCase().includes('twitch')) {
    return /(.*)_\d*_Twitch/.exec(filename)?.[1] || defaultName
  }

  if (filename.toLocaleLowerCase().includes('chzzk')) {
    return /(.*)_.*?_Chzzk/.exec(filename)?.[1] || defaultName
  }

  if (filename.toLocaleLowerCase().includes('pixiv')) {
    const isPixivDefaultAccount = filename.includes('user_')
    const words = filename.split('_')
    const userID = isPixivDefaultAccount ? `user_${words[1]}` : words[0]
    return userID || defaultName
  }

  if (!defaultName) throw new Error(`No name found, filename: ${filename}`)

  return defaultName
}

export function groupVideosByUserName(filenames: string[]) {
  return filenames.reduce((acc, filename) => {
    const userName = getUserName(filename)
    const list = acc.get(userName) || []
    acc.set(userName, list.concat(filename))
    return acc
  }, new Map<string, string[]>())
}

export function sortFileByFileDate(filenames: string[]) {
  const files = filenames.sort((a, b) => {
    const timeA = extractDateFromFilename(a)
    const timeB = extractDateFromFilename(b)

    if (!timeA || !timeB || timeA === timeB) return 0
    if (timeA < timeB) return -1
    return 1
  })
  return files
}
