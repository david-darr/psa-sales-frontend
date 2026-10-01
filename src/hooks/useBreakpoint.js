import { useEffect, useState } from 'react'

/**
 * Single source of truth for responsive behaviour.
 *
 * Replaces the copy of `useIsMobile` + `useIsTablet` that previously lived in
 * all seven page files. Each of those copies registered its own `resize`
 * listener and called `setState` on every pixel of a drag; this uses
 * `matchMedia` so the browser only notifies us when a breakpoint is actually
 * crossed.
 *
 * Thresholds match the previous behaviour exactly (mobile <= 768px,
 * tablet 769-1024px) and the comment block at the bottom of styles/tokens.css.
 */

export const BREAKPOINTS = {
  mobileMax: 768,
  tabletMax: 1024,
}

const MOBILE_QUERY = `(max-width: ${BREAKPOINTS.mobileMax}px)`
const TABLET_QUERY = `(min-width: ${BREAKPOINTS.mobileMax + 1}px) and (max-width: ${BREAKPOINTS.tabletMax}px)`

function subscribe(query, setMatches) {
  const mql = window.matchMedia(query)
  const onChange = (event) => setMatches(event.matches)

  // Safari < 14 only has the deprecated addListener/removeListener pair.
  if (mql.addEventListener) {
    mql.addEventListener('change', onChange)
  } else {
    mql.addListener(onChange)
  }

  // Re-read on subscribe: the viewport can change between the initial
  // useState call and the effect running (e.g. an orientation change
  // during hydration).
  setMatches(mql.matches)

  return () => {
    if (mql.removeEventListener) {
      mql.removeEventListener('change', onChange)
    } else {
      mql.removeListener(onChange)
    }
  }
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => subscribe(MOBILE_QUERY, setIsMobile), [])
  return isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.matchMedia(TABLET_QUERY).matches)
  useEffect(() => subscribe(TABLET_QUERY, setIsTablet), [])
  return isTablet
}

/**
 * Convenience hook for components that need more than one of these.
 * `isDesktop` is derived rather than a third media query so the three
 * flags can never disagree about which band we are in.
 */
export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet }
}

export default useBreakpoint
