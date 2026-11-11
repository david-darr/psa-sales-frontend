const zone = 'America/New_York'
const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function wall(value) {
  const p = Object.fromEntries(parts.formatToParts(new Date(value)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]))
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second))
}
function instant(local) {
  // Sending hours are daytime, outside the ambiguous or missing DST hour.
  let result = local.getTime()
  for (let i = 0; i < 3; i++) result += local.getTime() - wall(result).getTime()
  return new Date(result)
}
export function sequenceDate(value, hour = 9) {
  return instant(new Date(`${value}T${String(hour).padStart(2, '0')}:00:00Z`))
}
export function nextSequenceWindow(value, start = 9, end = 17) {
  const local = wall(value)
  if (local.getUTCHours() >= end) { local.setUTCDate(local.getUTCDate() + 1); local.setUTCHours(start, 0, 0, 0) }
  if (local.getUTCHours() < start) local.setUTCHours(start, 0, 0, 0)
  while ([0, 6].includes(local.getUTCDay())) local.setUTCDate(local.getUTCDate() + 1)
  return instant(local)
}
export function nominalSequenceDue(intro, days, start = 9, end = 17) {
  const local = wall(intro)
  local.setUTCDate(local.getUTCDate() + days)
  return nextSequenceWindow(instant(local), start, end)
}
