import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = { matches: ["https://nonprod-mapops.vmaps.vn/hdmap.html*","https://waze.com/*editor*","https://www.waze.com/*editor*"], all_frames: true, world: "MAIN", run_at: "document_start" }

type MapAPI = { unproject(p: [number, number]): { lat: number; lng: number }; getZoom(): number; getCanvas(): HTMLCanvasElement; jumpTo(o: { center: [number, number]; zoom: number; bearing: number; pitch: number }): void }
type WazeMap = { getLonLatFromPixel(p: { x: number; y: number }): { lat: number; lon: number }; getZoomLevel(): number; getMapViewportElement(): HTMLElement; setMapCenter(p: { lonLat: { lat: number; lon: number } }): void }
const page = window as Window & { _m?: MapAPI; SDK_INITIALIZED?: Promise<void>; getWmeSdk?: (o: { scriptId: string; scriptName: string }) => { Map: WazeMap } }
const vmaps = location.hostname === "nonprod-mapops.vmaps.vn" && location.pathname === "/hdmap.html"
const waze = /(^|\.)waze\.com$/.test(location.hostname) && /^\/(?:[^/]+\/)*editor(?:\/|$)/.test(location.pathname)
let linked = false
let sdk: { Map: WazeMap } | undefined
if (vmaps || waze) {
  if (waze) {
    const init = async () => {
      try {
        await page.SDK_INITIALIZED
        sdk = page.getWmeSdk?.({ scriptId: "maplink", scriptName: "MapLink" })
        console.debug("[MapLink][Waze] SDK", sdk ? "ready" : "unavailable")
      } catch (error) { console.warn("[MapLink][Waze] SDK failed", error) }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void init(), { once: true })
    else void init()
  }
  window.addEventListener("message", event => {
    const p = event.data
    if (event.source !== window || event.origin !== location.origin) return
    if (p?.type === "MAPLINK_LINKED") { linked = p.linked === true; return }
    if (!linked || p?.type !== "MAPLINK_NAVIGATE" || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180) return
    if (vmaps) page._m?.jumpTo({ center: [p.lon, p.lat], zoom: page._m.getZoom(), bearing: 0, pitch: 0 })
    else {
      try { sdk?.Map.setMapCenter({ lonLat: { lat: p.lat, lon: p.lon } }) }
      catch (error) { console.warn("[MapLink][Waze] navigation failed", error) }
    }
  })
  window.postMessage({ type: "MAPLINK_READY" }, location.origin)
  window.addEventListener("dblclick", event => {
    if (!linked || !event.isTrusted || !(event.target instanceof Element)) return
    const target = event.target
    if (target.closest('button,a,input,textarea,select,[role="button"],[role="dialog"],.olControl,.olPopup')) return
    let p: { lat: number; lon: number }, zoom: number
    if (vmaps) {
      const m = page._m
      if (!m || target !== m.getCanvas()) return
      const r = m.getCanvas().getBoundingClientRect()
      const c = m.unproject([event.clientX - r.left, event.clientY - r.top])
      p = { lat: c.lat, lon: c.lng }; zoom = m.getZoom()
    } else {
      if (!sdk || !sdk.Map.getMapViewportElement().contains(target)) return
      try { p = sdk.Map.getLonLatFromPixel({ x: event.clientX, y: event.clientY }); zoom = sdk.Map.getZoomLevel() }
      catch (error) { console.warn("[MapLink][Waze] coordinate failed", error); return }
    }
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return
    event.preventDefault(); event.stopImmediatePropagation()
    const text = `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`
    void navigator.clipboard.writeText(text).then(() => console.debug("[MapLink] copied"), error => console.warn("[MapLink] clipboard failed", error))
    console.debug(`[MapLink][${vmaps ? "VMaps" : "Waze"}] dblclick ${text}`)
    window.postMessage({ type: "MAPLINK_CLICK", ...p, zoom }, location.origin)
  }, true)
}
