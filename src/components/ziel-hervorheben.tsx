"use client"

import { useEffect } from "react"

/**
 * Sprungziel für Benachrichtigungs-Links (Rückmeldung 2026-09-18): Ein Klick
 * auf eine Benachrichtigung soll direkt beim betroffenen Auftrag/Termin
 * landen, nicht nur auf der Übersichtsseite. Die Zielseite reicht die ID aus
 * der URL (`?auftrag=`/`?termin=`) hierher durch; gesucht wird das Element
 * mit `data-ziel="<id>"` — das erste SICHTBARE (Termine stehen teils zweimal
 * auf der Seite: Kalenderblatt und Liste). Es wird ins Bild gescrollt, kurz
 * hervorgehoben und, mit `oeffnen`, angeklickt (Termine öffnen dadurch ihr
 * Info-Pop-Up). Steckt es in einem eingeklappten <details>, wird das zuerst
 * aufgeklappt. Fehlt das Element (z. B. gelöscht, anderer Monat), passiert
 * einfach nichts — die Seite bleibt wie sie ist.
 */
export function ZielHervorheben({ zielId, oeffnen = false }: { zielId?: string; oeffnen?: boolean }) {
  useEffect(() => {
    if (!zielId) return
    const kandidaten = [...document.querySelectorAll<HTMLElement>("[data-ziel]")].filter(
      (el) => el.dataset.ziel === zielId,
    )
    const ziel = kandidaten.find((el) => el.getClientRects().length > 0) ?? kandidaten[0]
    if (!ziel) return

    let elternDetails = ziel.closest("details")
    while (elternDetails) {
      elternDetails.open = true
      elternDetails = elternDetails.parentElement?.closest("details") ?? null
    }

    ziel.scrollIntoView({ block: "center", behavior: "smooth" })
    ziel.classList.add("ring-2", "ring-marke-orange", "rounded-lg", "transition-shadow")
    const entfernen = window.setTimeout(() => {
      ziel.classList.remove("ring-2", "ring-marke-orange", "rounded-lg", "transition-shadow")
    }, 3000)

    if (oeffnen) {
      const klickziel = ziel.querySelector<HTMLElement>('[role="button"], button') ?? ziel
      klickziel.click()
    }

    return () => window.clearTimeout(entfernen)
    // Nur beim ersten Laden der Seite, nicht bei jedem Re-Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
