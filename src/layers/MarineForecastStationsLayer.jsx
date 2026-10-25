import { CircleMarker, Pane, Popup, useMapEvents } from "react-leaflet";

export default function MarineForecastStationsLayer({
  enabled,
  locations,
  selectedLocation,
  onSelectLocation,
  onMapPoint,
  t
}) {
  useMapEvents({
    click(event) {
      if (enabled) onMapPoint?.(event.latlng);
    }
  });

  if (!enabled) return null;

  return (
    <Pane name="marine-forecast-stations" style={{ zIndex: 615 }}>
      {locations.map((location) => {
        const selected = selectedLocation?.id === location.id;
        return (
          <CircleMarker
            key={location.id}
            center={[location.latitude, location.longitude]}
            radius={selected ? 9 : 7}
            pathOptions={{
              color: selected ? "#fef3c7" : "#99f6e4",
              fillColor: selected ? "#f59e0b" : "#0d9488",
              fillOpacity: 0.94,
              weight: selected ? 3 : 2
            }}
            eventHandlers={{
              click(event) {
                event.originalEvent.stopPropagation();
                onSelectLocation(location);
              }
            }}>
            <Popup offset={[0, -4]}>
              <div className="min-w-44 text-slate-900">
                <p className="text-[11px] font-semibold uppercase text-teal-700">{t("marine.station")}</p>
                <p className="mt-1 text-sm font-semibold">{location.name}</p>
                <p className="text-xs text-slate-500">{location.state} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                <button className="mt-2 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => onSelectLocation(location)}>
                  {t("marine.openForecast")}
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </Pane>
  );
}
