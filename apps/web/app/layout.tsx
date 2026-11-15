import type { Metadata } from "next";
import "@aurora/ui/tokens.css";
import "./style.css";

import { fontFaces } from "./fonts.generated";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Self-hosted Fontsource files with unicode-range: browsers fetch only the
// subsets a page renders. The Latin files are preloaded so text does not wait
// for CSS and scripts to be processed before the fonts are discovered.
const fontCss = fontFaces
  .map(
    (f) =>
      `@font-face{font-family:"${f.family}";font-style:normal;font-display:swap;font-weight:${f.weight};src:url(${base}/fonts/${f.file}) format("woff2");unicode-range:${f.range}}`,
  )
  .join("");
export const metadata: Metadata = {
  metadataBase: new URL("https://andriu-tsap.github.io/aurora/"),
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon.svg` },
  title: "AURORA — Find your somewhere",
  description:
    "Quiet cabins. Wild horizons. Discover a fictional travel concept for the Carpathians, Tatras and Adriatic. Concept / demo project — fictional data.",
  alternates: { canonical: "https://andriu-tsap.github.io/aurora/" },
  openGraph: {
    title: "AURORA — Find your somewhere",
    description:
      "A little further from ordinary. A travel concept by Andrii Tsap. Fictional demo data.",
    url: "https://andriu-tsap.github.io/aurora/",
    type: "website",
    images: [
      {
        url: "https://andriu-tsap.github.io/aurora/globe-poster.svg",
        width: 640,
        height: 640,
      },
    ],
  },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {fontFaces
          .filter((f) => f.preload)
          .map((f) => (
            <link
              key={f.file}
              rel="preload"
              href={`${base}/fonts/${f.file}`}
              as="font"
              type="font/woff2"
              crossOrigin=""
            />
          ))}
        <style dangerouslySetInnerHTML={{ __html: fontCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
