import { useId, useState } from 'react'
import Glyph from './icons'
import {
  KEYWORD_PRESETS,
  RADIUS_OPTIONS,
  keywordLabel,
  normalizeKeyword,
} from './finderUtils'

/**
 * The search bar card: address, "use my location", keyword chips, radius
 * segmented control and the submit button. Ctrl/Cmd+Enter submits from
 * anywhere inside the form.
 */
export default function SearchCard({
  address,
  onAddress,
  keywords,
  onKeywords,
  radius,
  onRadius,
  onSubmit,
  onLocate,
  locating,
  busy,
  error,
}) {
  const [custom, setCustom] = useState('')
  const formId = useId()
  const radii = RADIUS_OPTIONS.includes(radius)
    ? RADIUS_OPTIONS
    : [...RADIUS_OPTIONS, radius].sort((a, b) => a - b)
  const customKeywords = keywords.filter(
    (k) => !KEYWORD_PRESETS.some((p) => p.value === k),
  )

  function toggleKeyword(value) {
    onKeywords(
      keywords.includes(value)
        ? keywords.filter((k) => k !== value)
        : [...keywords, value],
    )
  }

  function addCustom() {
    const value = normalizeKeyword(custom)
    if (value && !keywords.includes(value)) onKeywords([...keywords, value])
    setCustom('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form
      className="fd-search"
      aria-label="Search for schools"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="fd-search-row">
        <label className="fd-address" htmlFor={`${formId}-address`}>
          <Glyph name="search" size={16} />
          <input
            id={`${formId}-address`}
            type="text"
            value={address}
            onChange={(event) => onAddress(event.target.value)}
            placeholder="Address, city or ZIP (for example Fairfax, VA)"
            autoComplete="street-address"
            enterKeyHint="search"
            aria-label="Search location"
          />
        </label>
        <button
          type="button"
          className="fd-btn fd-btn-ghost"
          onClick={onLocate}
          disabled={locating}
        >
          <Glyph name="locate" size={15} />
          {locating ? 'Locating...' : 'Use my location'}
        </button>
        <button type="submit" className="fd-btn fd-btn-solid" disabled={busy}>
          {busy ? 'Searching...' : 'Search'}
          <span className="fd-kbds" aria-hidden="true">
            <kbd>Ctrl</kbd>
            <kbd>Enter</kbd>
          </span>
        </button>
      </div>

      <div className="fd-search-row fd-search-meta">
        <div className="fd-field">
          <span className="fd-label" id={`${formId}-kw`}>
            Looking for
          </span>
          <div
            className="fd-chips"
            role="group"
            aria-labelledby={`${formId}-kw`}
          >
            {KEYWORD_PRESETS.map((preset) => {
              const on = keywords.includes(preset.value)
              return (
                <button
                  key={preset.value}
                  type="button"
                  className="fd-chip"
                  aria-pressed={on}
                  onClick={() => toggleKeyword(preset.value)}
                >
                  {preset.label}
                </button>
              )
            })}
            {customKeywords.map((value) => (
              <button
                key={value}
                type="button"
                className="fd-chip is-custom"
                aria-label={`Remove keyword ${value}`}
                onClick={() => toggleKeyword(value)}
              >
                {keywordLabel(value)}
                <Glyph name="close" size={11} />
              </button>
            ))}
            <input
              className="fd-chip-input"
              value={custom}
              maxLength={40}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
                  event.preventDefault()
                  event.stopPropagation()
                  addCustom()
                }
              }}
              onBlur={addCustom}
              placeholder="+ Add keyword"
              aria-label="Add a custom keyword, then press Enter"
            />
          </div>
        </div>

        <div className="fd-field">
          <span className="fd-label" id={`${formId}-radius`}>
            Radius
          </span>
          <div
            className="fd-segmented"
            role="radiogroup"
            aria-labelledby={`${formId}-radius`}
          >
            {radii.map((km) => (
              <button
                key={km}
                type="button"
                role="radio"
                aria-checked={radius === km}
                className="fd-seg"
                onClick={() => onRadius(km)}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="fd-form-error" role="alert">
          <Glyph name="alert" size={14} />
          {error}
        </p>
      )}
    </form>
  )
}
