"use client"

import { useRef, useState, useTransition } from "react"

type Option = { id: string; name: string; kuerzel: string | null }

/**
 * Dieselbe Normalisierung wie `nameNormalisieren` in personen-aktionen.ts
 * — hier dupliziert statt importiert, weil sie serverseitig in einer
 * "use server"-Datei steht und diese Komponente rein clientseitig nur
 * eine Live-Vorschau braucht, keine echte Berechnung. Weicht die Logik
 * dort je auseinander, betrifft das nur die Vorschau, nie den tatsächlich
 * gespeicherten Benutzernamen (der entsteht ausschließlich in
 * personErstellen).
 */
function nameNormalisieren(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/**
 * Anlegen-Formular für einen neuen Benutzer — bewusst KEIN `<form
 * action={personErstellen}>` wie sonst in diesem Projekt üblich: die
 * Server Action gibt Benutzername und das einmalige Zufallspasswort
 * zurück (siehe personErstellen), und ein Rückgabewert ginge bei einer
 * normalen Formular-Aktion mit anschließendem Redirect verloren. Deshalb
 * wird die Server Action hier direkt aus der Client-Komponente heraus
 * aufgerufen (das funktioniert bei Next.js Server Actions genauso wie
 * über `<form action>`, inklusive `revalidatePath`).
 *
 * Vorname/Nachname/Abteilung sind kontrolliert (statt nur beim Absenden
 * über FormData gelesen), damit die Benutzername-Vorschau neben dem
 * Button live mitläuft (Rückmeldung 2026-09-23: der bisherige
 * Erklärungstext dazu unter dem Namen ist raus, die Vorschau ersetzt ihn).
 */
export function PersonErstellenFormular({
  abteilungen,
  aktion,
}: {
  abteilungen: Option[]
  aktion: (formData: FormData) => Promise<{ personId: string; benutzername: string; passwort: string }>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [istPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const [ergebnis, setErgebnis] = useState<{ name: string; benutzername: string; passwort: string } | null>(null)

  const [vorname, setVorname] = useState("")
  const [nachname, setNachname] = useState("")
  const [abteilungId, setAbteilungId] = useState(abteilungen[0]?.id ?? "")

  const abteilung = abteilungen.find((a) => a.id === abteilungId)
  const benutzernameVorschau =
    vorname.trim() && nachname.trim() && abteilung?.kuerzel
      ? `${nameNormalisieren(vorname)}.${nameNormalisieren(nachname)}@${abteilung.kuerzel}`
      : null

  function absenden(ereignis: React.FormEvent<HTMLFormElement>) {
    ereignis.preventDefault()
    setFehler(null)
    const formular = ereignis.currentTarget
    const formData = new FormData(formular)
    const name = `${formData.get("vorname")} ${formData.get("nachname")}`

    startTransition(async () => {
      try {
        const { benutzername, passwort } = await aktion(formData)
        setErgebnis({ name, benutzername, passwort })
        formular.reset()
        setVorname("")
        setNachname("")
        setAbteilungId(abteilungen[0]?.id ?? "")
      } catch (fehlerObjekt) {
        setFehler(fehlerObjekt instanceof Error ? fehlerObjekt.message : "Das hat nicht geklappt.")
      }
    })
  }

  return (
    <div className="rounded-xl border border-rand bg-flaeche p-4">
      {ergebnis && (
        <div className="mb-4 rounded-lg border border-marke-gruen/40 bg-marke-gruen/10 px-3 py-2 text-sm text-ueberschrift">
          <p className="font-medium">{ergebnis.name} wurde angelegt.</p>
          <p className="mt-1">
            Benutzername: <span className="font-mono font-semibold">{ergebnis.benutzername}</span>
          </p>
          <p className="mt-1">
            Startpasswort: <span className="font-mono font-semibold">{ergebnis.passwort}</span>
          </p>
          <p className="mt-1 text-xs text-sekundaer">
            Das Passwort wird nur dieses eine Mal angezeigt — bitte jetzt notieren oder weitergeben. Der
            Benutzername steht danach dauerhaft im Profil der Person.
          </p>
        </div>
      )}

      {fehler && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fehler}</p>
      )}

      <form ref={formRef} onSubmit={absenden} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label htmlFor="pe-vorname" className="block text-xs font-medium text-primaer">
              Vorname
            </label>
            <input
              id="pe-vorname"
              name="vorname"
              type="text"
              value={vorname}
              onChange={(ereignis) => setVorname(ereignis.target.value)}
              required
              className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="pe-nachname" className="block text-xs font-medium text-primaer">
              Nachname
            </label>
            <input
              id="pe-nachname"
              name="nachname"
              type="text"
              value={nachname}
              onChange={(ereignis) => setNachname(ereignis.target.value)}
              required
              className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pe-abteilung" className="block text-xs font-medium text-primaer">
            Abteilung
          </label>
          <select
            id="pe-abteilung"
            name="abteilungId"
            value={abteilungId}
            onChange={(ereignis) => setAbteilungId(ereignis.target.value)}
            required
            className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
          >
            {abteilungen.map((abteilung) => (
              <option key={abteilung.id} value={abteilung.id}>
                {abteilung.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          {benutzernameVorschau ? (
            <p className="min-w-0 truncate text-xs text-tertiaer">
              Benutzername: <span className="font-mono text-sekundaer">{benutzernameVorschau}</span>
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={istPending}
            className="ml-auto h-9 shrink-0 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-60"
          >
            {istPending ? "Wird angelegt …" : "Benutzer anlegen"}
          </button>
        </div>
      </form>
    </div>
  )
}
