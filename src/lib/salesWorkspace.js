// URL-based context: deep links, browser tabs and refreshes retain their area.
// Never use a shared localStorage value for API routing across browser tabs.
export function salesWorkspace() {
  return typeof window !== 'undefined' && window.location.pathname?.startsWith('/businesses') ? 'business' : 'school'
}
export function salesRecordPath(id) {
  return `${salesWorkspace() === 'business' ? '/businesses' : '/schools'}/${id}`
}
export function salesPath(path) {
  if (salesWorkspace() !== 'business') return path
  return ({ '/': '/businesses', '/schools': '/businesses/records', '/pipeline': '/businesses/pipeline', '/accounts': '/businesses/sponsors', '/tasks': '/businesses/tasks', '/emails': '/businesses/outreach', '/map': '/businesses/map' })[path] || path
}

export function salesText(text) {
  if (salesWorkspace() !== 'business') return text
  return text.replace(/\bschools\b/g, 'businesses').replace(/\bSchools\b/g, 'Businesses').replace(/\bschool\b/g, 'business').replace(/\bSchool\b/g, 'Business').replace(/Active client/g, 'Active sponsor').replace(/Former client/g, 'Former sponsor')
}
