import { useEffect, useState } from "react";
import {ChevronsUpDown, ExternalLink, Map, Satellite, SlidersHorizontal} from "lucide-react";
import { australiaStates } from "../constants/australiaStates.js";
import {loadNswLidarCatalog} from "../services/nswLidar.js";
import {languageOptions} from "../constants/localization.js";
import {getMainPanels} from "../constants/mainPanels.js";
import MarineForecastSection from "./MarineForecastSection.jsx";
import PanelShell from "./PanelShell.jsx";

const baseMaps = [
  { id: "streets", labelKey: "base.streets", icon: Map },
  { id: "satellite", labelKey: "base.satellite", icon: Satellite }
];

export default function Sidebar({
  darkMode,
  setDarkMode,
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
  const [activeSection, setActiveSection] = useState("layers");
  const isNswBathymetry = selectedRegion === "NSW";
  const panelOpen = isOpen;
  const panelActivity = {layers: bathymetryEnabled, protected: marineProtectedEnabled, forecast: marineForecastEnabled};
  const navigationItems = getMainPanels(t);
  const currentNavigation = navigationItems.find((item) => item.id === activeSection) ?? navigationItems[1];

  const selectSection = (sectionId) => {
    if (panelOpen && activeSection === sectionId) {
      setIsOpen(false);
      return;
    }
    setActiveSection(sectionId);
    setIsOpen(true);
  };

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
        <nav className="absolute bottom-3 left-3 right-3 z-[730] flex h-14 items-center justify-center gap-1 rounded-2xl border border-aqua-soft/70 bg-surface p-1 shadow-marine dark:border-white/10 dark:bg-dark-surface md:bottom-auto md:left-[var(--nav-rail-left)] md:right-auto md:top-1/2 md:h-auto md:w-[var(--nav-rail-width)] md:-translate-y-1/2 md:flex-col" aria-label={t("layer.title")}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const selected = panelOpen && activeSection === item.id;
            return (
              <button key={item.id} type="button" aria-label={item.title} aria-pressed={selected}
                  className={`group relative grid h-12 w-12 shrink-0 place-items-center rounded-xl transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "bg-aqua-soft/60 text-primary" : "text-steel hover:bg-aqua-soft/30 hover:text-primary"}`}
                  onClick={() => selectSection(item.id)}>
                <Icon size={19}/>
                {panelActivity[item.id] && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"/>}
                <span className="pointer-events-none absolute bottom-[calc(100%+8px)] whitespace-nowrap rounded-lg bg-ink-strong px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-marine transition group-hover:opacity-100 md:bottom-auto md:left-[calc(100%+8px)]">{item.title}</span>
              </button>
            );
          })}
        </nav>

        <PanelShell panel={currentNavigation} open={panelOpen} darkMode={darkMode}
            onToggleTheme={() => setDarkMode(!darkMode)} onClose={() => setIsOpen(false)}>
            {activeSection === "map" && <>
            <Section title={t("language.section")} icon={SlidersHorizontal}>
              <SelectField label={t("language.current")} value={language} onChange={(event) => setLanguage(event.target.value)}>
                  {languageOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {t(option.labelKey)}
                      </option>
                  ))}
              </SelectField>
            </Section>

            <Section title={t("map.style")} icon={Map}>
              <div className="grid grid-cols-2 gap-2">
                {baseMaps.map((item) => {
                  const Icon = item.icon;
                  const active = baseMap === item.id;
                  return (
                      <button key={item.id} type="button" className={`flex min-h-20 flex-col items-start justify-between rounded-xl border p-3 text-left text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active
                              ? "border-primary bg-aqua-soft/35 text-primary shadow-sm"
                              : "border-aqua-soft bg-surface text-steel hover:border-primary hover:bg-aqua-soft/20 hover:text-primary dark:border-white/10 dark:bg-dark-surface"}`}
                          onClick={() => setBaseMap(item.id)}>
                        <Icon size={18}/>
                        <span>{t(item.labelKey)}</span>
                      </button>
                  );
                })}
              </div>
            </Section>

            <Section title={t("section.region")} icon={Map}>
              <SelectField label={t("region.current")} value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
                  {australiaStates.map((state) => (<option key={state.code} value={state.code}>
                        {state.code} - {state.label}
                      </option>
                  ))}
              </SelectField>
            </Section>
            </>}

            {activeSection === "layers" && <div className="space-y-3">
              <ToggleButton
                checked={bathymetryEnabled}
                title={t("bathymetry.show")}
                description={isNswBathymetry ? t("bathymetry.nswSource") : t("bathymetry.ausSource")}
                onClick={() => setBathymetryEnabled(!bathymetryEnabled)}/>

              <div className={bathymetryEnabled ? "mt-3 space-y-2" : "mt-3 space-y-2 opacity-45"}>
                <LayerCheck label={t("bathymetry.dem")} checked={showBathymetryDem} disabled={!bathymetryEnabled} onChange={setShowBathymetryDem}/>
                <LayerCheck label={t("bathymetry.isobaths")} checked={showIsobaths} disabled={!bathymetryEnabled || !isNswBathymetry} onChange={setShowIsobaths}/>
                <LayerCheck label={t("bathymetry.ahoDepths")} checked={showAhoDepths} disabled={!bathymetryEnabled} onChange={setShowAhoDepths}/>
                {showAhoDepths && (
                    <p className="rounded-lg border border-amber/50 bg-amber/20 px-3 py-2 text-[11px] leading-5 text-amber-ink">
                      {t("bathymetry.ahoNote")}
                    </p>
                )}
                {!isNswBathymetry && (
                    <p className="rounded-lg border border-aqua-soft bg-aqua-soft/25 px-3 py-2 text-[11px] leading-5 text-ink">
                      {t("bathymetry.nonNswNote")}
                    </p>
                )}

                <SliderField label={t("opacity")} value={bathymetryOpacity} disabled={!bathymetryEnabled} onChange={setBathymetryOpacity}/>
              </div>
            </div>}

            {activeSection === "protected" && <div className="space-y-3">
              <ToggleButton checked={marineProtectedEnabled} title={t("mpa.show")} description={t("mpa.source")} onClick={() => setMarineProtectedEnabled(!marineProtectedEnabled)}/>

              <div className={marineProtectedEnabled ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-45"}>
                <SliderField label={t("opacity")} value={marineProtectedOpacity} disabled={!marineProtectedEnabled} onChange={setMarineProtectedOpacity}/>
              </div>
            </div>}

            {activeSection === "forecast" &&
              <MarineForecastSection
                enabled={marineForecastEnabled}
                setEnabled={setMarineForecastEnabled}
                locations={marineForecastLocations}
                setLocations={setMarineForecastLocations}
                selectedLocation={selectedMarineLocation}
                onSelectLocation={onSelectMarineLocation}
                nearbyMessage={marineNearbyMessage}
                t={t}/>
            }

            {activeSection === "data" &&
              <div className="overflow-hidden rounded-xl border border-aqua-soft/70 bg-surface dark:border-white/10 dark:bg-dark-surface">
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold text-ink-strong transition duration-200 hover:bg-aqua-soft/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-dark-ink"
                    onClick={() => setCatalogOpen((value) => !value)}>
                <span>{t("lidar.links")}{" "}{catalogStatus === "ready" ? `(${lidarCatalog.length})` : catalogStatus}
                </span>
                  <ChevronsUpDown size={14} className={`shrink-0 text-primary transition ${catalogOpen ? "rotate-180" : ""}`}/>
                </button>

                {catalogOpen && (
                    <div className="max-h-36 divide-y divide-aqua-soft/60 overflow-y-scroll overscroll-contain border-t border-aqua-soft/60 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin]">
                      {lidarCatalog.map((record) => (
                          <a key={`${record.id}-${record.tile}`} href={record.metadataUrl} target="_blank" rel="noreferrer"
                              className="group block px-3 py-2.5 transition duration-200 hover:bg-aqua-soft/20">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-ink-strong dark:text-dark-ink">
                                  {record.location}
                                </p>
                                <p className="truncate text-[10px] text-steel">
                                  {record.project} · {record.captured ?? t("unknownDate")}
                                </p>
                              </div>
                              <ExternalLink size={13} className="mt-0.5 shrink-0 text-primary opacity-70 transition group-hover:opacity-100"/>
                            </div>
                          </a>
                      ))}
                      {catalogStatus === "error" && (
                          <p className="px-3 py-2 text-xs text-coral-ink">
                            {t("lidar.error")}
                          </p>)}
                    </div>
                )}
              </div>}
        </PanelShell>
      </>
  );
}

function LayerCheck({ label, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-aqua-soft bg-surface px-3 py-2 text-xs text-ink-strong transition duration-200 hover:border-primary hover:bg-aqua-soft/20 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 dark:bg-dark-surface dark:text-dark-ink">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-steel accent-primary focus-visible:ring-2 focus-visible:ring-primary"/>
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-aqua-soft/70 bg-surface shadow-sm dark:border-white/10 dark:bg-dark-surface">
      <h3 className="flex items-center gap-2 border-b border-aqua-soft/60 bg-aqua-soft/20 px-3 py-2.5 text-[12px] font-semibold text-ink-strong dark:text-dark-ink">
        <Icon size={15} className="text-primary" />
        {title}
      </h3>
      <div className="p-2.5">
        {children}
      </div>
    </section>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="block rounded-xl bg-aqua-soft/15 p-3 transition duration-200 focus-within:bg-aqua-soft/25">
      <span className="mb-2 block text-xs font-medium text-steel">{label}</span>
      <select className="h-11 w-full rounded-lg border border-aqua-soft bg-surface px-3 text-sm text-ink-strong outline-none transition duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-dark-bg dark:text-dark-ink" {...props}>
        {children}
      </select>
    </label>
  );
}

function ToggleButton({ checked, title, description, onClick }) {
  return (
    <button type="button" aria-pressed={checked} className="flex w-full items-center justify-between gap-3 rounded-xl border border-aqua-soft bg-surface px-3 py-3 text-left transition duration-200 hover:border-primary hover:bg-aqua-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-dark-surface" onClick={onClick}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-strong dark:text-dark-ink">{title}</span>
        <span className="block truncate text-[10px] text-steel">{description}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-steel/25"}`}>
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : ""}`}/>
      </span>
    </button>
  );
}

function SliderField({ label, value, disabled, onChange }) {
  return (
    <div className="rounded-xl border border-aqua-soft/70 bg-aqua-soft/15 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 font-medium text-steel"><SlidersHorizontal size={15}/>{label}</span>
        <span className="font-semibold tabular-nums text-primary">{value}%</span>
      </div>
      <input type="range" min="10" max="100" value={value} disabled={disabled} onInput={(event) => onChange(Number(event.currentTarget.value))} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-40"/>
    </div>
  );
}
