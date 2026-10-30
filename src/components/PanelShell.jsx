import { Moon, Sun, X } from "lucide-react";
import { IconButton } from "./ui.jsx";

export default function PanelShell({ panel, open, darkMode, onToggleTheme, onClose, children }) {
  const PanelIcon = panel.icon;

  return (
    <aside className={`absolute z-[720] overflow-hidden rounded-3xl border border-aqua-soft/70 bg-bg/95 shadow-marine-lg backdrop-blur-xl transition-all duration-200 ease-out dark:border-white/10 dark:bg-dark-bg/95 md:bottom-4 md:left-[calc(var(--nav-rail-left)+var(--nav-rail-width)+var(--nav-panel-gap))] md:top-5 md:w-[350px] ${open
      ? "bottom-20 left-3 right-3 max-h-[calc(100dvh-7rem)] translate-y-0 opacity-100 md:max-h-none md:translate-x-0"
      : "pointer-events-none bottom-20 left-3 right-3 max-h-[calc(100dvh-7rem)] translate-y-4 opacity-0 md:max-h-none md:-translate-x-[390px] md:translate-y-0"}`}>
      <header className="flex items-center justify-between gap-3 border-b border-aqua-soft/70 bg-surface/90 px-4 py-3.5 dark:border-white/10 dark:bg-dark-surface/90">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-soft/40 text-primary">
            <PanelIcon size={18}/>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-5 text-ink-strong dark:text-dark-ink">{panel.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-steel">{panel.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton onClick={onToggleTheme} aria-label={darkMode ? "Use light theme" : "Use dark theme"} title={darkMode ? "Use light theme" : "Use dark theme"}>
            {darkMode ? <Sun size={16}/> : <Moon size={16}/>} 
          </IconButton>
          {open && (
            <IconButton aria-label="Close panel" onClick={onClose}>
              <X size={17}/>
            </IconButton>
          )}
        </div>
      </header>
      <div className="max-h-[calc(100dvh-12rem)] space-y-3 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin] md:max-h-[calc(100dvh-7rem)]">
        {children}
      </div>
    </aside>
  );
}

