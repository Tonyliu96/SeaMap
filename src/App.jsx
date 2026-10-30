import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import MhlBuoyForecastPanel from "./components/MhlBuoyForecastPanel.jsx";
import MarineForecastPanel from "./components/MarineForecastPanel.jsx";
import MarineMap from "./maps/MarineMap.jsx";
import { fetchTideInfo } from "./services/tides.js";
import { fetchNearbyMarineLocations } from "./services/marineForecast.js";
import {
  createTranslator,
  getInitialLanguage,
  persistLanguage
} from "./constants/localization.js";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("seamap-theme") === "dark");
  const [language, setLanguage] = useState(getInitialLanguage);
  const [baseMap, setBaseMap] = useState("streets");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lidarEnabled, setLidarEnabled] = useState(false);
  const [bathymetryEnabled, setBathymetryEnabled] = useState(true);
  const [showBathymetryDem, setShowBathymetryDem] = useState(false);
  const [showIsobaths, setShowIsobaths] = useState(true);
  const [showAhoDepths, setShowAhoDepths] = useState(false);
  const [bathymetryOpacity, setBathymetryOpacity] = useState(68);
  const [marineProtectedEnabled, setMarineProtectedEnabled] = useState(true);
  const [marineProtectedOpacity, setMarineProtectedOpacity] = useState(58);
  const [selectedRegion, setSelectedRegion] = useState("NSW");
  const [tideInfo, setTideInfo] = useState(null);
  const [selectedTideInfo, setSelectedTideInfo] = useState(null);
  const [tideStatus, setTideStatus] = useState("idle");
  const [tideError, setTideError] = useState("");
  const [selectedMhlBuoy, setSelectedMhlBuoy] = useState(null);
  const [marineForecastEnabled, setMarineForecastEnabled] = useState(false);
  const [marineForecastLocations, setMarineForecastLocations] = useState([]);
  const [selectedMarineLocation, setSelectedMarineLocation] = useState(null);
  const [marineNearbyMessage, setMarineNearbyMessage] = useState("");
  const [tideCoordinate, setTideCoordinate] = useState({
    lat: -33.8688,
    lng: 151.2093,
    sourceKey: "map.center"
  });

  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("seamap-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const updateLanguage = useCallback((nextLanguage) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  }, []);

  const mapState = useMemo(
    () => ({
      baseMap,
      lidarEnabled,
      bathymetryEnabled,
      showBathymetryDem,
      showIsobaths,
      showAhoDepths,
      bathymetryOpacity: bathymetryOpacity / 100,
      marineProtectedEnabled,
      marineProtectedOpacity: marineProtectedOpacity / 100,
      selectedRegion
    }),
    [
      baseMap,
      lidarEnabled,
      bathymetryEnabled,
      showBathymetryDem,
      showIsobaths,
      showAhoDepths,
      bathymetryOpacity,
      marineProtectedEnabled,
      marineProtectedOpacity,
      selectedRegion
    ]
  );

  const refreshTide = useCallback(async (coordinate = tideCoordinate) => {
    setTideStatus("loading");
    setTideError("");

    try {
      const info = await fetchTideInfo(coordinate);
      setTideInfo(info);
      setTideCoordinate(coordinate);
      setTideStatus("ready");
    } catch {
      setTideStatus("error");
      setTideError(t("tide.error"));
    }
  }, [t, tideCoordinate]);

  const queryPointTide = useCallback(async (coordinate) => {
    setSelectedTideInfo({ status: "loading", coordinate });

    try {
      const info = await fetchTideInfo(coordinate);
      setSelectedTideInfo({ status: "ready", info, coordinate });
    } catch {
      setSelectedTideInfo({ status: "error", coordinate });
    }
  }, []);

  useEffect(() => {
    refreshTide(tideCoordinate);
  }, []);

  useEffect(() => {
    if (selectedRegion !== "NSW") setSelectedMhlBuoy(null);
  }, [selectedRegion]);

  useEffect(() => {
    if (!marineForecastEnabled) {
      setSelectedMarineLocation(null);
      setMarineNearbyMessage("");
    }
  }, [marineForecastEnabled]);

  useEffect(() => {
    if (selectedMarineLocation) setSidebarOpen(false);
  }, [selectedMarineLocation]);

  const selectNearestMarineLocation = useCallback(async ({ lat, lng }) => {
    try {
      const locations = await fetchNearbyMarineLocations({ lat, lon: lng, radiusKm: 150 });
      if (!locations.length) {
        setMarineNearbyMessage(t("marine.noNearby"));
        return;
      }
      const nearest = locations[0];
      setSelectedMarineLocation(nearest);
      setSelectedMhlBuoy(null);
      setMarineNearbyMessage(t("marine.nearestSelected", {
        name: nearest.name,
        distance: nearest.distanceKm?.toFixed(1) ?? "–"
      }));
    } catch {
      setMarineNearbyMessage(t("marine.nearbyError"));
    }
  }, [t]);

  const selectMarineLocation = useCallback((location) => {
    setSelectedMarineLocation(location);
    setSelectedMhlBuoy(null);
    setSidebarOpen(false);
  }, []);

  const selectMhlBuoy = useCallback((buoy) => {
    setSelectedMhlBuoy(buoy);
    setSelectedMarineLocation(null);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg font-sans text-ink-strong transition-colors duration-200 dark:bg-dark-bg dark:text-dark-ink">
      <div className="absolute inset-x-2 bottom-20 top-2 overflow-hidden rounded-2xl border border-aqua-soft shadow-marine md:inset-y-3 md:left-[88px] md:right-3">
        <MarineMap
          {...mapState}
          selectedMhlBuoy={selectedMhlBuoy}
          setSelectedMhlBuoy={selectMhlBuoy}
          selectedTideInfo={selectedTideInfo}
          setSelectedTideInfo={setSelectedTideInfo}
          onTidePointQuery={queryPointTide}
          marineForecastEnabled={marineForecastEnabled}
          marineForecastLocations={marineForecastLocations}
          selectedMarineLocation={selectedMarineLocation}
          onSelectMarineLocation={selectMarineLocation}
          onMarineMapPoint={selectNearestMarineLocation}
          t={t}/>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] h-20 bg-gradient-to-b from-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-[600] ring-1 ring-inset ring-slate-900/[0.06]" />
      </div>

      {selectedRegion === "NSW" && (
        <MhlBuoyForecastPanel
          buoy={selectedMhlBuoy}
          onClose={() => setSelectedMhlBuoy(null)}
          t={t}/>
      )}

      {marineForecastEnabled && selectedMarineLocation && (
        <MarineForecastPanel
          location={selectedMarineLocation}
          onClose={() => {
            setSelectedMarineLocation(null);
            setSidebarOpen(false);
          }}
          language={language}
          t={t}/>
      )}

      <Sidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        language={language}
        setLanguage={updateLanguage}
        t={t}
        baseMap={baseMap}
        setBaseMap={setBaseMap}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        lidarEnabled={lidarEnabled}
        setLidarEnabled={setLidarEnabled}
        bathymetryEnabled={bathymetryEnabled}
        setBathymetryEnabled={setBathymetryEnabled}
        showBathymetryDem={showBathymetryDem}
        setShowBathymetryDem={setShowBathymetryDem}
        showIsobaths={showIsobaths}
        setShowIsobaths={setShowIsobaths}
        showAhoDepths={showAhoDepths}
        setShowAhoDepths={setShowAhoDepths}
        bathymetryOpacity={bathymetryOpacity}
        setBathymetryOpacity={setBathymetryOpacity}
        marineProtectedEnabled={marineProtectedEnabled}
        setMarineProtectedEnabled={setMarineProtectedEnabled}
        marineProtectedOpacity={marineProtectedOpacity}
        setMarineProtectedOpacity={setMarineProtectedOpacity}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        marineForecastEnabled={marineForecastEnabled}
        setMarineForecastEnabled={setMarineForecastEnabled}
        marineForecastLocations={marineForecastLocations}
        setMarineForecastLocations={setMarineForecastLocations}
        selectedMarineLocation={selectedMarineLocation}
        onSelectMarineLocation={selectMarineLocation}
        marineNearbyMessage={marineNearbyMessage}/>
    </main>
  );
}
