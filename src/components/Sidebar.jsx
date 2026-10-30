import { useEffect, useState } from "react";
import {ChevronsUpDown, ExternalLink, Layers, Map, Satellite, ShieldCheck, ShipWheel, SlidersHorizontal, SquareStack, X} from "lucide-react";
import { australiaStates } from "../constants/australiaStates.js";
import {loadNswLidarCatalog} from "../services/nswLidar.js";
import {languageOptions} from "../constants/localization.js";
import TideSection from "../components/TideSection.jsx";
import MarineForecastSection from "./MarineForecastSection.jsx";

const baseMaps = [
  { id: "streets", labelKey: "base.streets", icon: Map },
  { id: "satellite", labelKey: "base.satellite", icon: Satellite }
];

export default function Sidebar({
  language,
  setLanguage,
  t,
  baseMap,
  setBaseMap,
  isOpen,
  setIsOpen,
  lidarEnabled,
  setLidarEnabled,
  bathymetryEnabled,
  setBathymetryEnabled,
  showBathymetryDem,
  setShowBathymetryDem,
  showIsobaths,
  setShowIsobaths,
  showAhoDepths,
  setShowAhoDepths,
  bathymetryOpacity,
  setBathymetryOpacity,
  marineProtectedEnabled,
  setMarineProtectedEnabled,
  marineProtectedOpacity,
  setMarineProtectedOpacity,
  selectedRegion,
  setSelectedRegion,
  tideInfo,
  tideStatus,
  tideError,
  tideCoordinate,
  onRefreshTide,
  marineForecastEnabled,
  setMarineForecastEnabled,
  marineForecastLocations,
  setMarineForecastLocations,
  selectedMarineLocation,
  onSelectMarineLocation,
  marineNearbyMessage
}) {
  const [lidarCatalog, setLidarCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const isNswBathymetry = selectedRegion === "NSW";
  const panelOpen = isOpen;

  useEffect(() => {
    let mounted = true;

    loadNswLidarCatalog()
      .then((records) => {
        if (!mounted) return;
        setLidarCatalog(records);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setCatalogStatus("error");
      });

    return () => {
      mounted = false;};
  }, []);

  return (
      <>
        {!panelOpen && <button type="button" aria-label={t("panel.expand")}
            aria-expanded="false"
            className={`group absolute z-[720] grid h-12 w-12 place-items-center overflow-visible border border-[#3a4048] bg-[#0b0d0f]/95 text-[#ffe100] shadow-[4px_4px_0_rgba(0,0,0,0.6)] backdrop-blur-xl transition duration-200 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[#3564f4] hover:-translate-y-0.5 hover:border-[#ffe100] hover:bg-[#15191d] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe100] ${selectedMarineLocation
              ? "left-3 top-3 md:left-4 md:top-4"
              : "left-3 top-1/2 -translate-y-1/2 hover:left-4 md:left-4"
            }`}
            onClick={() => setIsOpen(true)}>
          <Layers size={20} aria-hidden="true"/>
          <span className="pointer-events-none absolute left-[calc(100%+8px)] whitespace-nowrap border border-[#3a4048] bg-[#0b0d0f]/95 px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#f7f3e8] opacity-0 shadow-[3px_3px_0_rgba(0,0,0,.5)] backdrop-blur-md transition group-hover:opacity-100">{t("layer.title")}</span>
        </button>}

          <aside className={`absolute z-[710] overflow-hidden border border-[#34383f] bg-[#0b0d0f]/[0.97] shadow-[8px_8px_0_rgba(0,0,0,.42),0_24px_70px_rgba(0,0,0,.48)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] md:bottom-4 md:left-5 md:top-5 md:w-[350px] ${panelOpen
                ? "bottom-4 left-4 right-4 max-h-[calc(100dvh-7rem)] md:max-h-none md:translate-x-0"
                : "bottom-0 left-0 right-0 max-h-[76px] md:max-h-none md:-translate-x-[370px]"}`}>
          <div className="grid h-1 grid-cols-5" aria-hidden="true"><span className="bg-[#f7f3e8]"/><span className="bg-[#ffe100]"/><span className="bg-[#ff3b4f]"/><span className="bg-[#19b56b]"/><span className="bg-[#3564f4]"/></div>
          <div className="flex items-center justify-between gap-3 border-b border-[#30343a] bg-[#0f1215] px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center border border-[#3b4149] bg-[#15191d] text-[#ffe100] shadow-[3px_3px_0_#08090a]">
                <Layers size={18}/>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-[#f7f3e8]">{t("layer.title")}</h2>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-[#6ee7f5]">
                  {t("layer.subtitle")}
                </p>
              </div>
            </div>
            {panelOpen && <button type="button" aria-label={t("panel.collapse")}
                className="grid h-9 w-9 shrink-0 place-items-center border border-[#343a42] bg-[#171a1e] text-[#9da4ad] transition hover:border-[#ff3b4f] hover:bg-[#ff3b4f] hover:text-white active:translate-y-px"
                onClick={() => setIsOpen(false)}>
              <X size={17}/>
            </button>}
          </div>

          <div className={`marine-scrollbar max-h-[calc(100dvh-11rem)] space-y-3 overflow-y-auto overscroll-contain px-3 py-3 md:max-h-[calc(100dvh-11rem)] ${panelOpen ? "block" : "hidden md:block"}`}>
            <Section title={t("language.section")} icon={SlidersHorizontal}>
              <label className="block border border-[#343a42] bg-[#15191d] p-3 transition focus-within:border-[#ffe100]">
              <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#8c959f]">
                {t("language.current")}
              </span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}
                    className="h-10 w-full border border-[#343a42] bg-[#0b0d0f] px-3 font-mono text-xs text-[#f7f3e8] outline-none transition focus:border-[#ffe100]">
                  {languageOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {t(option.labelKey)}
                      </option>
                  ))}
                </select>
              </label>
            </Section>

            <Section title={t("section.baseMaps")} icon={Map}>
              <div className="grid grid-cols-2 gap-2">
                {baseMaps.map((item) => {
                  const Icon = item.icon;
                  const active = baseMap === item.id;
                  return (
                      <button key={item.id} type="button" className={`flex min-h-16 flex-col items-start justify-between border p-3 text-left font-mono text-xs transition active:translate-y-px ${active
                              ? "border-[#6ee7f5] bg-[#17272b] text-[#f7f3e8] shadow-[inset_0_2px_0_#6ee7f5]"
                              : "border-[#343a42] bg-[#15191d] text-[#aeb5be] hover:border-[#6ee7f5] hover:bg-[#1b2025]"}`}
                          onClick={() => setBaseMap(item.id)}>
                        <Icon size={18}/>
                        <span>{t(item.labelKey)}</span>
                      </button>
                  );
                })}
              </div>
            </Section>

            <Section title={t("section.region")} icon={Map}>
              <label className="block border border-[#343a42] bg-[#15191d] p-3 transition focus-within:border-[#ffe100]">
              <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#8c959f]">
                {t("region.current")}
              </span>
                <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}
                    className="h-10 w-full border border-[#343a42] bg-[#0b0d0f] px-3 font-mono text-xs text-[#f7f3e8] outline-none transition focus:border-[#ffe100]">
                  {australiaStates.map((state) => (<option key={state.code} value={state.code}>
                        {state.code} - {state.label}
                      </option>
                  ))}
                </select>
              </label>
            </Section>

            <Section title={t("section.bathymetry")} icon={Layers}>
              <button type="button" aria-pressed={bathymetryEnabled}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border border-[#343a42] bg-[#15191d] px-3 py-3 text-left transition hover:border-[#6ee7f5] hover:bg-[#1b2025] active:translate-y-px"
                  onClick={() => setBathymetryEnabled(!bathymetryEnabled)}>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#f7f3e8]">{t("bathymetry.show")}</span>
                <span className="block truncate font-mono text-[9px] uppercase text-[#747d87]">
                  {isNswBathymetry
                      ? t("bathymetry.nswSource")
                      : t("bathymetry.ausSource")}
                </span>
              </span>
                <span className={`relative h-6 w-11 shrink-0 border transition-colors duration-200 ${bathymetryEnabled ? "border-[#3564f4] bg-[#17306b]" : "border-[#414750] bg-[#20242a]"}`}>
                <span className={`absolute left-1 top-1 h-4 w-4 bg-[#f7f3e8] shadow-[2px_2px_0_rgba(0,0,0,.35)] transition-transform duration-200 ${bathymetryEnabled ? "translate-x-5" : ""}`}/>
              </span>
              </button>

              <div className={bathymetryEnabled ? "mt-3 space-y-2" : "mt-3 space-y-2 opacity-45"}>
                <LayerCheck label={t("bathymetry.dem")} checked={showBathymetryDem} disabled={!bathymetryEnabled} onChange={setShowBathymetryDem}/>
                <LayerCheck label={t("bathymetry.isobaths")} checked={showIsobaths} disabled={!bathymetryEnabled || !isNswBathymetry} onChange={setShowIsobaths}/>
                <LayerCheck label={t("bathymetry.ahoDepths")} checked={showAhoDepths} disabled={!bathymetryEnabled} onChange={setShowAhoDepths}/>
                {showAhoDepths && (
                    <p className="border border-[#6f6320] bg-[#25230f] px-3 py-2 font-mono text-[10px] leading-5 text-[#ffe67a]">
                      {t("bathymetry.ahoNote")}
                    </p>
                )}
                {!isNswBathymetry && (
                    <p className="border border-[#285a61] bg-[#10272b] px-3 py-2 font-mono text-[10px] leading-5 text-[#9aedf5]">
                      {t("bathymetry.nonNswNote")}
                    </p>
                )}

                <div className="border border-[#343a42] bg-[#15191d] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase">
                  <span className="flex items-center gap-2 text-[#aeb5be]">
                    <SlidersHorizontal size={16}/>
                    {t("opacity")}
                  </span>
                    <span className="font-bold text-[#58d68d]">
                    {bathymetryOpacity}%
                  </span>
                  </div>
                  <input type="range" min="10" max="100" value={bathymetryOpacity} disabled={!bathymetryEnabled}
                      onInput={(event) =>
                          setBathymetryOpacity(Number(event.currentTarget.value))}
                      onChange={(event) =>
                          setBathymetryOpacity(Number(event.target.value))}
                      className="w-full accent-emerald-400"/>
                </div>
              </div>
            </Section>

            <Section title={t("section.mpa")} icon={ShieldCheck}>
              <button type="button" aria-pressed={marineProtectedEnabled}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border border-[#343a42] bg-[#15191d] px-3 py-3 text-left transition hover:border-[#58d68d] hover:bg-[#1b2025] active:translate-y-px"
                  onClick={() => setMarineProtectedEnabled(!marineProtectedEnabled)}>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#f7f3e8]">
                  {t("mpa.show")}
                </span>
                <span className="block truncate font-mono text-[9px] uppercase text-[#747d87]">
                  {t("mpa.source")}
                </span>
              </span>
                <span className={`relative h-6 w-11 shrink-0 border transition-colors duration-200 ${marineProtectedEnabled ? "border-[#19b56b] bg-[#123622]" : "border-[#414750] bg-[#20242a]"}`}>
                <span className={`absolute left-1 top-1 h-4 w-4 bg-[#f7f3e8] shadow-[2px_2px_0_rgba(0,0,0,.35)] transition-transform duration-200 ${marineProtectedEnabled ? "translate-x-5" : ""}`}/>
              </span>
              </button>

              <div className={marineProtectedEnabled ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-45"}>
                <div className="border border-[#343a42] bg-[#15191d] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase">
                  <span className="flex items-center gap-2 text-[#aeb5be]">
                    <SlidersHorizontal size={16}/>
                    {t("opacity")}
                  </span>
                    <span className="font-bold text-[#6ee7f5]">
                    {marineProtectedOpacity}%
                  </span>
                  </div>
                  <input type="range" min="10" max="100" value={marineProtectedOpacity} disabled={!marineProtectedEnabled}
                      onInput={(event) =>
                          setMarineProtectedOpacity(Number(event.currentTarget.value))}
                      onChange={(event) =>
                          setMarineProtectedOpacity(Number(event.target.value))}
                      className="w-full accent-sky-400"/>
                </div>
              </div>
            </Section>

            <Section title={t("section.marineForecast")} icon={ShipWheel}>
              <MarineForecastSection
                enabled={marineForecastEnabled}
                setEnabled={setMarineForecastEnabled}
                locations={marineForecastLocations}
                setLocations={setMarineForecastLocations}
                selectedLocation={selectedMarineLocation}
                onSelectLocation={onSelectMarineLocation}
                nearbyMessage={marineNearbyMessage}
                t={t}/>
            </Section>


            <TideSection tideInfo={tideInfo} tideStatus={tideStatus} tideError={tideError} tideCoordinate={tideCoordinate} onRefreshTide={onRefreshTide} t={t}/>

            <Section title={t("section.lidar")} icon={SquareStack}>
              <div className="overflow-hidden border border-[#343a42] bg-[#0d1012]">
                <button type="button" className="flex w-full items-center justify-between gap-3 bg-[#15191d] px-3 py-2 text-left font-mono text-[10px] font-bold uppercase text-[#d7dbe0] transition hover:bg-[#1b2025] hover:text-[#ffe100]"
                    onClick={() => setCatalogOpen((value) => !value)}>
                <span>{t("lidar.links")}{" "}{catalogStatus === "ready" ? `(${lidarCatalog.length})` : catalogStatus}
                </span>
                  <ChevronsUpDown size={14} className={`shrink-0 text-[#6ee7f5] transition ${catalogOpen ? "rotate-180" : ""}`}/>
                </button>

                {catalogOpen && (
                    <div className="max-h-28 divide-y divide-[#30343a] overflow-y-scroll overscroll-contain border-t border-[#30343a] [scrollbar-color:#6ee7f5_#0b0d0f] [scrollbar-width:thin]">
                      {lidarCatalog.map((record) => (
                          <a key={`${record.id}-${record.tile}`} href={record.metadataUrl} target="_blank" rel="noreferrer"
                              className="group block px-3 py-2 transition hover:bg-[#17272b]">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[#f7f3e8]">
                                  {record.location}
                                </p>
                                <p className="truncate font-mono text-[9px] text-[#747d87]">
                                  {record.project} · {record.captured ?? t("unknownDate")}
                                </p>
                              </div>
                              <ExternalLink size={13} className="mt-0.5 shrink-0 text-[#6ee7f5] opacity-70 transition group-hover:opacity-100"/>
                            </div>
                          </a>
                      ))}
                      {catalogStatus === "error" && (
                          <p className="px-3 py-2 text-xs text-rose-200">
                            {t("lidar.error")}
                          </p>)}
                    </div>
                )}
              </div>
            </Section>

          </div>
        </aside>
      </>
  );
}

function LayerCheck({ label, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border border-[#343a42] bg-[#15191d] px-3 py-2 font-mono text-[10px] uppercase text-[#d7dbe0] transition hover:border-[#6ee7f5] hover:bg-[#1b2025] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 border-[#59616b] accent-[#6ee7f5]"/>
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="relative border border-[#30343a] bg-[#101316] shadow-[3px_3px_0_#08090a]">
      <h3 className="flex items-center gap-2 border-b border-[#30343a] bg-[#171a1e] px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#aeb5be]">
        <Icon size={13} className="text-[#6ee7f5]" />
        <span className="text-[#ffe100]">//</span> {title}
      </h3>
      <div className="p-2.5 [&_.rounded-full]:rounded-none [&_.rounded-md]:rounded-none">
        {children}
      </div>
    </section>
  );
}
