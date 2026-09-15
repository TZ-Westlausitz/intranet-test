"use client"

import { useEffect, useRef } from "react"

import { InfoAvatar } from "@/components/info-avatar"
import { InfoAktionenMenu } from "@/components/info-aktionen-menu"
import { InfoAnzeigenDialog, type InfoAnzeigenDialogHandle } from "@/components/info-anzeigen-dialog"
import { infoZuStandardwerte, type InfoFormularOptionen } from "@/components/info-form-felder"
import type { infosFuerPerson } from "@/lib/infos/abfragen"
import {
  infoAktualisieren,
  infoAnhangLoeschen,
  infoBestaetigen,
  infoDetailLaden,
  infoKommentarErstellen,
  infoLikeUmschalten,
  infoLoeschen,
  infoUmfrageOptionUmschalten,
} from "@/lib/infos/aktionen"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"

// `absenderName`/`vorschauText` kommen schon fertig berechnet von der
// Seite (siehe newsfeed/page.tsx) statt hier importiert/berechnet zu
// werden — ein Laufzeit-Import von UNTERNEHMENSNAME/richTextZuText aus
// abfragen.ts bzw. rich-text.ts würde deren Prisma- bzw.
// sanitize-html-Abhängigkeiten mit in den Browser-Bundle ziehen (diese
// Datei ist eine Client Component).
type InfoEintrag = Awaited<ReturnType<typeof infosFuerPerson>>[number] & {
  absenderName: string
  vorschauText: string | null
}

/**
 * Liste auf /newsfeed — klickbare Karten öffnen die Info direkt als Pop-up
 * (InfoAnzeigenDialog), statt erst auf eine eigene Detailseite zu führen
 * (Rückmeldung vom 2026-09-06: "Die Infos brauchen keine extra Seite").
 * Deshalb als Client Component: das Pop-up braucht einen gemeinsamen Ref
 * über alle Karten hinweg. Bearbeiten/Löschen bleiben unverändert direkt
 * über InfoAktionenMenu in der Liste erreichbar (nicht im Pop-up).
 *
 * `initialInfoId` (aus `?info=` in der URL, siehe infoErstellen) öffnet
 * beim Laden automatisch das passende Pop-up — für Benachrichtigungs-Links,
 * die früher direkt auf die Detailseite zeigten.
 */
export function NewsfeedListe({
  infos,
  optionen,
  initialInfoId,
}: {
  infos: InfoEintrag[]
  optionen: InfoFormularOptionen
  initialInfoId?: string
}) {
  const dialogRef = useRef<InfoAnzeigenDialogHandle>(null)

  useEffect(() => {
    if (initialInfoId) dialogRef.current?.oeffnen(initialInfoId)
    // Nur beim ersten Laden der Seite automatisch öffnen, nicht bei jedem Re-Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <ul className="mt-6 flex flex-col gap-3">
        {infos.map((info) => {
          const standardwerte = infoZuStandardwerte(info)

          return (
            // block/min-h-0/shrink-0 gegen denselben Safari-Fehler wie in
            // NewsfeedHomeKachel (Rückmeldung vom 2026-09-14): <li> als
            // Flex-Kind von <ul> bekommt sonst seine automatische
            // Mindesthöhe aus dem ungekürzten Text der line-clamp-Box
            // weiter unten statt aus deren sichtbar gekürzter Höhe;
            // shrink-0 verhindert, dass min-h-0 die Karten stattdessen
            // zusammendrückt/überlappen lässt. Kein Aufzählungspunkt
            // ohnehin sichtbar, daher block statt list-item unbedenklich.
            <li key={info.id} className="block min-h-0 shrink-0 rounded-xl border border-rand bg-flaeche p-4">
              <div className="flex items-start gap-2">
                <InfoAvatar
                  alsUnternehmen={info.alsUnternehmen}
                  vorname={info.erstelltVon.vorname}
                  nachname={info.erstelltVon.nachname}
                  personId={info.erstelltVon.benutzername}
                  profilbildPfad={info.erstelltVon.profilbildPfad}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primaer">{info.absenderName}</p>
                  <p className="text-xs text-tertiaer">
                    {formatiereDatumAusDate(info.veroeffentlichtAm)} · {zeitAusDate(info.veroeffentlichtAm)}
                  </p>
                </div>
                <InfoAktionenMenu
                  infoId={info.id}
                  darfBearbeiten={info.darfBearbeiten}
                  darfLoeschen={info.darfLoeschen}
                  standardwerte={standardwerte}
                  optionen={optionen}
                  bestehendeAnhaenge={info.anhaenge}
                  aktualisierenAktion={infoAktualisieren}
                  anhangLoeschenAktion={infoAnhangLoeschen}
                  loeschenAktion={infoLoeschen}
                />
              </div>

              <button
                type="button"
                onClick={() => dialogRef.current?.oeffnen(info.id)}
                className="mt-2 block w-full text-left"
              >
                {info.kategorie && (
                  <span className="rounded-full bg-marke-gruen/15 px-2 py-0.5 text-[11px] font-medium text-ueberschrift">
                    {info.kategorie.name}
                  </span>
                )}
                <h2 className="mt-1 text-lg font-bold text-ueberschrift hover:underline">{info.titel}</h2>
                {info.titelbild ? (
                  // Vorschau endet direkt nach dem Titelbild — ein
                  // zusätzlicher Textauszug darunter würde bei einem schon
                  // großformatigen Bild nur unnötig Platz kosten (Rückmeldung dazu).
                  // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
                  <img src={info.titelbild.src} alt="" className="mt-2 w-full rounded-lg object-cover" />
                ) : (
                  info.vorschauText && <p className="mt-2 line-clamp-3 text-sm text-sekundaer">{info.vorschauText}</p>
                )}
                {(info.anhaenge.length > 0 || info._count.kommentare > 0 || info.likeAnzahl > 0 || info.umfrage) && (
                  <div className="mt-2 flex gap-3 text-xs text-tertiaer">
                    {info.anhaenge.length > 0 && <span>📎 {info.anhaenge.length}</span>}
                    {info._count.kommentare > 0 && <span>💬 {info._count.kommentare}</span>}
                    {info.likeAnzahl > 0 && <span>👍 {info.likeAnzahl}</span>}
                    {info.umfrage && <span>📊 Umfrage</span>}
                  </div>
                )}
              </button>

              {info.nochNichtVeroeffentlicht ? (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-marke-orange/15 px-3 py-2 text-xs font-medium text-ueberschrift">
                  🕒 Geplant für {formatiereDatumAusDate(info.veroeffentlichtAm)}, {zeitAusDate(info.veroeffentlichtAm)} Uhr
                </div>
              ) : (
                info.mitBestaetigung && (
                  <div className="mt-2 flex items-center gap-2 border-t border-flaeche-100 pt-2">
                    {info.istEmpfaenger &&
                      (info.selbstBestaetigt ? (
                        <span className="rounded-full bg-marke-gruen/15 px-2.5 py-1 text-xs font-medium text-marke-gruen-dunkel">
                          ✓ Bestätigt
                        </span>
                      ) : (
                        <form action={infoBestaetigen.bind(null, info.id)}>
                          <button
                            type="submit"
                            className="h-8 rounded-lg bg-marke-gruen px-3 text-xs font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
                          >
                            Bestätigen
                          </button>
                        </form>
                      ))}
                    <span className="text-xs text-tertiaer">
                      {info.bestaetigtAnzahl} von {info.empfaengerAnzahl} bestätigt
                    </span>
                  </div>
                )
              )}
            </li>
          )
        })}
      </ul>

      <InfoAnzeigenDialog
        ref={dialogRef}
        infoDetailLadenAktion={infoDetailLaden}
        bestaetigenAktion={infoBestaetigen}
        likeUmschaltenAktion={infoLikeUmschalten}
        kommentarErstellenAktion={infoKommentarErstellen}
        umfrageAbstimmenAktion={infoUmfrageOptionUmschalten}
      />
    </>
  )
}
