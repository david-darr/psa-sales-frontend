export default function iconForLabel(label = '') {
  const text = String(label).toLowerCase()
  if (/map|location|route|territor/.test(text)) return 'map'
  if (/find|search|discover/.test(text)) return 'search'
  if (/school|database|contact/.test(text)) return 'school'
  if (/email|reply|message|campaign|communicat/.test(text)) return 'mail'
  if (/team|employee|member/.test(text)) return 'team'
  if (/account|profile|setting|password/.test(text)) return 'settings'
  if (/stat|analytic|performance|metric/.test(text)) return 'chart'
  if (/pending|follow.?up|due/.test(text)) return 'clock'
  if (/respond|complete|success/.test(text)) return 'check'
  if (/date|recent|history/.test(text)) return 'calendar'
  if (/home|welcome|start/.test(text)) return 'home'
  return 'grid'
}
