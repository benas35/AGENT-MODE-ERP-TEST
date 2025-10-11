import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

let stylesInjected = false;

const ensureStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const styleElement = document.createElement("style");
  styleElement.setAttribute("data-success-check", "");
  styleElement.textContent = `
.success-check__pulse {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid var(--success-border, rgba(16, 185, 129, 0.6));
  opacity: 0;
  animation: success-check-pulse 1.1s ease-out forwards;
}
.success-check__icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--success-foreground, rgb(5, 122, 85));
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: success-check-draw 0.6s ease-out forwards;
}
@keyframes success-check-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  30% {
    opacity: 0.8;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
@keyframes success-check-draw {
  0% {
    stroke-dashoffset: 20;
  }
  60% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 0;
  }
}`;
  document.head.appendChild(styleElement);
  stylesInjected = true;
};

export interface SuccessCheckProps {
  message?: string;
  show?: boolean;
  duration?: number;
  onDone?: () => void;
  className?: string;
}

export const SuccessCheck = ({
  message = "Saved",
  show = true,
  duration = 1600,
  onDone,
  className,
}: SuccessCheckProps) => {
  const [visible, setVisible] = useState(show);
  const timeoutRef = useRef<number | null>(null);
  const latestOnDone = useRef(onDone);

  useEffect(() => {
    latestOnDone.current = onDone;
  }, [onDone]);

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }

    setVisible(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      latestOnDone.current?.();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm",
        className,
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="success-check__pulse" aria-hidden="true" />
        <svg
          className="success-check__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span>{message}</span>
    </div>
  );
};
