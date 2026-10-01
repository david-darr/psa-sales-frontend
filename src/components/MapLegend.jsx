import { MAP_LAYERS, countLayers } from '../lib/mapLayers'
import '../styles/ui.css'

/**
 * Marker colour key. Driven by MAP_LAYERS so it cannot drift out of sync with
 * the markers themselves, which is what happened before: Home's legend listed
 * five layers while its mobile map only plotted three.
 *
 * @param {object}  [schools] When given, each row shows a count.
 * @param {boolean} [compact] Tighter type for the dashboard mini map.
 */
export default function MapLegend({ schools, compact = false }) {
  const counts = schools ? countLayers(schools) : null

  return (
    <div className={`ui-legend${compact ? ' is-compact' : ''}`}>
      {MAP_LAYERS.map((layer) => {
        const count = counts?.perLayer.find((entry) => entry.layer.key === layer.key)?.count
        return (
          <div key={layer.key} className="ui-legend-item">
            <span className="ui-legend-swatch" style={{ '--swatch-color': layer.swatch }} />
            <span className="ui-legend-label">
              {layer.legend}
              {counts ? ` (${count})` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
