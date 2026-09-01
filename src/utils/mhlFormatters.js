
export function groupHoursByDay(hours, t) {
    return hours.reduce((groups, hour) => {
        const key = formatDateKey(hour.time);
        const previous = groups.at(-1);

        if (previous?.key === key) {
            previous.count += 1;
            return groups;
        }

        groups.push({
            key,
            label: formatDayLabel(hour.time, t),
            count: 1
        });
        return groups;
    }, []);
}

export function formatNumber(value, digits) {
    return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

export function formatHour(date) {
    return new Intl.DateTimeFormat("en-AU", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Australia/Sydney"
    }).format(date);
}

export function formatDayLabel(date, t) {
    const dayOffset = daysFromToday(date);
    if (dayOffset === 0) return t("mhl.today");
    if (dayOffset === 1) return t("mhl.tomorrow");

    const locale = resolveLocale(t);
    if (locale === "zh-CN") {
        return new Intl.DateTimeFormat(locale, {
            month: "numeric",
            day: "numeric",
            weekday: "short",
            timeZone: "Australia/Sydney"
        }).format(date);
    }

    const weekday = new Intl.DateTimeFormat("en-AU", {
        weekday: "short",
        timeZone: "Australia/Sydney"
    }).format(date);
    const month = new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "Australia/Sydney"
    }).format(date);
    const day = new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        timeZone: "Australia/Sydney"
    }).format(date);

    return `${weekday}, ${month} ${day}`.toUpperCase();
}

export function daysFromToday(date) {
    const today = startOfSydneyDay(new Date());
    const target = startOfSydneyDay(date);
    return Math.round((target - today) / 86400000);
}

export function startOfSydneyDay(date) {
    return new Date(`${formatDateKey(date)}T00:00:00+10:00`);
}

export function formatDateKey(date) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Australia/Sydney"
    }).format(date);
}

export function resolveLocale(t) {
    return t("language.chinese") === "中文" && t("mhl.today") === "今天"
        ? "zh-CN"
        : "en-AU";
}

export function formatObservedAt(date, t) {
    if (!(date instanceof Date)) return t("notAvailable");
    return new Intl.DateTimeFormat("en-AU", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Australia/Sydney"
    }).format(date);
}