"use client"

import { useRef } from "react"
import Link from "next/link"
import { BarChart3, FileText, MessageCircle, Paperclip, ThumbsUp } from "lucide-react"

import { InfoAnzeigenDialog, type InfoAnzeigenDialogHandle } from "@/components/info-anzeigen-dialog"
import {
  infoBestaetigen,
  infoDetailLaden,
  infoKommentarErstellen,
  infoLikeUmschalten,
  infoUmfrageOptionUmschalten,
} from "@/lib/infos/aktionen"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import type { Titelbild } from "@/lib/infos/abfragen"

// `absenderName`/`previewHtml` kommen fertig berechnet von der Seite (siehe
// src/app/page.tsx) statt hier importiert/berechnet zu werden — ein
// Laufzeit-Import von UNTERNEHMENSNAME aus abfragen.ts würde dessen
// Prisma-Import mit in den Browser-Bundle ziehen (diese Datei ist eine
// Client Component).
type InfoEintrag = {
  id: string
  titel: string
  erstelltAm: Date
  absenderName: string
  previewHtml: string | null
  titelbild: Titelbild | null
  anhaengeAnzahl: number
  kommentareAnzahl: number
  likeAnzahl: number
  umfrage: boolean
}

/**
 * Newsfeed-Kachel auf der Startseite — jeder Beitrag öffnet sich direkt als
 * Pop-up (InfoAnzeigenDialog), statt erst auf /newsfeed zu führen
 * (Rückmeldung vom 2026-09-06). Nur die Kopfzeile ("Newsfeed" + Badge)
 * bleibt ein Link zur vollständigen Liste. Bewusst ohne
 * Bearbeiten/Löschen-Menü — wie schon vorher auf der Startseite nicht
 * vorgesehen, siehe InfoAnzeigenDialog.
 */
export function NewsfeedHomeKachel({
  infos,
  offeneBestaetigungen,
}: {
  infos: InfoEintrag[]
  offeneBestaetigungen: number
}) {
  const dialogRef = useRef<InfoAnzeigenDialogHandle>(null)

  return (
    <div className="col-span-2 row-span-2 portrait:row-span-1 flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-5 shadow-sm">
      <Link
        href="/newsfeed"
        className="flex shrink-0 items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-xl font-semibold text-ueberschrift hover:underline">Newsfeed</h2>
        {offeneBestaetigungen > 0 && (
          <span
            aria-label={`${offeneBestaetigungen} offene Bestätigungen`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marke-orange px-1 text-xs font-bold text-neutral-900"
          >
            {offeneBestaetigungen}
          </span>
        )}
      </Link>

      {infos.length === 0 ? (
        <p className="mt-2 text-sm text-sekundaer">Noch keine Infos für dich.</p>
      ) : (
        // Jede Info als eigenes kleines "Fenster" statt einer schlichten
        // Liste (siehe Rückmeldung/Skizze), dieser Bereich scrollt für sich
        // (min-h-0 nötig, damit ein Flex-Kind in einer festen Kachelhöhe
        // überhaupt schrumpfen und scrollen darf), damit auch ältere Infos
        // erreichbar bleiben, nicht nur die neuesten zwei wie zuvor.
        <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {infos.map((info) => (
            // block/min-h-0/shrink-0 nötig, weil <li> hier ein Flex-Kind
            // von <ul> ist: als reguläres list-item (Safari-Standard für
            // <li>) berechnet Safari dessen Höhe als Flex-Element falsch
            // aus dem UNgekürzten Text der line-clamp-Box weiter unten
            // statt aus deren sichtbar gekürzter Höhe (Rückmeldung vom
            // 2026-09-14, per Web Inspector nachgemessen: <li> 598px/508px
            // hoch bei nur 111px sichtbarem Inhalt, min-h-0/shrink-0
            // allein reichten nicht — erst zusätzlich block statt
            // list-item behebt es zuverlässig). Kein Aufzählungspunkt
            // ohnehin sichtbar, daher unbedenklich.
            <li key={info.id} className="block min-h-0 shrink-0">
              <button
                type="button"
                onClick={() => dialogRef.current?.oeffnen(info.id)}
                // block statt dem Button-Standard inline-block — Verdacht
                // (Rückmeldung vom 2026-09-15): Safari berechnet bei
                // mehrabsätzigem Inhalt mit Liste die Höhe eines
                // inline-block-Buttons falsch. NewsfeedListe hat block an
                // der entsprechenden Stelle schon und zeigt den Fehler
                // nicht.
                className="block w-full min-w-0 rounded-xl border border-rand p-2.5 text-left transition hover:border-marke-gruen focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
              >
                <p className="truncate text-[11px] text-tertiaer">
                  {info.absenderName}
                  {" · "}
                  {formatiereDatumAusDate(info.erstelltAm)} · {zeitAusDate(info.erstelltAm)}
                </p>
                <h3 className="mt-0.5 text-center text-sm font-semibold text-ueberschrift">{info.titel}</h3>
                {info.titelbild ? (
                  // Bild ODER Text, nie beides nebeneinander (Vorbild
                  // Altsystem "Überblick", Rückmeldung vom 2026-09-07) —
                  // volle Kachelbreite statt eines kleinen Seiten-
                  // Thumbnails. max-h nur hier (nicht auf /newsfeed) nötig,
                  // weil dieser Bereich in einer festen Kachelhöhe für
                  // sich scrollt — ein einzelnes hohes Bild soll nicht die
                  // ganze sichtbare Fläche einnehmen.
                  // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
                  <img
                    src={info.titelbild.src}
                    width={info.titelbild.breite ?? undefined}
                    height={info.titelbild.hoehe ?? undefined}
                    alt=""
                    className="mt-1.5 max-h-36 w-full rounded-lg object-cover"
                  />
                ) : info.previewHtml ? (
                  // Dieselbe Formatierung wie im echten Artikel
                  // (Fett/Kursiv/Ausrichtung/Listen bleiben sichtbar, siehe
                  // Rückmeldung dazu). Kein [&_img] hier nötig: ohne
                  // titelbild enthält previewHtml laut ersteBildInfo gar
                  // kein Bild mehr. BEWUSST OHNE line-clamp-3 (reines
                  // max-h-12/overflow-hidden statt -webkit-line-clamp):
                  // Safari zählt bei previewHtml mit mehreren Absätzen
                  // UND einer eingebetteten Liste (<ul>) die Zeilen nicht
                  // zuverlässig und berechnet die Kartenhöhe dann nach dem
                  // ungekürzten Inhalt statt nach der sichtbar gekürzten
                  // Höhe — ungleiche Lücken zwischen den Karten
                  // (Rückmeldung vom 2026-09-14/15). Nachteil: kein "…" am
                  // Ende, die letzte sichtbare Zeile wird einfach hart
                  // abgeschnitten statt sauber am Zeilenende zu enden.
                  <div
                    className="mt-1 max-h-12 overflow-hidden text-xs text-sekundaer [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-0.5 [&_ul]:list-disc [&_ul]:pl-4"
                    dangerouslySetInnerHTML={{ __html: info.previewHtml }}
                  />
                ) : (
                  info.anhaengeAnzahl > 0 && (
                    <span aria-hidden className="mt-1 flex justify-center text-tertiaer">
                      <FileText className="h-6 w-6" />
                    </span>
                  )
                )}
                {(info.anhaengeAnzahl > 0 || info.kommentareAnzahl > 0 || info.likeAnzahl > 0 || info.umfrage) && (
                  <div className="mt-1.5 flex justify-center gap-3 text-[11px] text-tertiaer">
                    {info.anhaengeAnzahl > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" aria-hidden /> {info.anhaengeAnzahl}
                      </span>
                    )}
                    {info.kommentareAnzahl > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" aria-hidden /> {info.kommentareAnzahl}
                      </span>
                    )}
                    {info.likeAnzahl > 0 && (
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp className="h-3 w-3" aria-hidden /> {info.likeAnzahl}
                      </span>
                    )}
                    {info.umfrage && <BarChart3 className="h-3 w-3" aria-hidden />}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <InfoAnzeigenDialog
        ref={dialogRef}
        infoDetailLadenAktion={infoDetailLaden}
        bestaetigenAktion={infoBestaetigen}
        likeUmschaltenAktion={infoLikeUmschalten}
        kommentarErstellenAktion={infoKommentarErstellen}
        umfrageAbstimmenAktion={infoUmfrageOptionUmschalten}
      />
    </div>
  )
}
