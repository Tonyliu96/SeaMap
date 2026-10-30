import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Compass, Droplets, Gauge, Thermometer, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMarineForecast } from "../services/marineForecast.js";
import { oppositeBearing } from "../utils/mapVectors.js";

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
    <section className="absolute inset-x-0 bottom-0 z-[705] overflow-hidden rounded-t border border-[#34383f] bg-[#0b0d0f]/[0.97] font-sans shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur-xl md:bottom-4 md:left-4 md:right-4 md:rounded">
      <div className="grid h-1 grid-cols-5" aria-hidden="true">
        <span className="bg-[#f7f3e8]"/><span className="bg-[#ffe100]"/><span className="bg-[#ff3b4f]"/><span className="bg-[#19b56b]"/><span className="bg-[#3564f4]"/>
      </div>
      <header className="flex min-h-[58px] items-center gap-3 border-b border-[#30343a] px-3 py-2.5 sm:px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center border border-[#3b4149] bg-[#15191d] text-[#ffe100] shadow-[3px_3px_0_#15191d]"><Waves size={19}/></div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-[#f7f3e8] sm:text-base">{location.name}</p>
            <span className="shrink-0 border border-[#4a5059] bg-[#181c20] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[#9ea5ae]">{location.state}</span>
          </div>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-[#6ee7f5]">{t("marine.outlook")} / {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
        </div>
        <IntervalControl interval={interval} setInterval={setInterval} className="hidden sm:flex"/>
        <button type="button" aria-label={t("marine.close")} className="grid h-8 w-8 shrink-0 place-items-center border border-[#343a42] bg-[#171a1e] text-[#9da4ad] transition hover:border-[#ff3b4f] hover:bg-[#ff3b4f] hover:text-white active:translate-y-px" onClick={onClose}><X size={15}/></button>
      </header>

      <div className="marine-scrollbar max-h-[min(74dvh,680px)] overflow-y-auto px-2.5 pb-3 pt-2.5 sm:px-3">
        {status === "loading" && <div className="grid h-52 place-items-center border border-[#30343a] bg-[#111417] font-mono text-xs uppercase tracking-[0.12em] text-[#7c848e]">{t("marine.forecastLoading")}</div>}
        {status === "error" && <div className="grid h-52 place-items-center border border-[#6d3038] bg-[#231316] px-6 text-center font-mono text-xs text-[#ff8a96]">{error || t("marine.forecastError")}</div>}
        {status === "ready" && forecast && (
          <>
            <div className="mb-2 flex items-stretch gap-px overflow-x-auto border border-[#30343a] bg-[#30343a] p-px">
              {forecast.days.map((item, index) => (
                <button key={item.date}
                  className={`shrink-0 border-b-2 px-3 py-2 font-mono text-[10px] font-bold uppercase transition ${selectedDate === item.date ? "border-[#ffe100] bg-[#f7f3e8] text-[#0b0d0f]" : "border-transparent bg-[#121519] text-[#777f89] hover:bg-[#191d21] hover:text-[#f7f3e8]"}`}
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
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb5be]">// {t("marine.hourlyDetails")}</h3>
              <span className="border border-[#343a42] bg-[#15191d] px-1.5 py-0.5 font-mono text-[8px] text-[#6ee7f5]">STEP {interval}H</span>
            </div>
            <div className="max-h-[min(36dvh,260px)] overflow-x-auto border border-[#30343a] bg-[#0d1012] [scrollbar-color:#3564f4_#15191d] [scrollbar-width:thin]">
              <table className="min-w-max border-separate border-spacing-0 text-center font-mono text-[10px] text-[#c3c8ce]">
                <thead><tr className="bg-[#171a1e] text-[#8b939d]">
                  <th className="sticky left-0 z-10 w-28 border-r border-[#30343a] bg-[#171a1e] px-3 py-2 text-left font-bold uppercase">{t("marine.metric")}</th>
                  {hours.map((hour) => <th key={hour.time} className={`relative w-[62px] border-l border-[#252a30] px-2 py-2 font-bold ${hour.time === currentColumnTime ? "bg-[#ffe100] text-[#0b0d0f]" : ""}`}>{hour.time === currentColumnTime && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[7px] uppercase tracking-wide text-[#0b0d0f]">▲ {t("marine.now")}</span>}{hour.time}</th>)}
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
            <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[#292e34] pt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-[#626a74]">
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
    <div className={`${className} shrink-0 border border-[#343a42] bg-[#111417] p-0.5`}>
      {[1, 3].map((step) => (
        <button key={step} type="button" className={`min-w-9 px-2 py-1 font-mono text-[10px] font-bold transition ${interval === step ? "bg-[#3564f4] text-white" : "text-[#6e7680] hover:bg-[#1b2025] hover:text-white"}`} onClick={() => setInterval(step)}>{step}h</button>
      ))}
    </div>
  );
}

function CurrentConditions({ hour, t }) {
  const pressureDelta = Number.isFinite(hour.pressureDeltaHpa)
    ? `${hour.pressureDeltaHpa > 0 ? "+" : ""}${value(hour.pressureDeltaHpa, 0)} hPa · ${t("marine.pressureThreeHours")}`
    : t("marine.pressureNoHistory");
  const pressureTrend = {
    rising: { label: t("marine.pressureRising"), className: "bg-sky-400/15 text-sky-200" },
    stable: { label: t("marine.pressureStable"), className: "bg-emerald-400/15 text-emerald-200" },
    falling: { label: t("marine.pressureFalling"), className: "bg-rose-400/15 text-rose-200" }
  }[hour.pressureTrend];
  const fishingCondition = {
    veryGood: { label: t("marine.pressureVeryGood"), className: "bg-sky-400/15 text-sky-200" },
    good: { label: t("marine.pressureGood"), className: "bg-emerald-400/15 text-emerald-200" },
    poor: { label: t("marine.pressurePoor"), className: "bg-rose-400/15 text-rose-200" }
  }[hour.fishingCondition];
  const metrics = [
    { icon: Waves, accent: "#ffe100", label: t("marine.swellHeight"), value: value(hour.swellHeightM), unit: "m", direction: hour.swellDirectionDegrees, detail: `${t("marine.significantWave")} ${value(hour.significantWaveHeightM)} m · ${hour.swellDirection || "–"}` },
    { icon: Wind, accent: "#6ee7f5", label: t("marine.windKmh"), value: value(hour.windSpeedKmh, 0), unit: "km/h", direction: hour.windDirectionDegrees, detail: hour.windDirection },
    { icon: Timer, accent: "#b8a1ff", label: t("marine.swellPeriod"), value: value(hour.swellPeriodSeconds), unit: "s" },
    { icon: Thermometer, accent: "#5ee39a", label: t("marine.waterTemperature"), value: value(hour.waterTemperatureC, 0), unit: "°C" },
    { icon: Gauge, accent: "#ff7181", label: t("marine.pressure"), value: value(hour.pressureHpa, 0), unit: "hPa", detail: pressureDelta, statuses: [pressureTrend, fishingCondition].filter(Boolean) }
  ];
  return (
    <section className="pt-1">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#aeb5be]">// {t("marine.currentConditions")}</h3>
        <span className="border border-[#2c684a] bg-[#102319] px-2 py-0.5 font-mono text-[9px] font-bold text-[#5ee39a]">LIVE {hour.time}</span>
      </div>
      <div className="grid auto-cols-[minmax(148px,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-1 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {metrics.map(({ icon: Icon, accent, label, value: metricValue, unit, direction, detail, statuses }) => (
          <article key={label} className="relative flex h-[108px] min-w-0 flex-col overflow-hidden border border-[#30343a] bg-[#121519] p-2.5 shadow-[3px_3px_0_#08090a]">
            <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent }}/>
            <div className="flex items-center justify-between gap-2" style={{ color: accent }}>
              <Icon size={16}/>
              {Number.isFinite(direction) && <DirectionArrow degrees={direction}/>}
              {statuses?.length > 0 && <div className="flex min-w-0 gap-1">{statuses.map((status) => <span key={status.label} className={`truncate border border-current/20 px-1 py-0.5 font-mono text-[7px] font-bold uppercase ${status.className}`}>{status.label}</span>)}</div>}
            </div>
            <p className="mt-auto truncate font-mono text-[9px] font-bold uppercase tracking-[0.06em] text-[#6f7781]">{label}</p>
            <p className="mt-0.5 tabular-nums font-mono text-[21px] font-bold leading-none text-[#f7f3e8]">{metricValue}<span className="ml-1 text-[9px] font-bold text-[#777f89]">{unit}</span></p>
            <p className="mt-1 min-h-3 truncate font-mono text-[8px] font-bold" style={{ color: accent }}>{detail || "\u00a0"}</p>
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
    <section className="min-h-[120px] min-w-0 border border-[#30343a] bg-[#111417] px-3 py-[11px] shadow-[3px_3px_0_#08090a]">
      <div className="flex items-center justify-between"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#aeb5be]">// {t("marine.waveTrend")}</h3><span className="border border-[#3a4048] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-[#ffe100]">{value(min)}–{value(max)} m</span></div>
      <svg className="mt-2 h-[74px] w-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="35" x2="100" y2="35" stroke="#343a42" vectorEffect="non-scaling-stroke"/>
        <polygon points={`0,36 ${coordinates} 100,36`} fill="rgba(53,100,244,.22)"/>
        <polyline points={coordinates} fill="none" stroke="#6ee7f5" strokeWidth="2" strokeLinejoin="miter" vectorEffect="non-scaling-stroke"/>
      </svg>
      <div className="flex justify-between font-mono text-[8px] font-bold text-[#626a74]"><span>{points[0].time}</span><span>{points[Math.floor(points.length / 2)].time}</span><span>{points.at(-1).time}</span></div>
    </section>
  );
}

function TideEvents({ tides, locale, t }) {
  return (
    <section className="min-h-[120px] min-w-0 border border-[#30343a] bg-[#111417] px-3 py-[11px] shadow-[3px_3px_0_#08090a]">
      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#aeb5be]">// {t("marine.nextTides")}</h3>
      <div className="mt-2 grid gap-px bg-[#30343a]">
        {tides.length ? tides.slice(0, 4).map((event, index) => {
          const high = event.type.includes("high");
          return <div key={`${event.time}-${index}`} className="flex items-center gap-2 bg-[#171a1e] px-2.5 py-1.5 font-mono">
            <span className={`grid h-5 w-5 place-items-center border ${high ? "border-[#3564f4] text-[#6ee7f5]" : "border-[#19b56b] text-[#5ee39a]"}`}>{high ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}</span>
            <span className="min-w-0 flex-1 text-[9px] font-bold uppercase text-[#777f89]">{high ? t("marine.highTide") : t("marine.lowTide")}</span>
            <strong className="text-[10px] tabular-nums text-[#f7f3e8]">{tideTime(event, locale)}</strong>
            <span className="w-11 text-right text-[9px] tabular-nums text-[#aeb5be]">{value(event.heightM)} m</span>
          </div>;
        }) : <p className="bg-[#171a1e] py-6 text-center font-mono text-[9px] text-[#626a74]">{t("marine.noTides")}</p>}
      </div>
    </section>
  );
}

function ForecastRow({ icon: Icon, label, hours, currentTime, render }) {
  return <tr>
    <th className="sticky left-0 z-10 border-r border-t border-[#2a2f35] bg-[#15181c] px-3 py-2 text-left font-bold uppercase text-[#8b939d]"><span className="flex items-center gap-2"><Icon size={13} className="text-[#6ee7f5]"/>{label}</span></th>
    {hours.map((hour) => <td key={hour.time} className={`relative border-l border-t border-[#252a30] px-2 py-2 tabular-nums ${hour.time === currentTime ? "bg-[#ffe100] font-bold text-[#0b0d0f]" : "text-[#c3c8ce]"}`}>{render(hour)}</td>)}
  </tr>;
}

function DirectionArrow({ degrees }) {
  return <ArrowUp size={16} style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>;
}

function Direction({ degrees, label }) {
  if (!Number.isFinite(degrees)) return "–";
  return <span className="inline-flex items-center gap-1" title={`${label || degrees.toFixed(0)}° from`}><DirectionArrow degrees={degrees}/><span>{label || `${degrees.toFixed(0)}°`}</span></span>;
}
