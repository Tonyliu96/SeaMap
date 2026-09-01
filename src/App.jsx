import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import MhlBuoyForecastPanel from "./components/MhlBuoyForecastPanel.jsx";
import MarineMap from "./maps/MarineMap.jsx";
import { fetchTideInfo } from "./services/tides.js";
import {
  createTranslator,
  getInitialLanguage,
  persistLanguage
} from "./constants/localization.js";

export default function App() {
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
  const [tideCoordinate, setTideCoordinate] = useState({
    lat: -33.8688,
    lng: 151.2093,
    sourceKey: "map.center"
  });

  const t = useMemo(() => createTranslator(language), [language]);

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

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-950 text-white">
      <MarineMap
        {...mapState}
        selectedMhlBuoy={selectedMhlBuoy}
        setSelectedMhlBuoy={setSelectedMhlBuoy}
        selectedTideInfo={selectedTideInfo}
        setSelectedTideInfo={setSelectedTideInfo}
        onTidePointQuery={queryPointTide}
        t={t}/>

      {selectedRegion === "NSW" && (
        <MhlBuoyForecastPanel
          buoy={selectedMhlBuoy}
          onClose={() => setSelectedMhlBuoy(null)}
          t={t}/>
      )}

      <Sidebar
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
        tideInfo={tideInfo}
        tideStatus={tideStatus}
        tideError={tideError}
        tideCoordinate={tideCoordinate}
        onRefreshTide={refreshTide}/>
    </main>
  );
}
