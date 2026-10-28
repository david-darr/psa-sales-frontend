import { MAP_LAYERS } from '../lib/mapLayers'

/**
 * Marker key for the Territory map. Marker shapes mirror the layer styling in
 * components/map/TerritoryMap.jsx: solid with a white ring for active clients,
 * hollow for former clients, a small dot for pipeline accounts.
 *
 * @param {boolean} [layers] Also list the prospect layer swatches.
 */
export default function MapLegend({ layers = false }) {
  return (
    <div className="tm-legend" aria-label="Map legend">
      <ul>
        <li>
          <span className="tm-key tm-key-active" />
          Active client
        </li>
        <li>
          <span className="tm-key tm-key-former" />
          Former client
        </li>
        <li>
          <span className="tm-key tm-key-pipeline" />
          In pipeline
        </li>
        <li>
          <span className="tm-key tm-key-cluster">9</span>
          Group of points
        </li>
        {layers &&
          MAP_LAYERS.map((layer) => (
            <li key={layer.key}>
              <span
                className="tm-key tm-key-prospect"
                style={{ '--swatch': layer.swatch }}
              />
              {layer.legend}
            </li>
          ))}
      </ul>
      <p>Dot color shows the rep who owns the account.</p>
    </div>
  )
}
