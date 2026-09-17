## Run

```bash
npm install
npm run dev
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select `build/chrome-mv3-dev`. Reload existing map tabs after loading or reloading the extension. Requires Chrome 111+.

## Usage

1. Open VMaps, OSM and Google Maps in separate tabs.
2. Open MapLink popup on each desired tab.
3. Press Activate.
4. Double-click a location on one linked map.
5. Other linked maps should navigate to the same coordinate.

Disconnect an individual tab in its popup or click the small MapLink indicator. Edit `maps.ts` to add/remove sites, then restart dev or rebuild; matches and host permissions are generated from that config. A new provider also needs its small coordinate/navigation functions in `content.ts`.

v0.2
- Fixed Google Maps double-click sync after SPA/map rerenders
- Improved Google Maps Satellite mode reliability

## Current limitations

- VMaps requires sign-in. Its embedded HD editor exposes MapLibre as `_m`; the tiny MAIN-world bridge depends on that API remaining available. Receiving a location resets bearing/pitch and preserves zoom.
- OSM and Google extraction uses URL center/zoom and Web Mercator viewport pixels. It is approximate while the URL lags a pan/zoom, with OSM's rounded low-zoom hash, or when Google shifts its visual center for a side panel. Google supports flat, north-up maps with an `@lat,lon,zoomz` or flat Satellite `@lat,lon,metersm` URL, not tilted/3D/Street View modes.
- Double-click map backgrounds; UI controls and Google place overlays are ignored. Normal map double-click zoom remains enabled on OSM/Google.
- Google navigation reloads the page. A tab that is loading may miss an incoming location; double-click again once it is ready.
- Links last only for the browser session and require activation on each tab. There is no continuous pan or zoom synchronization.
