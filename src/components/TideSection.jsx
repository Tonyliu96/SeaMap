import React, {useState} from "react";
import {ChevronsUpDown, Compass, RefreshCw, Timer, Waves, Wind} from "lucide-react";
import {formatMeters, formatSeconds, formatTideTime, formatWindDirection, formatWindSpeed, getTodayTideEvents, groupThreeDayTideEvents} from "../services/tides.js";
import { Card, IconButton, StatTile } from "./ui.jsx";

function Section({title, icon: Icon, children}) {
    return (
        <Card as="section" className="overflow-hidden shadow-sm">
            <h3 className="flex items-center gap-2 border-b border-aqua-soft/60 bg-aqua-soft/20 px-3 py-2.5 text-[12px] font-semibold text-ink-strong dark:text-dark-ink">
                {Icon && <Icon size={15} className="text-primary"/>} {title}
            </h3>
            <div className="p-2.5">{children}</div>
        </Card>
    );
}

function TidePanel({tideInfo, tideStatus, tideError, tideCoordinate, onRefreshTide, t}) {
    const [futureOpen, setFutureOpen] = useState(false);
    const todayEvents = getTodayTideEvents(tideInfo);
    const groups = groupThreeDayTideEvents(tideInfo);

    return (
        <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink-strong dark:text-dark-ink">
                        {t("tide.currentTitle")}
                    </p>
                    <p className="truncate text-[10px] text-steel">
                        {t(tideCoordinate?.sourceKey ?? "map.center")}{" "}
                        {Number.isFinite(tideCoordinate?.lat)
                            ? `${tideCoordinate.lat.toFixed(4)}, ${tideCoordinate.lng.toFixed(4)}` : ""}
                    </p>
                </div>
                <IconButton
                    disabled={tideStatus === "loading"}
                    onClick={() => onRefreshTide?.()}
                    title={t("tide.refresh")}>
                    <RefreshCw size={15} className={tideStatus === "loading" ? "animate-spin" : ""}/>
                </IconButton>
            </div>

            {tideError && (
                <p className="rounded-lg border border-amber/50 bg-amber/20 px-3 py-2 text-xs text-[#695126]">
                    {tideError}
                </p>
            )}

            {tideStatus === "loading" && !tideInfo ? (
                <p className="text-xs text-steel">{t("tide.loading")}</p>
            ) : tideInfo ? (
                <>
                    <div className="space-y-2.5">
                        <div className="flex items-end justify-between gap-3 rounded-xl bg-aqua-soft/30 px-3 py-2.5">
                            <div>
                                <p className="text-xs font-medium text-steel">{t("tide.seaLevel")}</p>
                                <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{formatMeters(tideInfo.currentSeaLevel, t)}</p>
                            </div>
                            <Waves size={24} className="mb-1 text-primary"/>
                        </div>
                        <CompactTideMetrics
                            items={[
                                [Waves, t("tide.waveHeight"), formatMeters(tideInfo.waveHeight, t)],
                                [Timer, t("tide.wavePeriod"), formatSeconds(tideInfo.wavePeriod, t)],
                                [Wind, t("tide.windSpeed"), formatWindSpeed(tideInfo.windSpeed, t)],
                                [Compass, t("tide.windDirection"), formatWindDirection(tideInfo.windDirection, t)]]}/>
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-steel">{t("tide.waveSource")}</span>
                            <span className="truncate text-right font-semibold text-ink">{tideInfo.waveSource ?? t("notAvailable")}</span>
                        </div>
                        {tideInfo.wavePoint && (
                            <p className="rounded-lg bg-aqua-soft/25 px-2 py-1 text-[10px] leading-4 text-ink">
                                {t("tide.nearshorePoint", {
                                    name: tideInfo.wavePoint.name ?? tideInfo.wavePoint.sitecode,
                                    id: tideInfo.wavePoint.sitecode ?? tideInfo.wavePoint.id,
                                    distance: tideInfo.wavePointDistanceKm?.toFixed(1) ?? t("notAvailable")
                                })}
                            </p>
                        )}
                        <div className="rounded-xl border border-aqua-soft/70 bg-bg px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                            <p className="mb-2 border-b border-aqua-soft/60 pb-1.5 text-xs font-semibold text-primary">
                                {t("tide.today")}
                            </p>
                            <TideEventRows events={todayEvents} t={t}/>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-aqua-soft/70 bg-surface dark:border-white/10 dark:bg-dark-surface">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-ink-strong transition duration-200 hover:bg-aqua-soft/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-dark-ink"
                                onClick={() => setFutureOpen((value) => !value)}>
                                <span>{t("tide.nextThreeDays")}{" "}{groups.length ? `(${groups.reduce((sum, group) => sum + group.events.length, 0)})` : ""}</span>
                                <ChevronsUpDown size={14} className={`shrink-0 text-primary transition ${futureOpen ? "rotate-180" : ""}`}/>
                            </button>
                            {futureOpen && (
                                <div className="max-h-36 divide-y divide-aqua-soft/60 overflow-y-auto overscroll-contain border-t border-aqua-soft/60">
                                    {groups.map((group) => (
                                        <div key={group.key} className="px-3 py-2">
                                            <p className="mb-1 text-[10px] font-semibold text-primary">
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

                    <p className="text-[10px] leading-4 text-steel">
                        {t("tide.note")}
                    </p>
                </>
            ) : (
                <p className="text-xs text-steel">{t("tide.empty")}</p>
            )}
        </div>
    );
}

function TideEventRows({events, t}) {
    if (!events?.length) {
        return <p className="text-[10px] text-steel">{t("notAvailable")}</p>;
    }

    return (
        <div className="space-y-1">
            {events.map((event) => (
                <div key={`${event.kind}-${event.time.toISOString()}`} className="grid grid-cols-[44px_1fr_auto] gap-2 text-[10px] tabular-nums text-steel">
                    <span className={event.kind === "high" ? "text-primary" : "text-ink"}>{event.kind === "high" ? t("tide.high") : t("tide.low")}</span>
                    <span>{formatTideTime(event.time)}</span>
                    <span className="font-bold text-ink-strong dark:text-dark-ink">{formatMeters(event.height, t)}</span>
                </div>
            ))}
        </div>
    );
}

function CompactTideMetrics({items}) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {items.map(([Icon, title, value]) => (
                <StatTile key={title} icon={Icon} label={title} value={value}/>
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
