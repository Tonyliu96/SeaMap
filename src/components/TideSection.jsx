import React, {useState} from "react";
import {ChevronsUpDown, RefreshCw, Waves} from "lucide-react";
import {formatMeters, formatSeconds, formatTideTime, formatWindDirection, formatWindSpeed, getTodayTideEvents, groupThreeDayTideEvents} from "../services/tides.js";

function Section({title, icon: Icon, children}) {
    return (
        <section className="border border-[#30343a] bg-[#101316] shadow-[3px_3px_0_#08090a]">
            <h3 className="flex items-center gap-2 border-b border-[#30343a] bg-[#171a1e] px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#aeb5be]">
                {Icon && <Icon size={13} className="text-[#6ee7f5]"/>}
                <span className="text-[#ffe100]">//</span> {title}
            </h3>
            <div className="p-2.5 [&_.rounded-full]:rounded-none [&_.rounded-md]:rounded-none">{children}</div>
        </section>
    );
}

function TidePanel({tideInfo, tideStatus, tideError, tideCoordinate, onRefreshTide, t}) {
    const [futureOpen, setFutureOpen] = useState(false);
    const todayEvents = getTodayTideEvents(tideInfo);
    const groups = groupThreeDayTideEvents(tideInfo);

    return (
        <div className="space-y-3 border border-[#30343a] bg-[#0d1012] p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#f7f3e8]">
                        {t("tide.currentTitle")}
                    </p>
                    <p className="truncate font-mono text-[9px] uppercase text-[#747d87]">
                        {t(tideCoordinate?.sourceKey ?? "map.center")}{" "}
                        {Number.isFinite(tideCoordinate?.lat)
                            ? `${tideCoordinate.lat.toFixed(4)}, ${tideCoordinate.lng.toFixed(4)}` : ""}
                    </p>
                </div>
                <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center border border-[#343a42] bg-[#171a1e] text-[#6ee7f5] transition hover:border-[#ffe100] hover:text-[#ffe100] disabled:cursor-wait disabled:opacity-50"
                    disabled={tideStatus === "loading"}
                    onClick={() => onRefreshTide?.()}
                    title={t("tide.refresh")}>
                    <RefreshCw size={15} className={tideStatus === "loading" ? "animate-spin" : ""}/>
                </button>
            </div>

            {tideError && (
                <p className="border border-[#6f6320] bg-[#25230f] px-3 py-2 font-mono text-[10px] text-[#ffe67a]">
                    {tideError}
                </p>
            )}

            {tideStatus === "loading" && !tideInfo ? (
                <p className="font-mono text-[10px] uppercase text-[#8c959f]">{t("tide.loading")}</p>
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
                            <p className="border border-[#285a61] bg-[#10272b] px-2 py-1 font-mono text-[9px] leading-4 text-[#9aedf5]">
                                {t("tide.nearshorePoint", {
                                    name: tideInfo.wavePoint.name ?? tideInfo.wavePoint.sitecode,
                                    id: tideInfo.wavePoint.sitecode ?? tideInfo.wavePoint.id,
                                    distance: tideInfo.wavePointDistanceKm?.toFixed(1) ?? t("notAvailable")
                                })}
                            </p>
                        )}
                        <div className="border border-[#343a42] bg-[#15191d] p-2">
                            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#6ee7f5]">
                                {t("tide.today")}
                            </p>
                            <TideEventRows events={todayEvents} t={t}/>
                        </div>

                        <div className="overflow-hidden border border-[#343a42] bg-[#0d1012]">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 bg-[#15191d] px-3 py-2 text-left font-mono text-[10px] font-bold uppercase text-[#d7dbe0] transition hover:bg-[#1b2025] hover:text-[#ffe100]"
                                onClick={() => setFutureOpen((value) => !value)}>
                                <span>{t("tide.nextThreeDays")}{" "}{groups.length ? `(${groups.reduce((sum, group) => sum + group.events.length, 0)})` : ""}</span>
                                <ChevronsUpDown size={14} className={`shrink-0 text-[#6ee7f5] transition ${futureOpen ? "rotate-180" : ""}`}/>
                            </button>
                            {futureOpen && (
                                <div className="max-h-36 divide-y divide-[#30343a] overflow-y-auto overscroll-contain border-t border-[#30343a]">
                                    {groups.map((group) => (
                                        <div key={group.key} className="px-3 py-2">
                                            <p className="mb-1 font-mono text-[9px] font-bold uppercase text-[#6ee7f5]">
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

                    <p className="font-mono text-[9px] leading-4 text-[#626a74]">
                        {t("tide.note")}
                    </p>
                </>
            ) : (
                <p className="font-mono text-[10px] uppercase text-[#8c959f]">{t("tide.empty")}</p>
            )}
        </div>
    );
}

function TideEventRows({events, t}) {
    if (!events?.length) {
        return <p className="font-mono text-[10px] uppercase text-[#626a74]">{t("notAvailable")}</p>;
    }

    return (
        <div className="space-y-1">
            {events.map((event) => (
                <div key={`${event.kind}-${event.time.toISOString()}`} className="grid grid-cols-[44px_1fr_auto] gap-2 font-mono text-[10px] text-[#aeb5be]">
                    <span className={event.kind === "high" ? "text-[#3564f4]" : "text-[#58d68d]"}>{event.kind === "high" ? t("tide.high") : t("tide.low")}</span>
                    <span className="font-mono tabular-nums">{formatTideTime(event.time)}</span>
                    <span className="font-bold text-[#f7f3e8]">{formatMeters(event.height, t)}</span>
                </div>
            ))}
        </div>
    );
}

function CompactTideMetrics({items}) {
    return (
        <div className="grid grid-cols-2 border border-[#343a42] bg-[#0b0d0f] font-mono text-[9px]">
            {items.map(([title, value]) => (
                <div key={title} className="flex min-w-0 items-center justify-between gap-1 border-b border-r border-[#292e34] px-2 py-1.5 last:border-b-0">
                    <span className="truncate uppercase text-[#747d87]">{title}</span>
                    <span className="min-w-0 truncate font-bold text-[#f7f3e8]">{value}</span>
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
