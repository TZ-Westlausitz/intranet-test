import type { MetadataRoute } from "next"

/**
 * Für "Zum Home-Bildschirm hinzufügen" (siehe Metadata.appleWebApp in
 * layout.tsx — für iOS/iPadOS reichen eigentlich die apple-* Meta-Tags
 * dort, dieses Manifest ist zusätzlich das, was Android/Chrome für
 * dieselbe Funktion braucht). Kein eigenes quadratisches Icon vorhanden,
 * deshalb vorerst das normale (breite) Logo — sieht auf dem Homescreen
 * nicht ideal aus, ist aber besser als gar kein Icon. Folgeaufgabe: ein
 * echtes quadratisches Icon (z. B. 512×512, nur die runde Bildmarke ohne
 * Schriftzug) nachreichen.
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
      {
        src: "/logo.png",
        sizes: "2278x439",
        type: "image/png",
      },
    ],
  }
}
