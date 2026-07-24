"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  text: string;
}

const TOOLTIP_WIDTH = 256; // matches w-64
const VIEWPORT_MARGIN = 8;

/** Rendered through a portal with fixed positioning — tooltips inside
 *  overflow-x-auto table wrappers get clipped otherwise. Horizontal position is
 *  clamped to the viewport so tooltips on edge columns (e.g. the last column of
 *  a wide table) never render half off-screen; the arrow stays aimed at the
 *  button even when the box itself has to shift to stay on-screen. */
export function InfoTooltip({ text }: InfoTooltipProps) {
  const [pos, setPos] = useState<{ top: number; boxLeft: number; arrowLeft: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timeout.current) clearTimeout(timeout.current);
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const buttonCenter = rect.left + rect.width / 2;
    const halfWidth = TOOLTIP_WIDTH / 2;
    const minCenter = halfWidth + VIEWPORT_MARGIN;
    const maxCenter = window.innerWidth - halfWidth - VIEWPORT_MARGIN;
    const boxLeft = Math.min(Math.max(buttonCenter, minCenter), maxCenter);
    // Where the arrow sits within the box so it still points at the button
    // even after the box itself gets shifted to stay on-screen.
    const arrowLeft = Math.min(Math.max(buttonCenter - (boxLeft - halfWidth), 12), TOOLTIP_WIDTH - 12);
    setPos({ top: rect.top - 8, boxLeft, arrowLeft });
  }

  function hide() {
    timeout.current = setTimeout(() => setPos(null), 150);
  }

  useEffect(() => {
    if (!pos) return;
    // Any scroll while open would leave the tooltip floating at a stale position.
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          show();
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="ml-1.5 inline-flex h-[16px] w-[16px] items-center justify-center rounded-full border border-slate-200 bg-surface-card text-[10px] font-bold leading-none text-slate-400 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
        aria-label="More info"
      >
        i
      </button>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{ position: "fixed", top: pos.top, left: pos.boxLeft, width: TOOLTIP_WIDTH, transform: "translate(-50%, -100%)" }}
            className="z-[100] rounded-xl border border-slate-200/80 bg-surface-card px-4 py-3 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-slate-600 shadow-xl shadow-slate-300/40"
          >
            {text}
            <div
              style={{ position: "absolute", left: pos.arrowLeft, top: "100%", transform: "translateX(-50%)" }}
              className="border-[6px] border-transparent border-t-white"
            />
          </div>,
          document.body
        )}
    </>
  );
}
