import fs from "node:fs/promises";
import path from "node:path";
import proj4 from "proj4";
import shapefile from "shapefile";

const root = process.cwd();
const inputDir = path.join(root, "Marine_NSWCoastalLidarCoverage_20190827");
const shpPath = path.join(inputDir, "NSW_CoastalLiDAR_Coverage_20190827.shp");
const dbfPath = path.join(inputDir, "NSW_CoastalLiDAR_Coverage_20190827.dbf");
const outPath = path.join(root, "public", "data", "nsw-lidar-coverage.geojson");
const catalogPath = path.join(root, "public", "data", "nsw-lidar-catalog.json");

const source = await shapefile.open(shpPath, dbfPath);
const features = [];
const fieldNames = new Set();
let geometryType = null;

const gda2020MgaZone56 =
  "+proj=utm +zone=56 +south +ellps=GRS80 +units=m +no_defs +type=crs";
const wgs84 = "EPSG:4326";

while (true) {
  const { done, value } = await source.read();
  if (done) break;

  if (!geometryType && value.geometry) {
    geometryType = value.geometry.type;
  }

  Object.keys(value.properties ?? {}).forEach((key) => fieldNames.add(key));
  features.push(transformFeatureToWgs84(value));
}

const collection = {
  type: "FeatureCollection",
  name: "NSW Coastal LiDAR Coverage 2019-08-27",
  source: "Marine_NSWCoastalLidarCoverage_20190827",
  features
};

await fs.writeFile(outPath, `${JSON.stringify(collection)}\n`, "utf8");

const catalog = features.map((feature) => {
  const props = feature.properties ?? {};
  return {
    id: props.NS_ID,
    location: props.LOCATION,
    project: props.PRIMCOMP,
    tile: props.OBJECT_5m,
    captured: formatCaptureDate(props.CAPT_END),
    metadataUrl: props.MDATA_URL,
    aodn: props.AODN,
    zone: props.ZONE,
    tileSize: props.TILE_SIZE
  };
});

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: outPath,
      catalog: catalogPath,
      featureCount: features.length,
      geometryType,
      projection: "GDA2020 MGA Zone 56 -> WGS84",
      fields: Array.from(fieldNames),
      sampleProperties: features[0]?.properties ?? null
    },
    null,
    2
  )
);

function formatCaptureDate(value) {
  const capture = String(value ?? "");
  return capture.length === 8
    ? `${capture.slice(0, 4)}-${capture.slice(4, 6)}-${capture.slice(6)}`
    : null;
}

function transformFeatureToWgs84(feature) {
  if (!feature.geometry) return feature;

  return {
    ...feature,
    geometry: transformGeometry(feature.geometry)
  };
}

function transformGeometry(geometry) {
  return {
    ...geometry,
    coordinates: transformCoordinates(geometry.coordinates)
  };
}

function transformCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return coordinates;

  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const [lng, lat] = proj4(gda2020MgaZone56, wgs84, coordinates);
    return [roundCoord(lng), roundCoord(lat)];
  }

  return coordinates.map(transformCoordinates);
}

function roundCoord(value) {
  return Number(value.toFixed(7));
}
