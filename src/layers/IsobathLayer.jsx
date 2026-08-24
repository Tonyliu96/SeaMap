import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, Marker, Pane, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  fetchIsobaths,
  getContourValue,
  getFeatureLabelCoordinate,
  getIsobathColor,
  getIsobathWeight
} from "../constants/isobaths.js";

const MIN_ISOBATH_ZOOM = 11;

export default function IsobathLayer({ enabled, opacity }) {
  const map = useMap();
  const [features, setFeatures] = useState(null);
  const queryKeyRef = useRef("");
  const abortRef = useRef(null);
  const timeoutRef = useRef(null);

  useMapEvents({
    moveend() {
      loadVisibleIsobaths();
    },
    zoomend() {
      loadVisibleIsobaths();
    }
  });

  useEffect(() => {
    if (!enabled) {
      cancelPendingRequest();
      setFeatures(null);
      queryKeyRef.current = "";
      return undefined;
    }

    loadVisibleIsobaths();
    return cancelPendingRequest;
  }, [enabled, map]);

  function loadVisibleIsobaths() {
    if (!enabled || map.getZoom() < MIN_ISOBATH_ZOOM) {
      cancelPendingRequest();
      setFeatures(null);
      queryKeyRef.current = "";
      return;
    }

    const bounds = map.getBounds();
    const queryKey = [
      map.getZoom(),
      bounds.getWest().toFixed(3),
      bounds.getSouth().toFixed(3),
      bounds.getEast().toFixed(3),
      bounds.getNorth().toFixed(3)
    ].join("|");

    if (queryKeyRef.current === queryKey) return;
    queryKeyRef.current = queryKey;

    cancelPendingRequest();
    const controller = new AbortController();
    abortRef.current = controller;
    timeoutRef.current = window.setTimeout(async () => {
      try {
        const data = await fetchIsobaths(bounds, controller.signal);
        if (controller.signal.aborted) return;
        setFeatures(data);
      } catch (error) {
        if (error.name !== "AbortError") setFeatures(null);
      }
    }, 250);
  }

  function cancelPendingRequest() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }

  const labels = useMemo(
    () =>
      (features?.features ?? [])
        .map((feature, index) => {
          const contour = getContourValue(feature);
          const coordinate = getFeatureLabelCoordinate(feature);
          if (!coordinate) return null;
          return {
            id: `${index}-${contour}-${coordinate.join(",")}`,
            contour,
            coordinate
          };
        })
        .filter(Boolean),
    [features]
  );

  if (!enabled || !features) return null;

  return (
    <Pane name="isobath-vector-overlay" style={{ zIndex: 438 }}>
      <GeoJSON
        key={queryKeyRef.current}
        data={features}
        interactive={false}
        style={(feature) => {
          const contour = getContourValue(feature);
          return {
            color: getIsobathColor(contour),
            weight: getIsobathWeight(contour),
            opacity,
            lineCap: "round",
            lineJoin: "round"
          };
        }}
      />
      {labels.map((label) => (
        <Marker
          key={label.id}
          position={label.coordinate}
          interactive={false}
          icon={L.divIcon({
            className: "isobath-label-icon",
            html: `<span style="color:${getIsobathColor(label.contour)}">${Math.round(label.contour)}</span>`,
            iconSize: [34, 18],
            iconAnchor: [17, 9]
          })}
        />
      ))}
    </Pane>
  );
}
