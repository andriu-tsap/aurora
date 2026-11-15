import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/cyrillic-600.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@aurora/ui/tokens.css";
import "./style.css";
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
      <body>{children}</body>
    </html>
  );
}
