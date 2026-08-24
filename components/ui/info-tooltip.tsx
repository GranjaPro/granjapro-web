"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import ModalPortal from "@/components/ui/modal-portal";

interface InfoTooltipProps {
  label: string;
  description: string;
  formula?: string;
}

export function InfoTooltip({ label, description, formula }: InfoTooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openBeforeClickRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportPadding = 8;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 240;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 120;
    const maximumLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);
    const left = Math.min(Math.max(triggerRect.left, viewportPadding), maximumLeft);
    const preferredTop = triggerRect.bottom + gap;
    const top = preferredTop + tooltipHeight <= window.innerHeight - viewportPadding
      ? preferredTop
      : Math.max(viewportPadding, triggerRect.top - tooltipHeight - gap);

    setPosition({ top, left });
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <span className="inline-flex" onMouseEnter={openTooltip} onMouseLeave={() => setIsOpen(false)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Informações sobre ${label}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onFocus={openTooltip}
        onBlur={() => setIsOpen(false)}
        onPointerDown={() => {
          openBeforeClickRef.current = isOpen;
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            openTooltip();
            return;
          }
          setIsOpen(!openBeforeClickRef.current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <ModalPortal>
          <div
            id={tooltipId}
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[100] w-60 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg pointer-events-none"
            style={{ top: position.top, left: position.left }}
          >
            <p className="mb-1 text-[11px] font-semibold text-gray-800">{label}</p>
            <p className="text-[10px] font-normal leading-relaxed text-gray-500">{description}</p>
            {formula && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <p className="text-[10px] font-normal text-gray-400">Fórmula: {formula}</p>
              </div>
            )}
          </div>
        </ModalPortal>
      )}
    </span>
  );
}
