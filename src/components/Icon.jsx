/** Small, consistent stroke icons for the PSA workspace. Decorative by default. */
export default function Icon({ name = 'grid', size = 18, className = '' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-7h6v7" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    mail: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    school: <><path d="M4 21V8l8-5 8 5v13zM2 21h20M9 21v-7h6v7M8 9h.01M12 9h.01M16 9h.01" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M10 2h4l.6 2.2 1.8.8 2-.9 2.8 2.8-.9 2 .8 1.8L23 11v3l-2.2.6-.8 1.8.9 2-2.8 2.8-2-.9-1.8.8L14 23h-4l-.6-2.2-1.8-.8-2 .9-2.8-2.8.9-2-.8-1.8L1 14v-3l2.2-.6.8-1.8-.9-2 2.8-2.8 2 .9 1.8-.8z" /></>,
    chart: <><path d="M3 20V4M3 20h18M7 16v-4M12 16V8M17 16V5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M5 7v8a4 4 0 0 0 4 4h8M12 5h7v7M16 8l3-3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  }

  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name] || paths.grid}</svg>
}
