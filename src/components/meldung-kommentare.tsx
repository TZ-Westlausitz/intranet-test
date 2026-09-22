"use client"

import { useEffect, useRef, useState } from "react"

import { MELDUNG_STATUS_LABEL } from "@/lib/kontaktstelle/status"
import type { meldungVerlaufLaden, meldungAlsGelesenMarkieren, meldungKommentarErstellen } from "@/lib/kontaktstelle/aktionen"

type LadeErgebnis = Awaited<ReturnType<typeof meldungVerlaufLaden>>
type MeldungVerlaufEintragAnzeige = LadeErgebnis["eintraege"][number]

const POLL_INTERVALL_MS = 10_000

function zeitpunkt(datum: Date): string {
  return datum.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function AnhangZeile({ meldungId, anhang }: { meldungId: string; anhang: { id: string; dateiname: string } }) {
  return (
    <a
      href={`/api/kontaktstelle/${meldungId}/anhaenge/${anhang.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[14rem] truncate text-xs text-marke-gruen-dunkel hover:underline"
    >
      📎 {anhang.dateiname}
    </a>
  )
}

/**
 * Verlauf/Rückkanal zu einer Meldung — leichtes Hintergrund-Polling statt
 * WebSocket, exaktes Muster ChatKonversationAnsicht (Chat-Baustein,
 * Rückmeldung 2026-09-10: "bewusst so entschieden"): alle 10s wird per
 * Server Action direkt (kein `<form action>`) nach Einträgen NEUER als
 * der zuletzt gesehene gefragt. `autorLabel` kommt bereits fertig aus
 * meldungVerlaufFuerAnsicht (siehe dort) — zeigt "Anonym" statt eines
 * Namens, wenn die Kontaktstelle eine anonyme Meldung liest, sonst den
 * echten Namen. Statuswechsel (`art: "status"`) sind Systemzeilen ohne
 * Personenbezug, mittig statt als Sprechblase.
 *
 * `ungeleseneAnzahl` (Rückmeldung 2026-09-22: der vorherige Gesamt-Zähler
 * neben "Verlauf" war nutzlos) kommt aus dem Server-Component-Elternteil,
 * berechnet aus dem Gelesen-Stand VOR dem jeweils letzten Rendern dieser
 * Seite — zeigt "das war neu, als du zuletzt (neu) geladen wurdest". Das
 * Markieren als gelesen passiert client-seitig beim Einhängen (Muster
 * Chat) und nach jeder eigenen Nachricht; Next.js rendert die Server
 * Component wegen `revalidatePath` in beiden Fällen neu, wodurch die Zahl
 * i. d. R. auf 0 fällt — das reine Hintergrund-Polling (neue Einträge
 * ANDERER Personen, siehe `neueLaden`) löst dagegen KEIN Neurendern der
 * Server Component aus, die Zahl bleibt bis zur nächsten eigenen Aktion
 * oder einem echten Neuladen stehen.
 *
 * `chatAktiv` kommt aus dem Server-Component-Elternteil UND wird bei
 * jedem Poll aktualisiert — ändert die Kontaktstelle den Status auf "In
 * Bearbeitung", während die meldende Person die Seite offen hat, schaltet
 * sich das Antwortformular ohne Neuladen frei.
 */
export function MeldungKommentare({
  meldungId,
  anfangsEintraege,
  anfangsChatAktiv,
  chatInaktivHinweis,
  ungeleseneAnzahl,
  verlaufLadenAktion,
  alsGelesenMarkierenAktion,
  kommentarAktion,
}: {
  meldungId: string
  anfangsEintraege: MeldungVerlaufEintragAnzeige[]
  anfangsChatAktiv: boolean
  /** Text, wenn `chatAktiv` false ist — unterscheidet sich zwischen "noch nicht in Bearbeitung" und "dauerhaft archiviert" (siehe Aufrufer). */
  chatInaktivHinweis: string
  ungeleseneAnzahl: number
  verlaufLadenAktion: typeof meldungVerlaufLaden
  alsGelesenMarkierenAktion: typeof meldungAlsGelesenMarkieren
  kommentarAktion: typeof meldungKommentarErstellen
}) {
  const [eintraege, setEintraege] = useState(anfangsEintraege)
  const [chatAktiv, setChatAktiv] = useState(anfangsChatAktiv)
  const [anhaenge, setAnhaenge] = useState<string[]>([])
  const [sendet, setSendet] = useState(false)
  const letzteZeitRef = useRef(anfangsEintraege.at(-1)?.erstelltAm ?? null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    alsGelesenMarkierenAktion(meldungId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alsGelesenMarkierenAktion ist eine Server Action, die bei jedem Router-Refresh eine neue Funktionsreferenz bekommt (Muster ChatKonversationAnsicht, siehe dort für die Endlosschleifen-Begründung).
  }, [meldungId])

  async function neueLaden() {
    const ergebnis = await verlaufLadenAktion(meldungId, letzteZeitRef.current?.toISOString())
    setChatAktiv(ergebnis.chatAktiv)
    if (ergebnis.eintraege.length === 0) return
    letzteZeitRef.current = ergebnis.eintraege.at(-1)!.erstelltAm
    setEintraege((bisher) => [...bisher, ...ergebnis.eintraege])
    alsGelesenMarkierenAktion(meldungId)
  }

  useEffect(() => {
    const intervall = window.setInterval(neueLaden, POLL_INTERVALL_MS)
    return () => window.clearInterval(intervall)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neueLaden liest meldungId/Aktionen aus Props, die sich hier nicht ändern
  }, [meldungId])

  async function beiSenden(ereignis: React.FormEvent<HTMLFormElement>) {
    ereignis.preventDefault()
    if (sendet) return
    const formData = new FormData(ereignis.currentTarget)
    setSendet(true)
    try {
      await kommentarAktion(meldungId, formData)
      formRef.current?.reset()
      setAnhaenge([])
      await neueLaden()
    } finally {
      setSendet(false)
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-rand bg-flaeche p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ueberschrift">
        Verlauf
        {ungeleseneAnzahl > 0 && (
          <span
            aria-label={`${ungeleseneAnzahl} neue Nachrichten`}
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-marke-orange px-1 text-[9px] font-bold text-neutral-900"
          >
            {ungeleseneAnzahl}
          </span>
        )}
      </h2>

      {eintraege.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {eintraege.map((eintrag) => {
            if (eintrag.art === "status") {
              return (
                <li key={eintrag.id} className="py-0.5 text-center text-xs text-tertiaer">
                  Status auf „{MELDUNG_STATUS_LABEL[eintrag.status] ?? eintrag.status}“ geändert · {zeitpunkt(eintrag.erstelltAm)}
                </li>
              )
            }
            if (eintrag.art === "abschluss_bestaetigt") {
              return (
                <li key={eintrag.id} className="py-0.5 text-center text-xs text-tertiaer">
                  Anliegen als geklärt bestätigt · {zeitpunkt(eintrag.erstelltAm)}
                </li>
              )
            }
            return (
              <li key={eintrag.id} className="rounded-lg bg-flaeche-schwach px-3 py-2">
                <p className="text-xs font-medium text-sekundaer">
                  {eintrag.autorLabel} · {zeitpunkt(eintrag.erstelltAm)}
                </p>
                <p className="text-sm text-primaer">{eintrag.text}</p>
                {eintrag.anhaenge.length > 0 && (
                  <div className="mt-1 flex flex-col">
                    {eintrag.anhaenge.map((anhang) => (
                      <AnhangZeile key={anhang.id} meldungId={meldungId} anhang={anhang} />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {chatAktiv ? (
        <form ref={formRef} onSubmit={beiSenden} className="mt-3 flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              type="text"
              name="text"
              required
              placeholder="Nachricht …"
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
                onChange={(ereignis) => setAnhaenge([...(ereignis.target.files ?? [])].map((datei) => datei.name))}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={sendet}
              className="h-9 shrink-0 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200 disabled:opacity-50"
            >
              Senden
            </button>
          </div>
          {anhaenge.length > 0 && <p className="text-xs text-sekundaer">Anhang: {anhaenge.join(", ")}</p>}
        </form>
      ) : (
        <p className="mt-3 text-xs text-sekundaer">{chatInaktivHinweis}</p>
      )}
    </div>
  )
}
