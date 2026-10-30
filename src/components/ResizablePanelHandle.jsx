import { useCallback, useEffect, useState } from "react";

const DEFAULT_MIN_HEIGHT = 240;

function clampHeight(value, minHeight) {
  const maxHeight = Math.max(minHeight, Math.round(window.innerHeight * 0.82));
  return Math.min(maxHeight, Math.max(minHeight, Math.round(value)));
}

export function useResizablePanel(storageKey, initialHeight = 340, minHeight = DEFAULT_MIN_HEIGHT) {
  const [height, setHeight] = useState(() => {
    const stored = Number(localStorage.getItem(storageKey));
    return Number.isFinite(stored) && stored >= minHeight ? stored : initialHeight;
  });

  useEffect(() => {
    const onResize = () => setHeight((value) => clampHeight(value, minHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minHeight]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(height));
  }, [height, storageKey]);

  const resizeBy = useCallback(
    (delta) => setHeight((value) => clampHeight(value + delta, minHeight)),
    [minHeight]
  );

  const onPointerDown = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    const onPointerMove = (moveEvent) => {
      setHeight(clampHeight(startHeight + startY - moveEvent.clientY, minHeight));
    };
    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [height, minHeight]);

  return { height, resizeBy, onPointerDown };
}

export default function ResizablePanelHandle({ onPointerDown, resizeBy, label = "Resize panel" }) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="horizontal"
      tabIndex={0}
      className="group absolute inset-x-0 top-0 z-20 flex h-5 touch-none cursor-ns-resize items-center justify-center rounded-t-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          resizeBy(24);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          resizeBy(-24);
        }
      }}>
      <span className="h-1 w-12 rounded-full bg-steel/35 transition duration-200 group-hover:bg-primary group-focus-visible:bg-primary" />
    </div>
  );
}
