import type { Stay } from "@aurora/types";

import { photo, type PhotoView } from "./format";

/** Responsive AVIF/WebP render of a stay. */
export function Photo({
  stay,
  view,
  alt,
  sizes,
  eager = false,
  className,
}: {
  stay: Stay;
  view: PhotoView;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  const p = photo(stay, view);
  return (
    <picture>
      <source type="image/avif" srcSet={p.avif} sizes={sizes} />
      <img
        className={className}
        src={p.src}
        srcSet={p.webp}
        sizes={sizes}
        width="1200"
        height="750"
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : undefined}
      />
    </picture>
  );
}
