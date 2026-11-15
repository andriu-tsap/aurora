"use client";
import "./favorites.css";
import { useState } from "react";

import { useT } from "../i18n";
import { toggleFavorite, useFavorites } from "./store";

/** Heart toggle for one stay. Pop animation is skipped under reduced motion (CSS). */
export function FavoriteButton({
  slug,
  name,
  className = "",
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const t = useT();
  const { has } = useFavorites();
  const [pop, setPop] = useState(false);
  const on = has(slug);
  return (
    <button
      type="button"
      className={`fav-btn ${className}${pop ? " is-pop" : ""}`}
      aria-pressed={on}
      aria-label={`${t(on ? "favRemove" : "favAdd")}: ${name}`}
      data-testid={`fav-${slug}`}
      onClick={() => {
        setPop(!on);
        toggleFavorite(slug);
      }}
      onAnimationEnd={() => setPop(false)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M12 20.7s-7.6-4.5-9.4-9.4C1.3 7.8 3.6 4.6 6.9 4.6c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3 3.3 0 5.6 3.2 4.3 6.7-1.8 4.9-9.4 9.4-9.4 9.4z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
