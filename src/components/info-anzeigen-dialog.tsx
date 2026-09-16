"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import { InfoAvatar } from "@/components/info-avatar"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import type {
  infoDetailLaden,
  infoBestaetigen,
  infoLikeUmschalten,
  infoKommentarErstellen,
  infoUmfrageOptionUmschalten,
} from "@/lib/infos/aktionen"

type InfoDetailLadenAktion = typeof infoDetailLaden
type InfoDetail = NonNullable<Awaited<ReturnType<InfoDetailLadenAktion>>>

export type InfoAnzeigenDialogHandle = { oeffnen: (infoId: string) => void }

/**
 * Lese-Pop-up für eine einzelne Info — ersetzt die frühere eigene Seite
 * (/newsfeed/[infoId]): "Die Infos brauchen keine extra Seite" (Rückmeldung
 * vom 2026-09-06). EIN Exemplar pro Liste (Startseiten-Kachel bzw.
 * /newsfeed), `oeffnen(infoId)` lädt die Detaildaten bei Bedarf nach (die
 * Listen kennen nur die Vorschaufelder, keine Kommentare/vollen Anhänge).
 *
 * Bewusst OHNE das Bearbeiten/Löschen-Menü — das steht schon direkt in der
 * Liste (InfoAktionenMenu, nur auf /newsfeed, nie auf der Startseite), ein
 * zweites Mal hier wäre doppelt gepflegte Logik für denselben Zweck.
 *
 * Bestätigen/Kommentieren laufen über direkte Aufrufe der Server Actions
 * (nicht über `<form action=...>`), weil das Pop-up danach seinen eigenen,
 * lokal geladenen Stand neu holen muss, um sich selbst zu aktualisieren —
 * ein revalidatePath allein aktualisiert nur die Server-Component-Daten der
 * umgebenden Seite, nicht diesen clientseitig gehaltenen State.
 */
export const InfoAnzeigenDialog = forwardRef<
  InfoAnzeigenDialogHandle,
  {
    infoDetailLadenAktion: InfoDetailLadenAktion
    bestaetigenAktion: typeof infoBestaetigen
    likeUmschaltenAktion: typeof infoLikeUmschalten
    kommentarErstellenAktion: typeof infoKommentarErstellen
    umfrageAbstimmenAktion: typeof infoUmfrageOptionUmschalten
  }
>(function InfoAnzeigenDialog(
  { infoDetailLadenAktion, bestaetigenAktion, likeUmschaltenAktion, kommentarErstellenAktion, umfrageAbstimmenAktion },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [detail, setDetail] = useState<InfoDetail | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function laden(id: string) {
    setLaedt(true)
    const frisch = await infoDetailLadenAktion(id)
    setDetail(frisch)
    setLaedt(false)
  }

  useImperativeHandle(ref, () => ({
    oeffnen: (id) => {
      setInfoId(id)
      setDetail(null)
      dialogRef.current?.showModal()
      void laden(id)
    },
  }))

  async function bestaetigenKlick() {
    if (!infoId) return
    await bestaetigenAktion(infoId)
    await laden(infoId)
  }

  async function likeKlick() {
    if (!infoId) return
    await likeUmschaltenAktion(infoId)
    await laden(infoId)
  }

  async function umfrageKlick(optionId: string) {
    if (!infoId) return
    await umfrageAbstimmenAktion(optionId)
    await laden(infoId)
  }

  async function kommentarAbsenden(ereignis: React.FormEvent<HTMLFormElement>) {
    ereignis.preventDefault()
    if (!infoId) return
    const formular = ereignis.currentTarget
    await kommentarErstellenAktion(infoId, new FormData(formular))
    formular.reset()
    await laden(infoId)
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-rand px-5 py-4">
          {detail ? (
            <div className="flex min-w-0 items-start gap-2">
              <InfoAvatar
                alsUnternehmen={detail.alsUnternehmen}
                vorname={detail.erstelltVon.vorname}
                nachname={detail.erstelltVon.nachname}
                personId={detail.erstelltVon.benutzername}
                profilbildPfad={detail.erstelltVon.profilbildPfad}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primaer">{detail.absenderName}</p>
                <p className="text-xs text-tertiaer">
                  {formatiereDatumAusDate(detail.veroeffentlichtAm)} · {zeitAusDate(detail.veroeffentlichtAm)}
                </p>
              </div>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => dialogRef.current?.close()}
            className="shrink-0 rounded-full p-1.5 text-tertiaer transition hover:bg-flaeche-100 hover:text-primaer"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {laedt || !detail ? (
            <p className="py-8 text-center text-sm text-tertiaer">Lädt …</p>
          ) : (
            <>
              {detail.kategorie && (
                <span className="inline-block rounded-full bg-marke-gruen/15 px-2 py-0.5 text-[11px] font-medium text-ueberschrift">
                  {detail.kategorie.name}
                </span>
              )}

              <h1 className="mt-2 text-xl font-bold text-ueberschrift">{detail.titel}</h1>

              {detail.inhalt && (
                <div
                  className="mt-2 text-sm text-primaer [&_a]:text-marke-gruen-dunkel [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: detail.inhalt }}
                />
              )}

              {detail.umfrage && (
                <UmfrageAnzeige
                  umfrage={detail.umfrage}
                  nochNichtVeroeffentlicht={detail.nochNichtVeroeffentlicht}
                  istEmpfaenger={detail.istEmpfaenger}
                  abstimmenKlick={umfrageKlick}
                />
              )}

              <AnhaengeListe infoId={detail.id} anhaenge={detail.anhaenge} />

              {detail.nochNichtVeroeffentlicht ? (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-marke-orange/15 px-3 py-2 text-sm font-medium text-ueberschrift">
                  🕒 Geplant für {formatiereDatumAusDate(detail.veroeffentlichtAm)}, {zeitAusDate(detail.veroeffentlichtAm)} Uhr —
                  nur für dich sichtbar, bis es veröffentlicht wird.
                </p>
              ) : (
                <>
                  {!detail.istEmpfaenger && (
                    <div className="mt-3 rounded-xl border border-marke-orange/30 bg-marke-orange/10 px-4 py-2.5 text-sm text-ueberschrift">
                      Du siehst diese Info über den Admin-Modus — rein lesend, du bist kein Empfänger. Liken,
                      Bestätigen und Kommentieren sind deshalb ausgeblendet.
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-flaeche-100 pt-3">
                    {detail.istEmpfaenger ? (
                      <button
                        type="button"
                        onClick={likeKlick}
                        aria-pressed={detail.selbstGeliked}
                        className={
                          "flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition " +
                          (detail.selbstGeliked
                            ? "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25"
                            : "bg-flaeche-100 text-primaer hover:bg-flaeche-200")
                        }
                      >
                        👍 {detail.likeAnzahl}
                      </button>
                    ) : (
                      <span className="flex h-8 items-center gap-1 rounded-lg bg-flaeche-100 px-3 text-xs font-semibold text-tertiaer">
                        👍 {detail.likeAnzahl}
                      </span>
                    )}

                    {detail.mitBestaetigung && (
                      <>
                        {detail.istEmpfaenger &&
                          (detail.selbstBestaetigt ? (
                            <span className="rounded-full bg-marke-gruen/15 px-2.5 py-1 text-xs font-medium text-marke-gruen-dunkel">
                              ✓ Bestätigt
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={bestaetigenKlick}
                              className="h-8 rounded-lg bg-marke-gruen px-3 text-xs font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
                            >
                              Bestätigen
                            </button>
                          ))}
                        <span className="text-xs text-tertiaer">
                          {detail.bestaetigtAnzahl} von {detail.empfaengerAnzahl} bestätigt
                        </span>
                      </>
                    )}
                  </div>

                  {detail.kommentareErlaubt && (
                    <div className="mt-4 border-t border-flaeche-100 pt-3">
                      <h2 className="text-sm font-semibold text-ueberschrift">
                        Rückfragen{detail.kommentare.length > 0 ? ` (${detail.kommentare.length})` : ""}
                      </h2>

                      {detail.kommentare.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                          {detail.kommentare.map((kommentar) => (
                            <li key={kommentar.id} className="rounded-lg bg-flaeche-schwach px-2.5 py-1.5">
                              <p className="text-xs font-medium text-sekundaer">
                                {kommentar.person.vorname} {kommentar.person.nachname} ·{" "}
                                {formatiereDatumAusDate(kommentar.erstelltAm)} {zeitAusDate(kommentar.erstelltAm)}
                              </p>
                              <p className="text-sm text-primaer">{kommentar.text}</p>
                              <AnhaengeListe infoId={detail.id} anhaenge={kommentar.anhaenge} />
                            </li>
                          ))}
                        </ul>
                      )}

                      {detail.istEmpfaenger && (
                        <form onSubmit={kommentarAbsenden} className="mt-3 flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="text"
                              required
                              placeholder="Frage oder Hinweis …"
                              className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
                            />
                            <label
                              title="Anhang hinzufügen"
                              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-flaeche-100 text-lg leading-none text-primaer transition hover:bg-flaeche-200"
                            >
                              +
                              <input
                                type="file"
                                name="anhaenge"
                                multiple
                                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                                className="hidden"
                              />
                            </label>
                            <button
                              type="submit"
                              className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200"
                            >
                              Senden
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  )
})

/**
 * Eigene Komponente statt inline im JSX von InfoAnzeigenDialog — dort
 * verliert TypeScript die Null-Prüfung von `detail.umfrage` innerhalb der
 * `.map()`-Closure, weil `detail` sich laut Typsystem theoretisch zwischen
 * der Prüfung und dem Zugriff ändern könnte. Als eigene Funktion mit
 * einem eigenen, nicht-nullbaren Parameter entfällt das Problem.
 */
function UmfrageAnzeige({
  umfrage,
  nochNichtVeroeffentlicht,
  istEmpfaenger,
  abstimmenKlick,
}: {
  umfrage: NonNullable<InfoDetail["umfrage"]>
  nochNichtVeroeffentlicht: boolean
  istEmpfaenger: boolean
  abstimmenKlick: (optionId: string) => void
}) {
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {umfrage.frage && <p className="text-sm font-medium text-ueberschrift">{umfrage.frage}</p>}
      {umfrage.optionen.map((option) => (
        <label
          key={option.id}
          className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-rand px-3 py-2 text-sm"
        >
          <div aria-hidden className="absolute inset-y-0 left-0 bg-marke-gruen/15" style={{ width: `${option.prozent}%` }} />
          <input
            type={umfrage.mehrfachauswahl ? "checkbox" : "radio"}
            name={`umfrage-${umfrage.id}`}
            checked={option.selbstGewaehlt}
            onChange={() => abstimmenKlick(option.id)}
            disabled={nochNichtVeroeffentlicht || !istEmpfaenger}
            className="relative shrink-0"
          />
          <span className="relative flex-1">{option.text}</span>
          <span className="relative shrink-0 text-xs text-sekundaer">
            {option.stimmenAnzahl} · {option.prozent}%
          </span>
        </label>
      ))}
      <p className="text-xs text-tertiaer">{umfrage.teilnehmerAnzahl} Teilnehmer:innen</p>
    </div>
  )
}

/**
 * Bild-Anhänge (mimetyp `image/*`) als anklickbare Vorschau-Kachel statt als
 * Datei-Chip (Rückmeldung 2026-09-16: Fotos tauchten bisher gar nicht als
 * Bild auf, nur als "📎 Dateiname"). Klick öffnet eine eigene Lightbox
 * (natives `<dialog>`, verschachtelt im schon offenen InfoAnzeigenDialog —
 * das trägt der Browser problemlos) statt `target="_blank"`: Letzteres
 * navigierte in der installierten Web-App (Standalone-Modus, keine
 * Tab-Leiste) einfach die ganze App zum rohen Bild, ohne Weg zurück außer
 * Geste/Neustart — dieselbe Rückmeldung. Alles andere (PDF etc.) bleibt der
 * bisherige Chip-Link, dort ist ein neuer Tab mit Browser-eigenem
 * PDF-Viewer unproblematisch.
 */
function AnhaengeListe({
  infoId,
  anhaenge,
}: {
  infoId: string
  anhaenge: { id: string; dateiname: string; mimetyp: string }[]
}) {
  const lightboxRef = useRef<HTMLDialogElement>(null)
  const [geoeffnetesBild, setGeoeffnetesBild] = useState<{ id: string; dateiname: string } | null>(null)

  if (anhaenge.length === 0) return null

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {anhaenge.map((anhang) =>
          anhang.mimetyp.startsWith("image/") ? (
            <button
              key={anhang.id}
              type="button"
              onClick={() => {
                setGeoeffnetesBild(anhang)
                lightboxRef.current?.showModal()
              }}
              className="overflow-hidden rounded-lg border border-rand transition hover:border-marke-gruen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus der Ablage, kein optimierbares Next-Image-Ziel */}
              <img
                src={`/api/infos/${infoId}/anhaenge/${anhang.id}`}
                alt={anhang.dateiname}
                className="h-20 w-20 object-cover"
              />
            </button>
          ) : (
            <a
              key={anhang.id}
              href={`/api/infos/${infoId}/anhaenge/${anhang.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[12rem] items-center gap-1 truncate rounded-full bg-flaeche-100 px-2 py-0.5 text-xs text-primaer hover:underline"
            >
              📎 {anhang.dateiname}
            </a>
          ),
        )}
      </div>

      <dialog
        ref={lightboxRef}
        onClick={(ereignis) => {
          if (ereignis.target === lightboxRef.current) lightboxRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-transparent p-0 backdrop:bg-neutral-900/70"
      >
        {geoeffnetesBild && (
          <div className="relative">
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => lightboxRef.current?.close()}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/60 text-white transition hover:bg-neutral-900/80"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau aus der Ablage, kein optimierbares Next-Image-Ziel */}
            <img
              src={`/api/infos/${infoId}/anhaenge/${geoeffnetesBild.id}`}
              alt={geoeffnetesBild.dateiname}
              className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain"
            />
          </div>
        )}
      </dialog>
    </>
  )
}
