import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default ist 1 MB — reicht nicht für Termin-Anhänge (Fotos, PDFs).
    // Harte Obergrenze pro Datei prüft zusätzlich terminAnhaengeSpeichern.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
