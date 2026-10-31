import { ArrowUp, Compass, Gauge, Thermometer, Timer, Waves, Wind } from "lucide-react";
import { oppositeBearing } from "../utils/mapVectors.js";
import { Badge } from "./ui.jsx";

// Rating values are computed by api/marine/pressure.py using its centralized PressureConfig thresholds.
const PRESSURE_RATING_STYLES = {
  veryGood: "bg-primary/25 text-ink-strong dark:text-dark-ink",
  good: "bg-primary/12 text-ink-strong dark:text-dark-ink",
  poor: "bg-coral/20 text-ink-strong dark:text-dark-ink"
};

function numeric(number, digits = 1) {
  return Number.isFinite(number) ? number.toFixed(digits) : "–";
}

function RotatingArrow({ degrees, className = "h-5 w-5" }) {
  if (!Number.isFinite(degrees)) return null;
  return <ArrowUp className={`${className} shrink-0`} style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>
}

function SwellCompass({ degrees, direction }) {
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border border-aqua-soft bg-surface shadow-sm dark:border-white/10 dark:bg-dark-surface" aria-label={`Swell from ${direction || "unknown"}${Number.isFinite(degrees) ? `, ${Math.round(degrees)} degrees` : ""}`}>
      <span className="absolute top-1 text-[8px] font-semibold text-steel">N</span>
      <span className="absolute bottom-1 text-[8px] font-semibold text-steel">S</span>
      <span className="absolute left-1.5 text-[8px] font-semibold text-steel">W</span>
      <span className="absolute right-1.5 text-[8px] font-semibold text-steel">E</span>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-aqua-soft/35 text-ink">
        <RotatingArrow degrees={degrees} className="h-6 w-6"/>
      </div>
    </div>
  );
}

function pressureTrend(hour, t) {
  return {
    rising: { label: t("marine.pressureRising"), className: "bg-aqua-soft/55 text-ink-strong dark:text-dark-ink" },
    stable: { label: t("marine.pressureStable"), className: "bg-aqua-soft/55 text-ink-strong dark:text-dark-ink" },
    falling: { label: t("marine.pressureFalling"), className: "bg-aqua-soft/55 text-ink-strong dark:text-dark-ink" }
  }[hour.pressureTrend];
}

function pressureRating(hour, t) {
  const label = {
    veryGood: t("marine.pressureVeryGood"),
    good: t("marine.pressureGood"),
    poor: t("marine.pressurePoor")
  }[hour.fishingCondition];
  return label ? { label, className: PRESSURE_RATING_STYLES[hour.fishingCondition] } : null;
}

export default function MarineCurrentConditions({ hour, t }) {
  const trend = pressureTrend(hour, t);
  const rating = pressureRating(hour, t);
  const pressureDelta = Number.isFinite(hour.pressureDeltaHpa)
    ? `${hour.pressureDeltaHpa > 0 ? "+" : ""}${numeric(hour.pressureDeltaHpa, 0)} hPa · ${t("marine.pressureThreeHours")}`
    : t("marine.pressureNoHistory");
  const swellDescription = Number.isFinite(hour.swellHeightM)
    ? `Swell is coming from the ${hour.swellDirection || "reported direction"} at ${numeric(hour.swellHeightM)} m with a ${numeric(hour.swellPeriodSeconds)} s period.`
    : `Wave direction is ${hour.swellDirection || "not available"}.`;

  return (
    <section className="pt-1" aria-label="Current marine conditions">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.currentConditions")}</h3>
        <Badge className="shrink-0">Live · {hour.time}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-12">
        <article className="col-span-2 flex min-w-0 items-center gap-3 rounded-2xl border border-aqua-soft/70 bg-aqua-soft/20 p-3 transition duration-200 hover:border-primary/40 hover:bg-aqua-soft/30 dark:border-white/10 dark:bg-white/[0.05] lg:col-span-4" aria-label={`Wave height ${numeric(hour.significantWaveHeightM)} metres, swell from ${hour.swellDirection || "unknown"}`}>
          <SwellCompass degrees={hour.swellDirectionDegrees} direction={hour.swellDirection}/>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-primary"><Compass size={15}/><span className="text-xs font-semibold">Swell from</span></div>
            <p className="mt-1 text-sm font-bold text-ink">{hour.swellDirection || "–"} <span className="font-medium tabular-nums text-steel">{Number.isFinite(hour.swellDirectionDegrees) ? `${Math.round(hour.swellDirectionDegrees)}°` : ""}</span></p>
            <p className="mt-2 text-xs font-medium text-steel">{t("marine.significantWave")}</p>
            <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.significantWaveHeightM)}<span className="ml-1 text-xs font-semibold text-steel">m</span></p>
            <p className="mt-1 text-[10px] font-medium text-ink">Swell {numeric(hour.swellHeightM)} m</p>
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border border-aqua-soft/70 bg-surface p-3 transition duration-200 hover:border-primary/40 dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2" aria-label={`Swell period ${numeric(hour.swellPeriodSeconds)} seconds`}>
          <div className="flex items-center gap-1.5 text-steel"><Timer size={16}/><span className="text-xs font-semibold">{t("marine.swellPeriod")}</span></div>
          <p className="mt-4 text-3xl font-bold leading-none tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.swellPeriodSeconds)}<span className="ml-1 text-xs font-semibold text-steel">s</span></p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-aqua-soft/40" aria-label="Period scale from shorter to longer swell">
            <div className="h-full w-full bg-gradient-to-r from-aqua via-primary/70 to-primary"/>
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-medium text-steel"><span>Short</span><span>Long</span></div>
        </article>

        <article className="min-w-0 rounded-2xl border border-aqua-soft/70 bg-surface p-3 transition duration-200 hover:border-primary/40 dark:border-white/10 dark:bg-white/[0.04] lg:col-span-3" aria-label={`Wind ${numeric(hour.windSpeedKmh, 0)} kilometres per hour from ${hour.windDirection || "unknown"}`}>
          <div className="flex items-center justify-between gap-2 text-primary">
            <span className="flex items-center gap-1.5"><Wind size={16}/><span className="text-xs font-semibold">{t("marine.windKmh")}</span></span>
            <RotatingArrow degrees={hour.windDirectionDegrees}/>
          </div>
          <p className="mt-4 text-3xl font-bold leading-none tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.windSpeedKmh, 0)}<span className="ml-1 text-xs font-semibold text-steel">km/h</span></p>
          <p className="mt-2 text-sm font-semibold text-ink">From {hour.windDirection || "–"} <span className="font-medium tabular-nums text-steel">{Number.isFinite(hour.windDirectionDegrees) ? `${Math.round(hour.windDirectionDegrees)}°` : ""}</span></p>
        </article>

        <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 lg:col-span-3">
          <article className="min-w-0 rounded-2xl border border-aqua-soft/70 bg-aqua-soft/15 p-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label={`Water temperature ${numeric(hour.waterTemperatureC, 0)} degrees Celsius`}>
            <Thermometer size={16} className="text-steel"/>
            <p className="mt-3 text-[10px] font-semibold text-steel">{t("marine.waterTemperature")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.waterTemperatureC, 0)}<span className="ml-1 text-[10px] font-semibold text-steel">°C</span></p>
          </article>
          <article className="min-w-0 rounded-2xl border border-aqua-soft/70 bg-aqua-soft/15 p-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label={`Pressure ${numeric(hour.pressureHpa, 0)} hectopascals, ${trend?.label || "trend unavailable"}, ${rating?.label || "rating unavailable"}`}>
            <div className="flex flex-wrap items-start justify-between gap-1">
              <Gauge size={16} className="shrink-0 text-steel"/>
              <div className="flex min-w-0 flex-wrap justify-end gap-1">
                {trend && <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${trend.className}`}>{trend.label}</span>}
                {rating && <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${rating.className}`}>{rating.label}</span>}
              </div>
            </div>
            <p className="mt-3 text-[10px] font-semibold text-steel">{t("marine.pressure")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.pressureHpa, 0)}<span className="ml-1 text-[10px] font-semibold text-steel">hPa</span></p>
            <p className="mt-1 text-[9px] font-medium leading-tight text-coral-ink">{pressureDelta}</p>
          </article>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-2 rounded-xl bg-sea/60 px-3 py-2 text-xs leading-relaxed text-ink-strong dark:bg-white/[0.05] dark:text-dark-ink">
        <Waves size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>
        <span>{swellDescription}</span>
      </p>
    </section>
  );
}
