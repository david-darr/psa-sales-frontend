import { Marker, Popup } from 'react-leaflet'
import { MAP_LAYERS, MARKER_ICONS, MARKER_ICONS_SMALL, layerPoints } from '../lib/mapLayers'

/**
 * Renders every configured marker layer from a /api/map-schools response.
 *
 * @param {object}  schools          The response object, keyed by layer.
 * @param {boolean} [small]          Use the smaller icon set (mini maps).
 * @param {boolean} [withPopups=true] Mini maps omit popups.
 * @param {number}  [limitPerLayer]  Cap markers per layer, for mini maps.
 */
export default function SchoolMarkers({
  schools,
  small = false,
  withPopups = true,
  limitPerLayer,
}) {
  const icons = small ? MARKER_ICONS_SMALL : MARKER_ICONS

  return MAP_LAYERS.flatMap((layer) => {
    const points = layerPoints(schools, layer.key)
    const visible = limitPerLayer ? points.slice(0, limitPerLayer) : points

    return visible.map((school, i) => (
      <Marker
        key={`${layer.key}-${i}`}
        position={[school.lat, school.lng]}
        icon={icons[layer.key]}
      >
        {withPopups && (
          <Popup>
            <b>{school.name}</b>
            <br />
            {layer.popup}
            {school.address && (
              <>
                <br />
                {school.address}
              </>
            )}
          </Popup>
        )}
      </Marker>
    ))
  })
}
