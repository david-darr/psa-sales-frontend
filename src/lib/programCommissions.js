// Display-only estimate. The server independently validates and calculates saves.
export function estimateProgram({ gross, leagueapps, cash_expenses, sale_type, rep_payout }) {
  const revenue = Math.round(Number(gross || 0) * 100)
  const expenses = Math.round(Number(cash_expenses || 0) * 100)
  const fee = leagueapps ? Math.round(revenue * 35 / 1000) : 0
  const base = revenue - fee - expenses
  const rate = sale_type === 'renewal' ? 7.5 : 15
  const pool = Math.round(base * (sale_type === 'renewal' ? 75 : 150) / 1000)
  const payout = rep_payout === '' || rep_payout == null ? null : Math.round(Number(rep_payout) * 100)
  return { gross: revenue / 100, leagueapps_fee: fee / 100, net: (revenue - fee) / 100,
    cash_expenses: expenses / 100, commission_base: base / 100, pool_rate: rate,
    pool: pool / 100, rep_payout: payout == null ? null : payout / 100,
    director_remainder: payout == null ? null : (pool - payout) / 100 }
}

export function programTotals(rows) {
  const active = rows.filter((row) => !row.voided)
  const keys = ['gross', 'leagueapps_fee', 'cash_expenses', 'commission_base', 'pool', 'rep_payout', 'director_remainder']
  return { ...Object.fromEntries(keys.map((key) => [key, active.reduce((sum, row) => sum + Math.round((row[key] || 0) * 100), 0) / 100])),
    programs: active.length, needs_review: active.filter((row) => row.needs_review).length,
    unallocated_pool: active.filter((row) => row.needs_review).reduce((sum, row) => sum + Math.round(row.pool * 100), 0) / 100 }
}
