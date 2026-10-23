export async function loadNswLidarCoverage({ signal } = {}) {
  const response = await fetch("/data/nsw-lidar-coverage.geojson", { signal });

  if (!response.ok) {
    throw new Error(`Failed to load NSW LiDAR coverage: ${response.status}`);
  }

  return response.json();
}

export async function loadNswLidarCatalog() {
  const response = await fetch("/data/nsw-lidar-catalog.json");

  if (!response.ok) {
    throw new Error(`Failed to load NSW LiDAR catalog: ${response.status}`);
  }

  return response.json();
}
