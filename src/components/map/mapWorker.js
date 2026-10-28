import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// MapLibre 6 fetches its worker as a separate file that Vite does not emit
// on its own, so production builds must point it at the bundled copy.
export function bindMapWorker(maplibregl) {
  if (import.meta.env.PROD) maplibregl.setWorkerUrl(workerUrl)
}
