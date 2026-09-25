import type { MetadataRoute } from "next"

/**
 * Für "Zum Home-Bildschirm hinzufügen" (siehe Metadata.appleWebApp in
 * layout.tsx — iOS/iPadOS nutzt dafür `src/app/apple-icon.png`, dieses
 * Manifest ist das, was Android/Chrome für dieselbe Funktion braucht).
 *
 * Icons: quadratische Bildmarke auf weißem Grund, erzeugt aus
 * `public/Logo-WebApp.png` (1024×1024). Bei einem neuen Bild alle vier
 * Größen neu erzeugen: `src/app/icon.png` (512), `src/app/apple-icon.png`
 * (180), `src/app/favicon.ico` (16–64) und `public/icon-192.png` /
 * `public/icon-512.png`. Auf bereits installierten Geräten ändert sich das
 * Symbol erst, wenn die App vom Home-Bildschirm entfernt und neu
 * hinzugefügt wird.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TPZ Intranet",
    short_name: "TPZ Intranet",
    description: "Internes Portal des Therapie- und Pflegezentrums Westlausitz",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#aec90b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
