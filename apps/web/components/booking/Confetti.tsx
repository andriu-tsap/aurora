"use client";
import { useEffect, useRef, useState } from "react";

const COLORS = ["#2ef2c7", "#8b5cff", "#ff7a59", "#ffffff"];
const PIECES = 36;

/**
 * Light confetti burst built on the Web Animations API: no library, no network.
 * Renders nothing when the visitor prefers reduced motion. Pieces are removed
 * as soon as the animations finish.
 */
export function Confetti() {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = box.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(false);
      return;
    }
    const animations: Animation[] = [];
    for (let i = 0; i < PIECES; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.background = COLORS[i % COLORS.length];
      el.appendChild(piece);
      const dx = (Math.random() - 0.5) * 360;
      const rise = 80 + Math.random() * 120;
      const fall = 260 + Math.random() * 160;
      const spin = (Math.random() - 0.5) * 900;
      animations.push(
        piece.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
            {
              transform: `translate(${dx * 0.6}px, ${-rise}px) rotate(${spin / 2}deg)`,
              opacity: 1,
              offset: 0.35,
            },
            {
              transform: `translate(${dx}px, ${fall}px) rotate(${spin}deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 1500 + Math.random() * 700,
            easing: "cubic-bezier(0.22, 0.6, 0.4, 1)",
            fill: "forwards",
          },
        ),
      );
    }
    let cancelled = false;
    void Promise.all(animations.map((a) => a.finished.catch(() => null))).then(
      () => {
        if (!cancelled) setActive(false);
      },
    );
    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
      el.replaceChildren();
    };
  }, []);

  if (!active) return null;
  return (
    <div
      ref={box}
      className="confetti"
      aria-hidden="true"
      data-testid="confetti"
    />
  );
}
