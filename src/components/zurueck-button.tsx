"use client"

import { useRouter } from "next/navigation"

/**
 * Geht zur vorherigen Seite in der Browser-Historie zurück — meist die
 * Übersicht, von der aus man hierhergekommen ist. Client-Komponente, weil
 * `router.back()` nur im Browser existiert; die Seiten selbst bleiben
 * Server-Komponenten, das hier ist nur ein kleiner Baustein am Ende.
 */
export function ZurueckButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mt-8 flex w-fit items-center gap-1.5 text-sm font-medium text-primaer transition hover:text-marke-gruen-dunkel"
    >
      <span aria-hidden>←</span> Zurück
    </button>
  )
}
