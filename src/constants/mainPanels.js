import { Database, Layers, Map, ShieldCheck, ShipWheel } from "lucide-react";

const panelDefinitions = [
  { id: "map", icon: Map, titleKey: "panel.map.title", subtitleKey: "panel.map.subtitle" },
  { id: "layers", icon: Layers, titleKey: "panel.layers.title", subtitleKey: "panel.layers.subtitle" },
  { id: "protected", icon: ShieldCheck, titleKey: "panel.safety.title", subtitleKey: "panel.safety.subtitle" },
  { id: "forecast", icon: ShipWheel, titleKey: "panel.forecast.title", subtitleKey: "panel.forecast.subtitle" },
  { id: "data", icon: Database, titleKey: "panel.data.title", subtitleKey: "panel.data.subtitle" }
];

function validatePanels(panels) {
  const ids = new Set();

  panels.forEach((panel) => {
    if (!panel.id || !panel.icon || !panel.titleKey || !panel.subtitleKey) {
      throw new Error(`Invalid main panel configuration: ${JSON.stringify(panel)}`);
    }
    if (ids.has(panel.id)) {
      throw new Error(`Duplicate main panel id: ${panel.id}`);
    }
    ids.add(panel.id);
  });
}

if (import.meta.env.DEV) validatePanels(panelDefinitions);

export function getMainPanels(t) {
  const panels = panelDefinitions.map((panel) => ({
    ...panel,
    title: t(panel.titleKey),
    subtitle: t(panel.subtitleKey)
  }));

  if (import.meta.env.DEV) {
    panels.forEach((panel) => {
      if (!panel.title || panel.title === panel.titleKey || !panel.subtitle || panel.subtitle === panel.subtitleKey) {
        throw new Error(`Missing title or subtitle translation for main panel: ${panel.id}`);
      }
    });
  }

  return panels;
}

