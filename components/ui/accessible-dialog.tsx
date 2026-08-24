"use client";

import { useEffect, useRef, type ReactNode } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import { cn } from "@/lib/utils";

interface AccessibleDialogProps {
  children: ReactNode;
  titleId: string;
  descriptionId?: string;
  onClose: () => void;
  preventClose?: boolean;
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function AccessibleDialog({
  children,
  titleId,
  descriptionId,
  onClose,
  preventClose = false,
  className,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);
  onCloseRef.current = onClose;
  preventCloseRef.current = preventClose;

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>("[data-autofocus], " + FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !preventCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Fechar diálogo"
          className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
          onClick={preventClose ? undefined : onClose}
          tabIndex={-1}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn("relative max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200", className)}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}
