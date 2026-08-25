import { useEffect, useRef } from "react";
import { dynamicMapLayer } from "esri-leaflet";
import L from "leaflet";
import { useMap } from "react-leaflet";

const SEED_BATHYMETRY_SERVICE =
  "https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/Coastal_Marine/NSW_Marine_Lidar_Bathymetry_Data_2018/MapServer";

const SEED_DEM_LAYER_ID = 2;

const AUSSEABED_WMS =
  "https://warehouse.ausseabed.gov.au/geoserver/ows";

const AUSSEABED_BATHYMETRY_2026 =
  "ausseabed:AusBathyTopo__Australia__Bathymetry__250m_2026";

export default function BathymetryDemLayer({ enabled, opacity, selectedState }) {
  const map = useMap();
  const layerRef = useRef(null);
  const useSeedNsw = selectedState === "NSW";

  useEffect(() => {
    if (!enabled) return undefined;
    ensureBathymetryPane(map);

    const layer = useSeedNsw
      ? dynamicMapLayer({
          url: SEED_BATHYMETRY_SERVICE,
          layers: [SEED_DEM_LAYER_ID],
          format: "png32",
          transparent: true,
          pane: "bathymetry-overlay",
          opacity
        })
      : L.tileLayer.wms(AUSSEABED_WMS, {
          layers: AUSSEABED_BATHYMETRY_2026,
          format: "image/png",
          transparent: true,
          version: "1.1.1",
          opacity,
          pane: "bathymetry-overlay",
          attribution: "Bathymetry &copy; AusSeabed / Geoscience Australia"
        });

    layer.addTo(map);
    layer.setOpacity(opacity);
    layerRef.current = layer;

    return () => {
      map.removeLayer(layer);
      if (layerRef.current === layer) layerRef.current = null;
    };
  }, [enabled, map, selectedState, useSeedNsw]);

  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  return null;
}

function ensureBathymetryPane(map) {
  if (map.getPane("bathymetry-overlay")) return;
  const pane = map.createPane("bathymetry-overlay");
  pane.classList.add("bathymetry-overlay-pane");
  pane.style.zIndex = "430";
}
