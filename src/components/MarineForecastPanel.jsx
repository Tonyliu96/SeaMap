import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Compass, Droplets, Gauge, Thermometer, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMarineForecast } from "../services/marineForecast.js";
import { oppositeBearing } from "../utils/mapVectors.js";
import ResizablePanelHandle, { useResizablePanel } from "./ResizablePanelHandle.jsx";
import { Badge, IconButton } from "./ui.jsx";

function value(number, digits = 1) {
  return Number.isFinite(number) ? number.toFixed(digits) : "–";
}

function shortDate(date, locale) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(parsed);
}

function tideTime(event, locale) {
  const parsed = new Date(event.time);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed);
  }
  return String(event.time || "–").slice(-5);
}

function closestHour(hours, date) {
  if (!hours?.length) return null;
  const today = new Date().toLocaleDateString("en-CA");
  if (date !== today) return hours[0];
  const currentHour = new Date().getHours();
  return hours.reduce((closest, hour) => {
    const candidate = Number.parseInt(hour.time, 10);
    const previous = Number.parseInt(closest.time, 10);
    return Math.abs(candidate - currentHour) < Math.abs(previous - currentHour) ? hour : closest;
  }, hours[0]);
}

export default function MarineForecastPanel({ location, onClose, language, t }) {
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [interval, setInterval] = useState(3);
  const panelSize = useResizablePanel("seamap-marine-panel-height", 620, 220);

  useEffect(() => {
    if (!location) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setForecast(null);
    fetchMarineForecast(location.id, { signal: controller.signal })
      .then((data) => {
        setForecast(data);
        setSelectedDate(data.days[0]?.date || "");
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        setError(requestError.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [location]);

  const day = useMemo(
    () => forecast?.days.find((item) => item.date === selectedDate) ?? forecast?.days[0],
    [forecast, selectedDate]
  );
  const hours = useMemo(
    () => (day?.hourly ?? []).filter((_, index) => interval === 1 || index % interval === 0),
    [day, interval]
  );
  const current = useMemo(() => closestHour(day?.hourly, day?.date), [day]);
  const currentColumnTime = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return day?.date === today ? closestHour(hours, day.date)?.time : null;
  }, [day, hours]);
  const locale = language === "zh" ? "zh-CN" : "en-AU";

  if (!location) return null;

  return (
    <section className="absolute inset-x-0 bottom-0 z-[705] flex min-h-[220px] flex-col overflow-hidden rounded-t-3xl border border-aqua-soft/70 bg-surface/95 font-sans shadow-marine-lg backdrop-blur-xl dark:border-white/10 dark:bg-dark-surface/95 md:bottom-4 md:left-[calc(var(--nav-rail-left)+var(--nav-rail-width)+var(--nav-panel-gap))] md:right-4 md:rounded-3xl" style={{ height: `${panelSize.height}px` }}>
      <ResizablePanelHandle onPointerDown={panelSize.onPointerDown} resizeBy={panelSize.resizeBy} label="Resize marine forecast panel" />
      <header className="mt-4 flex min-h-[62px] shrink-0 items-center gap-3 border-b border-aqua-soft/70 px-3 py-2.5 sm:px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-aqua-soft/40 text-primary"><Waves size={19}/></div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-ink-strong dark:text-dark-ink sm:text-base">{location.name}</p>
            <Badge tone="steel" className="shrink-0 text-[10px]">{location.state}</Badge>
          </div>
          <p className="truncate text-xs text-steel">{t("marine.outlook")} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
        </div>
        <IntervalControl interval={interval} setInterval={setInterval} className="hidden sm:flex"/>
        <IconButton aria-label={t("marine.close")} onClick={onClose}><X size={15}/></IconButton>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin] sm:px-3">
        {status === "loading" && <div className="grid h-52 place-items-center rounded-2xl border border-aqua-soft/70 bg-aqua-soft/15 text-sm text-steel">{t("marine.forecastLoading")}</div>}
        {status === "error" && <div className="grid h-52 place-items-center rounded-2xl border border-coral/40 bg-coral/10 px-6 text-center text-sm text-coral-ink">{error || t("marine.forecastError")}</div>}
        {status === "ready" && forecast && (
          <>
            <div className="mb-3 flex items-stretch gap-1 overflow-x-auto rounded-xl bg-aqua-soft/20 p-1">
              {forecast.days.map((item, index) => (
                <button key={item.date}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedDate === item.date ? "bg-primary text-white shadow-sm" : "text-steel hover:bg-surface hover:text-primary dark:hover:bg-white/10"}`}
                  onClick={() => setSelectedDate(item.date)}>
                  {index === 0 ? t("marine.today") : index === 1 ? t("marine.tomorrow") : shortDate(item.date, locale)}
                </button>
              ))}
              <IntervalControl interval={interval} setInterval={setInterval} className="sticky right-0 ml-auto flex sm:hidden"/>
            </div>

            {current && <CurrentConditions hour={current} t={t} />}

            <div className="my-2 grid gap-2 md:grid-cols-[1.4fr_0.8fr]">
              <WaveTrend hours={day?.hourly ?? []} t={t}/>
              <TideEvents tides={day?.tides ?? []} locale={locale} t={t}/>
            </div>

            <div className="mb-1.5 mt-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.hourlyDetails")}</h3>
              <Badge>{interval}h</Badge>
            </div>
            <div className="max-h-[min(36dvh,260px)] overflow-x-auto rounded-2xl border border-aqua-soft/70 bg-surface [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin] dark:border-white/10 dark:bg-dark-surface">
              <table className="min-w-max border-separate border-spacing-0 text-center text-xs text-ink-strong dark:text-dark-ink">
                <thead><tr className="bg-sea/70 text-steel">
                  <th className="sticky left-0 z-10 w-28 border-r border-aqua-soft/70 bg-sea px-3 py-2.5 text-left font-semibold">{t("marine.metric")}</th>
                  {hours.map((hour) => <th key={hour.time} className={`relative w-[62px] border-l border-aqua-soft/50 px-2 py-2.5 font-semibold tabular-nums ${hour.time === currentColumnTime ? "border-x border-primary bg-primary/10 text-primary" : ""}`}>{hour.time === currentColumnTime && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[7px] text-white">▲ {t("marine.now")}</span>}{hour.time}</th>)}
                </tr></thead>
                <tbody>
                  <ForecastRow icon={Wind} label={t("marine.windKmh")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.windSpeedKmh, 0)}/>
                  <ForecastRow icon={Compass} label={t("marine.windDirection")} hours={hours} currentTime={currentColumnTime} render={(hour) => <Direction degrees={hour.windDirectionDegrees} label={hour.windDirection}/>}/>
                  <ForecastRow icon={Waves} label={t("marine.significantWave")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.significantWaveHeightM)}/>
                  <ForecastRow icon={Droplets} label={t("marine.swellHeight")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.swellHeightM)}/>
                  <ForecastRow icon={ArrowDown} label={t("marine.swellDirection")} hours={hours} currentTime={currentColumnTime} render={(hour) => <Direction degrees={hour.swellDirectionDegrees} label={hour.swellDirection}/>}/>
                  <ForecastRow icon={Timer} label={t("marine.swellPeriod")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.swellPeriodSeconds)}/>
                  <ForecastRow icon={Thermometer} label={t("marine.waterTemperature")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.waterTemperatureC, 0)}/>
                  <ForecastRow icon={Gauge} label={t("marine.pressure")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.pressureHpa, 0)}/>
                </tbody>
              </table>
            </div>
            <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-aqua-soft/60 pt-2 text-[10px] text-steel">
              <span>{t("marine.forecastGuidance")}</span>
              <span>{forecast.cacheStatus === "hit" ? t("marine.cached") : t("marine.updated")}</span>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

function IntervalControl({ interval, setInterval, className = "" }) {
  return (
    <div className={`${className} shrink-0 rounded-lg bg-aqua-soft/30 p-0.5`}>
      {[1, 3].map((step) => (
        <button key={step} type="button" className={`min-w-9 rounded-md px-2 py-1 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${interval === step ? "bg-primary text-white shadow-sm" : "text-steel hover:bg-surface hover:text-primary"}`} onClick={() => setInterval(step)}>{step}h</button>
      ))}
    </div>
  );
}

function CurrentConditions({ hour, t }) {
  const pressureDelta = Number.isFinite(hour.pressureDeltaHpa)
    ? `${hour.pressureDeltaHpa > 0 ? "+" : ""}${value(hour.pressureDeltaHpa, 0)} hPa · ${t("marine.pressureThreeHours")}`
    : t("marine.pressureNoHistory");
  const pressureTrend = {
    rising: { label: t("marine.pressureRising"), className: "bg-aqua-soft/40 text-primary" },
    stable: { label: t("marine.pressureStable"), className: "bg-steel/10 text-ink" },
    falling: { label: t("marine.pressureFalling"), className: "bg-coral/15 text-coral-ink" }
  }[hour.pressureTrend];
  const fishingCondition = {
    veryGood: { label: t("marine.pressureVeryGood"), className: "bg-aqua-soft/40 text-primary" },
    good: { label: t("marine.pressureGood"), className: "bg-steel/10 text-ink" },
    poor: { label: t("marine.pressurePoor"), className: "bg-coral/15 text-coral-ink" }
  }[hour.fishingCondition];
  const metrics = [
    { icon: Waves, tone: "text-ink", label: t("marine.swellHeight"), value: value(hour.swellHeightM), unit: "m", direction: hour.swellDirectionDegrees, detail: `${t("marine.significantWave")} ${value(hour.significantWaveHeightM)} m · ${hour.swellDirection || "–"}` },
    { icon: Wind, tone: "text-primary", label: t("marine.windKmh"), value: value(hour.windSpeedKmh, 0), unit: "km/h", direction: hour.windDirectionDegrees, detail: hour.windDirection },
    { icon: Timer, tone: "text-steel", label: t("marine.swellPeriod"), value: value(hour.swellPeriodSeconds), unit: "s" },
    { icon: Thermometer, tone: "text-sand-ink", label: t("marine.waterTemperature"), value: value(hour.waterTemperatureC, 0), unit: "°C" },
    { icon: Gauge, tone: "text-coral", label: t("marine.pressure"), value: value(hour.pressureHpa, 0), unit: "hPa", detail: pressureDelta, statuses: [pressureTrend, fishingCondition].filter(Boolean) }
  ];
  return (
    <section className="pt-1">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.currentConditions")}</h3>
        <Badge>Live · {hour.time}</Badge>
      </div>
      <div className="grid auto-cols-[minmax(148px,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-1 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {metrics.map(({ icon: Icon, tone, label, value: metricValue, unit, direction, detail, statuses }) => (
          <article key={label} className="relative flex h-[112px] min-w-0 flex-col overflow-hidden rounded-2xl border border-aqua-soft/70 bg-aqua-soft/20 p-3 transition duration-200 hover:border-primary/40 hover:bg-aqua-soft/30 dark:border-white/10 dark:bg-white/[0.05]">
            <div className={`flex items-center justify-between gap-2 ${tone}`}>
              <Icon size={16}/>
              {Number.isFinite(direction) && <DirectionArrow degrees={direction}/>}
              {statuses?.length > 0 && <div className="flex min-w-0 gap-1">{statuses.map((status) => <span key={status.label} className={`truncate rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${status.className}`}>{status.label}</span>)}</div>}
            </div>
            <p className="mt-auto truncate text-xs font-medium text-steel">{label}</p>
            <p className="mt-0.5 tabular-nums text-[21px] font-bold leading-none text-ink-strong dark:text-dark-ink">{metricValue}<span className="ml-1 text-[10px] font-medium text-steel">{unit}</span></p>
            <p className={`mt-1 min-h-3 truncate text-[10px] font-medium ${tone}`}>{detail || "\u00a0"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WaveTrend({ hours, t }) {
  const points = hours.filter((hour) => Number.isFinite(hour.significantWaveHeightM));
  if (points.length < 2) return null;
  const values = points.map((hour) => hour.significantWaveHeightM);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.25);
  const coordinates = points.map((hour, index) => `${(index / (points.length - 1)) * 100},${31 - ((hour.significantWaveHeightM - min) / range) * 23}`).join(" ");
  return (
    <section className="min-h-[120px] min-w-0 rounded-2xl border border-aqua-soft/70 bg-surface px-3 py-[11px] shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.waveTrend")}</h3><Badge tone="steel">{value(min)}–{value(max)} m</Badge></div>
      <svg className="mt-2 h-[74px] w-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <line className="text-aqua-soft" x1="0" y1="35" x2="100" y2="35" stroke="currentColor" vectorEffect="non-scaling-stroke"/>
        <polygon className="fill-aqua/25" points={`0,36 ${coordinates} 100,36`}/>
        <polyline className="text-ink" points={coordinates} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <div className="flex justify-between text-[9px] font-medium tabular-nums text-steel"><span>{points[0].time}</span><span>{points[Math.floor(points.length / 2)].time}</span><span>{points.at(-1).time}</span></div>
    </section>
  );
}

function TideEvents({ tides, locale, t }) {
  return (
    <section className="min-h-[120px] min-w-0 rounded-2xl border border-aqua-soft/70 bg-surface px-3 py-[11px] shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.nextTides")}</h3>
      <div className="mt-2 grid gap-1">
        {tides.length ? tides.slice(0, 4).map((event, index) => {
          const high = event.type.includes("high");
          return <div key={`${event.time}-${index}`} className="flex items-center gap-2 rounded-lg bg-aqua-soft/20 px-2.5 py-1.5">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${high ? "bg-primary/10 text-primary" : "bg-ink/10 text-ink"}`}>{high ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</span>
            <span className="min-w-0 flex-1 text-[10px] font-medium text-steel">{high ? t("marine.highTide") : t("marine.lowTide")}</span>
            <strong className="text-xs tabular-nums text-ink-strong dark:text-dark-ink">{tideTime(event, locale)}</strong>
            <span className="w-11 text-right text-[10px] tabular-nums text-ink">{value(event.heightM)} m</span>
          </div>;
        }) : <p className="rounded-lg bg-aqua-soft/20 py-6 text-center text-xs text-steel">{t("marine.noTides")}</p>}
      </div>
    </section>
  );
}

function ForecastRow({ icon: Icon, label, hours, currentTime, render }) {
  return <tr>
    <th className="sticky left-0 z-10 border-r border-t border-aqua-soft/60 bg-bg px-3 py-2.5 text-left font-semibold text-steel dark:bg-dark-surface"><span className="flex items-center gap-2"><Icon size={13} className="text-primary"/>{label}</span></th>
    {hours.map((hour, index) => <td key={hour.time} className={`relative border-l border-t border-aqua-soft/50 px-2 py-2.5 tabular-nums ${hour.time === currentTime ? "border-x border-primary bg-primary/10 font-bold text-primary" : index % 2 ? "bg-bg/60 text-ink-strong" : "text-ink-strong"}`}>{render(hour)}</td>)}
  </tr>;
}

function DirectionArrow({ degrees }) {
  return <ArrowUp size={16} style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>;
}

function Direction({ degrees, label }) {
  if (!Number.isFinite(degrees)) return "–";
  return <span className="inline-flex items-center gap-1" title={`${label || degrees.toFixed(0)}° from`}><DirectionArrow degrees={degrees}/><span>{label || `${degrees.toFixed(0)}°`}</span></span>;
}
