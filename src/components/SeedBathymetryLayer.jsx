import { useEffect, useRef } from "react";
import { dynamicMapLayer } from "esri-leaflet";
import L from "leaflet";
import { useMap } from "react-leaflet";

const SEED_BATHYMETRY_SERVICE =
  "https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/Coastal_Marine/NSW_Marine_Lidar_Bathymetry_Data_2018/MapServer";

const seedLayerIds = {
  isobaths: 0,
  slope: 1,
  dem: 2
};

const AUSSEABED_WMS =
  "https://warehouse.ausseabed.gov.au/geoserver/ows";

const AUSSEABED_BATHYMETRY_2026 =
  "ausseabed:AusBathyTopo__Australia__Bathymetry__250m_2026";

export default function SeedBathymetryLayer({
  enabled,
  showDem,
  showIsobaths,
  showSlope,
  opacity,
  selectedState,
  onMove
}) {
  const map = useMap();
  const useSeedNsw = selectedState === "NSW";
  const layerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    if (!map.getPane("bathymetry-overlay")) {
      const pane = map.createPane("bathymetry-overlay");
      pane.classList.add("bathymetry-overlay-pane");
      pane.style.zIndex = "430";
    }

    if (!useSeedNsw) {
      if (!showDem) return undefined;

      const layer = L.tileLayer.wms(AUSSEABED_WMS, {
        layers: AUSSEABED_BATHYMETRY_2026,
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity,
        pane: "bathymetry-overlay",
        zIndex: 360,
        attribution: "Bathymetry &copy; AusSeabed / Geoscience Australia"
      });

      layerRef.current = layer;
      layer.addTo(map);

      return () => {
        map.removeLayer(layer);
        if (layerRef.current === layer) layerRef.current = null;
      };
    }

    const layerIds = [];
    if (showDem) layerIds.push(seedLayerIds.dem);
    if (showSlope) layerIds.push(seedLayerIds.slope);
    if (showIsobaths) layerIds.push(seedLayerIds.isobaths);

    if (layerIds.length === 0) return undefined;

    const layer = dynamicMapLayer({
      url: SEED_BATHYMETRY_SERVICE,
      layers: layerIds,
      format: "png32",
      transparent: true,
      pane: "bathymetry-overlay",
      opacity
    });

    layer.addTo(map);
    layerRef.current = layer;
    layer.setOpacity(opacity);

    return () => {
      map.removeLayer(layer);
      if (layerRef.current === layer) layerRef.current = null;
    };
  }, [enabled, map, selectedState, showDem, showIsobaths, showSlope, useSeedNsw]);

  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  return null;
}
