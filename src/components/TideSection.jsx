import React, {useState} from "react";
import {ChevronsUpDown, RefreshCw, Waves} from "lucide-react";
import {formatMeters, formatSeconds, formatTideTime, formatWindDirection, formatWindSpeed, getTodayTideEvents, groupThreeDayTideEvents} from "../services/tides.js";

function Section({title, icon: Icon, children}) {
    return (
        <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {Icon && <Icon size={14}/>}
                {title}
            </h3>
            {children}
        </section>
    );
}

function TidePanel({tideInfo, tideStatus, tideError, tideCoordinate, onRefreshTide, t}) {
    const [futureOpen, setFutureOpen] = useState(false);
    const todayEvents = getTodayTideEvents(tideInfo);
    const groups = groupThreeDayTideEvents(tideInfo);

    return (
        <div className="space-y-3 rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">
                        {t("tide.currentTitle")}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                        {t(tideCoordinate?.sourceKey ?? "map.center")}{" "}
                        {Number.isFinite(tideCoordinate?.lat)
                            ? `${tideCoordinate.lat.toFixed(4)}, ${tideCoordinate.lng.toFixed(4)}` : ""}
                    </p>
                </div>
                <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                    disabled={tideStatus === "loading"}
                    onClick={() => onRefreshTide?.()}
                    title={t("tide.refresh")}>
                    <RefreshCw size={15} className={tideStatus === "loading" ? "animate-spin" : ""}/>
                </button>
            </div>

            {tideError && (
                <p className="rounded-md border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    {tideError}
                </p>
            )}

            {tideStatus === "loading" && !tideInfo ? (
                <p className="text-xs text-slate-400">{t("tide.loading")}</p>
            ) : tideInfo ? (
                <>
                    <div className="space-y-2">
                        <CompactTideMetrics
                            items={[
                                [t("tide.seaLevel"), formatMeters(tideInfo.currentSeaLevel, t)],
                                [t("tide.waveHeight"), formatMeters(tideInfo.waveHeight, t)],
                                [t("tide.wavePeriod"), formatSeconds(tideInfo.wavePeriod, t)],
                                [t("tide.waveSource"), tideInfo.waveSource ?? t("notAvailable")],
                                [t("tide.windSpeed"), formatWindSpeed(tideInfo.windSpeed, t)],
                                [t("tide.windDirection"), formatWindDirection(tideInfo.windDirection, t)]]}/>
                        {tideInfo.wavePoint && (
                            <p className="rounded-md border border-cyan-300/15 bg-cyan-400/10 px-2 py-1 text-[11px] leading-4 text-cyan-100">
                                {t("tide.nearshorePoint", {
                                    name: tideInfo.wavePoint.name ?? tideInfo.wavePoint.sitecode,
                                    id: tideInfo.wavePoint.sitecode ?? tideInfo.wavePoint.id,
                                    distance: tideInfo.wavePointDistanceKm?.toFixed(1) ?? t("notAvailable")
                                })}
                            </p>
                        )}
                        <div className="rounded-md border border-sky-300/15 bg-sky-400/10 p-2">
                            <p className="mb-2 text-xs font-semibold text-sky-100">
                                {t("tide.today")}
                            </p>
                            <TideEventRows events={todayEvents} t={t}/>
                        </div>

                        <div className="overflow-hidden rounded-md border border-white/10 bg-slate-950/30">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                                onClick={() => setFutureOpen((value) => !value)}>
                                <span>{t("tide.nextThreeDays")}{" "}{groups.length ? `(${groups.reduce((sum, group) => sum + group.events.length, 0)})` : ""}</span>
                                <ChevronsUpDown size={14} className={`shrink-0 text-cyan-300 transition ${futureOpen ? "rotate-180" : ""}`}/>
                            </button>
                            {futureOpen && (
                                <div className="max-h-36 divide-y divide-white/10 overflow-y-auto overscroll-contain border-t border-white/10">
                                    {groups.map((group) => (
                                        <div key={group.key} className="px-3 py-2">
                                            <p className="mb-1 text-[11px] font-semibold text-cyan-200">
                                                {group.label}
                                            </p>
                                            <TideEventRows events={group.events} t={t}/>
                                        </div>
                                    ))}
                                    {!groups.length && (
                                        <p className="px-3 py-2 text-xs text-slate-500">
                                            {t("notAvailable")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-[11px] leading-4 text-slate-500">
                        {t("tide.note")}
                    </p>
                </>
            ) : (
                <p className="text-xs text-slate-400">{t("tide.empty")}</p>
            )}
        </div>
    );
}

function TideEventRows({events, t}) {
    if (!events?.length) {
        return <p className="text-xs text-slate-500">{t("notAvailable")}</p>;
    }

    return (
        <div className="space-y-1">
            {events.map((event) => (
                <div key={`${event.kind}-${event.time.toISOString()}`} className="grid grid-cols-[44px_1fr_auto] gap-2 text-xs text-slate-300">
                    <span>{event.kind === "high" ? t("tide.high") : t("tide.low")}</span>
                    <span className="font-mono tabular-nums">{formatTideTime(event.time)}</span>
                    <span className="font-semibold text-slate-100">{formatMeters(event.height, t)}</span>
                </div>
            ))}
        </div>
    );
}

function CompactTideMetrics({items}) {
    return (
        <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-slate-950/25 p-2 text-[11px]">
            {items.map(([title, value]) => (
                <div key={title} className="flex min-w-0 items-center justify-between gap-1">
                    <span className="truncate text-slate-400">{title}</span>
                    <span className="min-w-0 truncate font-semibold text-slate-100">{value}</span>
                </div>
            ))}
        </div>
    );
}

export default function TideSection(props) {
    const {t} = props;
    return (
        <Section title={t("section.tide")} icon={Waves}>
            <TidePanel {...props} />
        </Section>
    );
}
