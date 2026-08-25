const LANGUAGE_KEY = "seamap.web.language";

const dictionaries = {
  en: {
    "language.section": "Language",
    "language.current": "App Language",
    "language.system": "System",
    "language.english": "English",
    "language.chinese": "中文",
    "layer.title": "Layer Controls",
    "layer.subtitle": "Base maps and NSW LiDAR coverage",
    "panel.collapse": "Collapse control panel",
    "panel.expand": "Expand control panel",
    "section.baseMaps": "Base Maps",
    "section.region": "State / Territory",
    "section.bathymetry": "SEED Bathymetry Layers",
    "section.mpa": "Marine Protected Areas",
    "section.tide": "Tide / Marine",
    "section.lidar": "NSW LiDAR Coverage",
    "base.streets": "Streets / Terrain",
    "base.satellite": "High-Resolution Satellite",
    "region.current": "Current Region",
    "bathymetry.show": "Show bathymetry data",
    "bathymetry.nswSource": "NSW SEED Marine LiDAR Bathymetry 2018",
    "bathymetry.ausSource": "AusSeabed AusBathyTopo Australia 250m 2026",
    "bathymetry.dem": "Bathymetry DEM - metres",
    "bathymetry.isobaths": "Isobaths at 5m depth intervals (NSW only)",
    "bathymetry.ahoDepths": "AHO Chart Explorer depths only",
    "bathymetry.ahoNote": "Uses AHO ENC Online Data. Not for navigation.",
    "bathymetry.nonNswNote": "This region uses the AusSeabed national bathymetry raster. The 5m isobath layer is available only from the NSW SEED service. AHO depths are available as chart tiles.",
    "opacity": "Opacity",
    "mpa.show": "Show marine protected areas",
    "mpa.source": "CAPAD 2024 Marine Protected Areas",
    "mpa.title": "Marine Protected Area",
    "mpa.type": "Type",
    "mpa.zone": "Zone",
    "mpa.authority": "Authority",
    "mpa.fishing": "Fishing restrictions",
    "mpa.officialRules": "View official rules",
    "mpa.queryError": "Unable to query this marine protected area.",
    "lidar.show": "Show coverage polygons",
    "lidar.source": "Marine_NSWCoastalLidarCoverage_20190827",
    "lidar.note": "Loads 48 converted NSW Coastal LiDAR coverage polygons.",
    "lidar.links": "Source Data Links",
    "lidar.error": "Unable to load the LiDAR data catalog.",
    "unknownDate": "Unknown date",
    "tide.currentTitle": "Current Location Tide",
    "tide.selectedTitle": "Selected Location Tide",
    "tide.loading": "Loading tide and marine conditions...",
    "tide.loadingLocation": "Loading tide and marine conditions for this location...",
    "tide.error": "Unable to load tide and marine conditions.",
    "tide.errorLocation": "Unable to load tide and marine conditions for this location.",
    "tide.empty": "Click refresh to load tide, wave and wind data.",
    "tide.note": "Tide values are modelled and may be inaccurate nearshore or inside harbours. Do not use for navigation or safety decisions. Right-click or long-press the map to query a selected location.",
    "tide.popupNote": "Tide values are modelled and may be inaccurate nearshore or inside harbours. Do not use for navigation or safety decisions.",
    "tide.nextThreeDays": "Next Three Days",
    "tide.today": "Today's Tide",
    "tide.seaLevel": "Sea level",
    "tide.waveHeight": "Wave height",
    "tide.wavePeriod": "Wave period",
    "tide.windSpeed": "Wind speed",
    "tide.windDirection": "Wind direction",
    "tide.refresh": "Refresh tide",
    "tide.high": "High",
    "tide.low": "Low",
    "map.center": "Map center",
    "map.selectedLocation": "Selected location",
    "telemetry.lat": "Lat",
    "telemetry.lng": "Lng",
    "telemetry.zoom": "Zoom",
    "telemetry.lidar": "LiDAR",
    "telemetry.polygons": "polygons",
    "notAvailable": "N/A",
    "compass.n": "N",
    "compass.ne": "NE",
    "compass.e": "E",
    "compass.se": "SE",
    "compass.s": "S",
    "compass.sw": "SW",
    "compass.w": "W",
    "compass.nw": "NW",
    "fishing.sanctuary": "Strong restrictions: this is usually a sanctuary/no-take area where fishing and collecting are generally not allowed. Check the local management rules.",
    "fishing.habitat": "Fishing is restricted: some fishing may be allowed, but gear, collecting or anchoring can be limited. Check the protected area management rules.",
    "fishing.special": "Special purpose zone: fishing rules depend on the purpose and management plan, and some activities may be restricted.",
    "fishing.aquatic": "Aquatic reserve: collecting, taking fish or invertebrates, or specific fishing methods are often restricted. Check the local rules.",
    "fishing.general": "General use area: fishing may be allowed, but state/federal fishing rules and the protected area management plan still apply.",
    "fishing.unknown": "This layer does not provide the full legal text for fishing rules. Check the protected area management plan or local fisheries rules.",
    "fishing.aquaticMissing": "Official activity details were not found for this aquatic reserve. Check the NSW aquatic reserve rules.",
    "fishing.marineParkLink": "Marine park rules vary by zone. Open the official NSW page for detailed restrictions."
  },
  zh: {
    "language.section": "语言",
    "language.current": "网页语言",
    "language.system": "跟随系统",
    "language.english": "English",
    "language.chinese": "中文",
    "layer.title": "图层控制",
    "layer.subtitle": "底图和 NSW LiDAR 覆盖",
    "panel.collapse": "收起控制栏",
    "panel.expand": "展开控制栏",
    "section.baseMaps": "底图切换",
    "section.region": "州 / 领地",
    "section.bathymetry": "真实水深图层",
    "section.mpa": "海洋保护区",
    "section.tide": "潮汐 / 海况",
    "section.lidar": "NSW LiDAR 覆盖",
    "base.streets": "街道 / 地形",
    "base.satellite": "高清卫星图",
    "region.current": "当前区域",
    "bathymetry.show": "显示水深数据",
    "bathymetry.nswSource": "NSW SEED Marine LiDAR Bathymetry 2018",
    "bathymetry.ausSource": "AusSeabed AusBathyTopo Australia 250m 2026",
    "bathymetry.dem": "Bathymetry DEM - metres",
    "bathymetry.isobaths": "Isobaths at 5m depth intervals（仅 NSW）",
    "bathymetry.ahoDepths": "AHO Chart Explorer 仅水深数据",
    "bathymetry.ahoNote": "使用 AHO ENC Online Data。不可用于航海导航。",
    "bathymetry.nonNswNote": "当前州使用 AusSeabed 全国真实水深栅格；5m 等深线和坡度图层仅 NSW SEED 服务提供。",
    "opacity": "透明度",
    "mpa.show": "显示海洋保护区",
    "mpa.source": "CAPAD 2024 Marine Protected Areas",
    "mpa.title": "Marine Protected Area",
    "mpa.type": "类型",
    "mpa.zone": "分区",
    "mpa.authority": "管理机构",
    "mpa.fishing": "钓鱼限制",
    "mpa.officialRules": "查看官方限制",
    "mpa.queryError": "无法查询这个海洋保护区。",
    "lidar.show": "显示覆盖范围",
    "lidar.source": "Marine_NSWCoastalLidarCoverage_20190827",
    "lidar.note": "加载 48 个转换后的 NSW Coastal LiDAR 覆盖面。",
    "lidar.links": "真实数据入口",
    "lidar.error": "无法加载 LiDAR 数据目录。",
    "unknownDate": "未知日期",
    "tide.currentTitle": "当前位置潮汐",
    "tide.selectedTitle": "选择位置潮汐",
    "tide.loading": "正在加载潮汐和海况...",
    "tide.loadingLocation": "正在加载这个位置的潮汐和海况...",
    "tide.error": "无法加载潮汐和海况数据。",
    "tide.errorLocation": "无法加载这个位置的潮汐和海况数据。",
    "tide.empty": "点击刷新获取潮汐、浪和风。",
    "tide.note": "潮位为模型值，近岸和港湾内可能存在误差，不可用于航海或安全决策。右键或长按地图可查询选中位置。",
    "tide.popupNote": "潮位为模型值，近岸和港湾内可能存在误差，不可用于航海或安全决策。",
    "tide.nextThreeDays": "未来三天潮汐",
    "tide.today": "今日潮汐",
    "tide.seaLevel": "当前潮位",
    "tide.waveHeight": "浪高",
    "tide.wavePeriod": "浪周期",
    "tide.windSpeed": "风速",
    "tide.windDirection": "风向",
    "tide.refresh": "刷新潮汐",
    "tide.high": "高潮",
    "tide.low": "低潮",
    "map.center": "地图中心",
    "map.selectedLocation": "选择位置",
    "telemetry.lat": "纬度",
    "telemetry.lng": "经度",
    "telemetry.zoom": "缩放",
    "telemetry.lidar": "LiDAR",
    "telemetry.polygons": "覆盖面",
    "notAvailable": "N/A",
    "compass.n": "北",
    "compass.ne": "东北",
    "compass.e": "东",
    "compass.se": "东南",
    "compass.s": "南",
    "compass.sw": "西南",
    "compass.w": "西",
    "compass.nw": "西北",
    "fishing.sanctuary": "限制很强：通常为 sanctuary/no-take 区，钓鱼和采集一般不允许。请以当地管理规定为准。",
    "fishing.habitat": "有钓鱼限制：通常允许部分钓鱼活动，但会限制钓具、采集或锚泊等活动。",
    "fishing.special": "特殊用途区：钓鱼规则取决于该用途和管理计划，可能限制部分活动。",
    "fishing.aquatic": "水生保护区：通常限制采集、鱼类/无脊椎动物捕捞或特定钓鱼方式。",
    "fishing.general": "一般使用区：钓鱼通常可能允许，但仍受渔业规则和保护区管理计划限制。",
    "fishing.unknown": "该图层未提供完整钓鱼法规文本；请查看保护区管理计划或当地渔业规定。",
    "fishing.aquaticMissing": "没有在 JSON 中找到这个 aquatic reserve 的官方活动说明，请查看 NSW aquatic reserve 规则。",
    "fishing.marineParkLink": "Marine Park 的限制会根据 zone 不同而变化，请打开 NSW 官方页面查看详细限制。"
  }
};

export const languageOptions = [
  { id: "en", labelKey: "language.english" },
  { id: "zh", labelKey: "language.chinese" },
  { id: "system", labelKey: "language.system" }
];

export function getInitialLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) || "en";
}

export function persistLanguage(language) {
  localStorage.setItem(LANGUAGE_KEY, language);
}

export function resolveLanguage(language) {
  if (language === "system") {
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  return language === "zh" ? "zh" : "en";
}

export function createTranslator(language) {
  const resolved = resolveLanguage(language);
  return (key, values = {}) => {
    const template = dictionaries[resolved]?.[key] ?? dictionaries.en[key] ?? key;
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
