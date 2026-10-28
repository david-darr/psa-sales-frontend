import 'maplibre-gl/dist/maplibre-gl.css'
import { bindMapWorker } from './mapWorker'

/**
 * OpenFreeMap's key-less dark vector style. Commercial use is allowed; the
 * attribution ("OpenFreeMap (c) OpenMapTiles Data from OpenStreetMap") comes
 * from the style itself and is shown by MapLibre's attribution control, which
 * every map in the app keeps enabled.
 */
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

/** Used only when the style cannot be fetched, so our own points still render. */
export const FALLBACK_STYLE = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#101013' } },
  ],
}

/** MapLibre is large, so it is only imported once a map is actually shown. */
export async function loadMapLibre() {
  const module = await import('maplibre-gl')
  const maplibregl = module.default ?? module
  bindMapWorker(maplibregl)
  return maplibregl
}

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}
