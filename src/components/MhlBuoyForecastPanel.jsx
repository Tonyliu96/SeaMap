import { useEffect, useMemo, useState } from "react";
import { Waves, Wind, X } from "lucide-react";
import { fetchMhlBuoyForecast } from "../services/mhlWaves.js";
import {formatMeters, formatSeconds, formatWindDirection, formatWindSpeed} from "../services/tides.js";
import TideChartRow from "./TideChartRow.jsx";
import {formatHour,formatNumber, formatObservedAt, groupHoursByDay} from "../utils/mhlFormatters.js";


const VISIBLE_HOURS = 96;

export default function MhlBuoyForecastPanel({ buoy, onClose, t }) {
  const [status, setStatus] = useState("idle");
  const [forecast, setForecast] = useState(null);
  const [hourStep, setHourStep] = useState(1);

  useEffect(() => {
    if (!buoy) return undefined;

    let mounted = true;
    setStatus("loading");
    setForecast(null);

    fetchMhlBuoyForecast(buoy)
      .then((data) => {
        if (!mounted) return;
        setForecast(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [buoy]);

  const hours = useMemo(() => {
    const sourceHours = (forecast?.hours ?? [])
      .filter((hour) => hour.time instanceof Date)
      .slice(0, VISIBLE_HOURS);

    if (hourStep === 3) {
      return sourceHours.filter((_, index) => index % 3 === 0);
    }
    return sourceHours;
  }, [forecast, hourStep]);

  if (!buoy) return null;

  return (
    <section className="absolute bottom-3 left-3 right-3 z-[700] max-h-[34dvh] overflow-hidden rounded-lg border border-cyan-300/20 bg-slate-950/92 text-slate-100 shadow-[0_-20px_70px_rgba(2,6,23,0.42)] backdrop-blur-md md:left-4 md:right-4">
      <div className="flex items-start justify-between gap-3 border-b border-cyan-300/15 bg-gradient-to-r from-slate-950 via-sky-950/92 to-slate-900 px-3 py-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
            <Waves size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300/90">
            {t("mhl.panelTitle")}
            </p>
            <h2 className="truncate text-sm font-semibold text-slate-50">
              {buoy.name ?? buoy.sitecode}
            </h2>
            <p className="truncate text-[10px] text-slate-400">
              <span className="font-semibold text-sky-200/90">{buoy.sitecode}</span>
              <span className="px-1.5 text-slate-600">·</span>
              {buoy.latitude.toFixed(4)}, {buoy.longitude.toFixed(4)}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
          onClick={onClose}
          aria-label={t("mhl.closePanel")}>
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[calc(34dvh-54px)] overflow-y-auto p-2 [scrollbar-color:rgba(103,232,249,0.65)_rgba(15,23,42,0.55)] [scrollbar-width:thin]">
        {status === "loading" && (
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
            {t("mhl.forecastLoading")}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-rose-300/25 bg-rose-500/10 px-3 py-4 text-sm text-rose-100">
            {t("mhl.forecastError")}
          </div>
        )}

        {status === "ready" && (
          <>
            <CurrentObservation latest={forecast?.latest} hourStep={hourStep} setHourStep={setHourStep} t={t}/>

            <div className="mt-3 overflow-x-auto rounded-md border border-white/10 bg-white/5 [scrollbar-color:rgba(103,232,249,0.65)_rgba(15,23,42,0.55)] [scrollbar-width:thin]">
              <div
                className="mhl-forecast-grid min-w-max"
                style={{ gridTemplateColumns: `72px repeat(${hours.length}, 48px)` }}>
                <DayRow hours={hours} t={t} />
                <HeaderRow hours={hours} t={t} />
                <ArrowRow label={t("mhl.wind")} values={hours} field="windDirection" />
                <ValueRow label="km/h" values={hours} field="windSpeed" formatter={(value) => formatNumber(value, 0)} colorClass="mhl-wind-cell" />
                <ValueRow label={t("mhl.temperature")} values={hours} field="temperature" formatter={(value) => formatNumber(value, 0)} colorClass="mhl-temp-cell" />
                <ArrowRow label={t("mhl.swell")} values={hours} field="waveDirection" strong />
                {/*<DualValueRow label="m / s" values={hours} />*/}
                <ValueRow icon={Waves} label={t("mhl.waveHeight") ?? "Wave"} values={hours} field="waveHeight"
                    formatter={(value) => formatNumber(value, 1)}
                    colorClass="mhl-grid-cell font-semibold text-cyan-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-sky-950/50"/>

                <ValueRow label={t("mhl.wavePeriod") ?? "Wave period"} values={hours} field="wavePeriod"
                    formatter={(value) => formatNumber(value, 0)}
                    colorClass="mhl-grid-cell text-slate-300 bg-slate-900/40"/>

                {/*<ValueRow label={t("mhl.tideMsl")} values={hours} field="seaLevel" formatter={(value) => formatNumber(value, 2)} colorClass="mhl-tide-cell" />*/}
                <TideChartRow label={t("mhl.tideMsl")} values={hours} />
              </div>
            </div>
            <p className="mt-1.5 text-[10px] leading-3 text-slate-400">
              {t("mhl.disclaimer")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function DayRow({ hours, t }) {
  const dayGroups = groupHoursByDay(hours, t);

  return (
    <>
      <div className="mhl-grid-label mhl-day-cell sticky left-0 z-20 justify-end">{t("mhl.day")}</div>
      {dayGroups.map((group) => (
        <div
          key={group.key}
          className="mhl-day-cell mhl-day-group"
          style={{ gridColumn: `span ${group.count}` }}>
          {group.label}
        </div>
      ))}
    </>
  );
}


function CurrentObservation({ latest, hourStep, setHourStep, t }) {
  return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Metric title={t("mhl.latestWaveHeight")} value={formatMeters(latest?.waveHeight, t)} />
        <Metric title={t("mhl.latestWavePeriod")} value={formatSeconds(latest?.wavePeriod, t)} />
        <Metric title={t("mhl.latestWaveDirection")} value={formatWindDirection(latest?.waveDirection, t)} />
        <Metric title={t("mhl.observedAt")} value={formatObservedAt(latest?.observedAt, t)} />

        {/* 1h / 3h 步长切换按钮，并排嵌入最右侧 */}
        <div className="ml-auto flex items-center overflow-hidden rounded-md border border-cyan-300/15 bg-slate-900/80 p-0.5">
          {[1, 3].map((step) => (
              <button
                  key={step}
                  type="button"
                  className={`h-6 min-w-8 rounded px-2 text-[10px] font-semibold transition ${
                      hourStep === step
                          ? "bg-cyan-300 text-slate-950"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setHourStep(step)}>
                {step}h
              </button>
          ))}
        </div>
      </div>
  );
}

function Metric({ title, value }) {
  return (
      <div className="min-w-[150px] rounded-md border border-cyan-300/15 bg-sky-950/70 px-2 py-1">
        <p className="truncate text-[9px] uppercase tracking-wider text-cyan-200">{title}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-white">{value}</p>
      </div>
  );
}

function HeaderRow({hours, t}) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20 bg-slate-900/95">{t("mhl.time")}</div>
        {hours.map((hour) => (
            <div key={`time-${hour.time.toISOString()}`} className="mhl-time-cell">
              <span>{formatHour(hour.time)}</span>
            </div>
        ))}
      </>
  );
}

function ArrowRow({label, values, field, strong = false}) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20 flex items-center gap-1 bg-slate-900/95 px-2">
          {field === "windDirection" ? <Wind size={13} className="text-cyan-400"/> : null}
          <span>{label}</span>
        </div>
        {values.map((hour) => (
            <div key={`${field}-${hour.time.toISOString()}`}
                 className={strong ? "mhl-arrow-cell is-wave" : "mhl-arrow-cell"}>
              {Number.isFinite(hour[field]) ? (
                  <span style={{transform: `rotate(${hour[field]}deg)` }}>&#8593;</span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
      ))}
    </>
  );
}

function ValueRow({ icon: Icon, label, values, field, formatter, colorClass }) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20 flex items-center gap-1.5 bg-slate-900/95 px-2 text-xs text-slate-300">
          {Icon && <Icon size={13} className="shrink-0 text-cyan-400" />}
          <span className="truncate">{label}</span>
        </div>

        {values.map((hour) => {
          const val = hour[field];

          let dynamicColor = colorClass ?? "mhl-grid-cell";
          if (field === "waveHeight") {
            dynamicColor = val > 1.5
                ? "font-bold text-rose-200 bg-rose-950/60 drop-shadow"
                : "font-semibold text-sky-200 bg-sky-950/30";
          }

          return (
              <div key={`${field}-${hour.time.toISOString()}`} className={`flex items-center justify-center text-xs ${dynamicColor}`}>
                {formatter ? formatter(val) : val}
              </div>
          );
        })}
      </>
  );
}

