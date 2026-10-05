const PREVIEW_KEY = 'psa-ui-preview'
const PREVIEW_SCENARIO_KEY = 'psa-ui-preview-scenario'

// Available only from Vite's local development server. The query parameter
// opts in once; sessionStorage keeps the preview active while navigating tabs.
export const UI_PREVIEW = import.meta.env.DEV && (() => {
  const requested = new URLSearchParams(window.location.search).get('preview') === '1'
  if (requested) sessionStorage.setItem(PREVIEW_KEY, '1')
  return requested || sessionStorage.getItem(PREVIEW_KEY) === '1'
})()

export const PREVIEW_SCENARIO = UI_PREVIEW && (() => {
  const scenario = new URLSearchParams(window.location.search).get('scenario')
  if (scenario) sessionStorage.setItem(PREVIEW_SCENARIO_KEY, scenario)
  return scenario || sessionStorage.getItem(PREVIEW_SCENARIO_KEY)
})()

export const NEW_EMPLOYEE_PREVIEW = PREVIEW_SCENARIO === 'new'
export const ADMIN_PREVIEW = PREVIEW_SCENARIO === 'admin'

export function exitUiPreview() {
  sessionStorage.removeItem(PREVIEW_KEY)
  sessionStorage.removeItem(PREVIEW_SCENARIO_KEY)
  window.location.assign('/account')
}
