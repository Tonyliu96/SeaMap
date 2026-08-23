const SEED_ISOBATH_QUERY_URL =
  "https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/Coastal_Marine/NSW_Marine_Lidar_Bathymetry_Data_2018/MapServer/0/query";

export function getIsobathColor(contour) {
  switch (Math.round(Number(contour))) {
    case 0:
      return "#ffee58";
    case -5:
      return "#78ff69";
    case -10:
      return "#00e5ff";
    case -15:
      return "#29b6f6";
    case -20:
      return "#448aff";
    case -25:
      return "#7c4dff";
    case -30:
      return "#ff4081";
    case -35:
      return "#ff7043";
    case -40:
      return "#ffc107";
    case -45:
      return "#00ffaa";
    default:
      return "#ffffff";
  }
}

export function getIsobathWeight(contour) {
  return Math.abs(Math.round(Number(contour))) % 10 === 0 ? 2.6 : 1.8;
}

export async function fetchIsobaths(bounds, signal) {
  const params = new URLSearchParams({
    f: "geojson",
    where: "1=1",
    outFields: "Contour",
    returnGeometry: "true",
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    geometry: JSON.stringify({
      xmin: bounds.getWest(),
      ymin: bounds.getSouth(),
      xmax: bounds.getEast(),
      ymax: bounds.getNorth(),
      spatialReference: { wkid: 4326 }
    })
  });

  const response = await fetch(`${SEED_ISOBATH_QUERY_URL}?${params}`, { signal });
  if (!response.ok) throw new Error("Unable to fetch isobaths");
  return response.json();
}

export function getContourValue(feature) {
  return Number(
    feature?.properties?.Contour ??
      feature?.properties?.contour ??
      feature?.properties?.CONTOUR ??
      0
  );
}

export function getFeatureLabelCoordinate(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return null;

  const line =
    geometry.type === "LineString"
      ? geometry.coordinates
      : geometry.type === "MultiLineString"
        ? geometry.coordinates?.find((candidate) => candidate?.length > 1)
        : null;

  if (!line?.length) return null;
  const coordinate = line[Math.floor(line.length / 2)];
  return coordinate ? [coordinate[1], coordinate[0]] : null;
}
