import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const AHO_CHART_SERVICE =
  "https://services.hydro.gov.au/site1/rest/services/MCS/AHOENCOnline/MapServer/exts/MaritimeChartService/MapServer";

const AHO_DEPTH_LAYER_ID = 2;
const WEB_MERCATOR_LIMIT = 20037508.342789244;

export default function AhoDepthLayer({ enabled, opacity }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    ensureBathymetryPane(map);

    const layer = new AhoDepthTileLayer("", {
      pane: "bathymetry-overlay",
      opacity,
      tileSize: 512,
      zIndex: 370,
      maxNativeZoom: 18,
      maxZoom: 28,
      attribution:
        "AHO ENC Online &copy; Australian Hydrographic Office / Commonwealth of Australia. Not for navigation."
    });

    layer.addTo(map);
    layer.setOpacity(opacity);
    layerRef.current = layer;

    return () => {
      map.removeLayer(layer);
      if (layerRef.current === layer) layerRef.current = null;
    };
  }, [enabled, map]);

  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  return null;
}

const AhoDepthTileLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    const bbox = mercatorBBox(coords.x, coords.y, coords.z - 1);
    const tileSize = this.getTileSize();
    const params = new URLSearchParams({
      f: "image",
      format: "png32",
      transparent: "true",
      bbox: bbox.join(","),
      bboxSR: "3857",
      imageSR: "3857",
      size: `${tileSize.x},${tileSize.y}`,
      layers: `show:${AHO_DEPTH_LAYER_ID}`
    });

    return `${AHO_CHART_SERVICE}/export?${params}`;
  }
});

function mercatorBBox(x, y, z) {
  const scale = 2 ** z;
  const tileSize = (2 * WEB_MERCATOR_LIMIT) / scale;
  const minX = -WEB_MERCATOR_LIMIT + x * tileSize;
  const maxX = minX + tileSize;
  const maxY = WEB_MERCATOR_LIMIT - y * tileSize;
  const minY = maxY - tileSize;
  return [minX, minY, maxX, maxY];
}

function ensureBathymetryPane(map) {
  if (map.getPane("bathymetry-overlay")) return;
  const pane = map.createPane("bathymetry-overlay");
  pane.classList.add("bathymetry-overlay-pane");
  pane.style.zIndex = "430";
}
