"use client"

import { useRouter } from "next/navigation"

import { verlassenMitBestaetigung } from "@/lib/formular-schutz"

/**
 * Geht zur vorherigen Seite in der Browser-Historie zurück — meist die
 * Übersicht, von der aus man hierhergekommen ist. Client-Komponente, weil
 * `router.back()` nur im Browser existiert; die Seiten selbst bleiben
 * Server-Komponenten, das hier ist nur ein kleiner Baustein am Ende.
 *
 * `verlassenMitBestaetigung` fragt zuerst nach, falls die Seite ein
 * geändertes, noch nicht abgeschicktes Formular enthält (siehe
 * FormularAenderungenSchutz) — ohne ein solches Formular navigiert sie
 * sofort weiter, wie bisher.
 */
export function ZurueckButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => verlassenMitBestaetigung(() => router.back())}
      className="mt-8 flex w-fit items-center gap-1.5 text-sm font-medium text-primaer transition hover:text-marke-gruen-dunkel"
    >
      <span aria-hidden>←</span> Zurück
    </button>
  )
}
