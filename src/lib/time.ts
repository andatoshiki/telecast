import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/ja'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

export function formatPostTimestamp(datetime: string, locale = 'en', tz = 'UTC') {
  if (!datetime) {
    return ''
  }

  const normalizedLocale = locale.toLowerCase().startsWith('zh')
    ? 'zh-cn'
    : (locale.toLowerCase().startsWith('ja') ? 'ja' : 'en')
  const current = dayjs().tz(tz).locale(normalizedLocale)
  const parsed = dayjs(datetime).tz(tz).locale(normalizedLocale)

  if (parsed.isBefore(current.subtract(1, 'week'))) {
    return parsed.format('HH:mm · ll · ddd')
  }

  return parsed.fromNow()
}
