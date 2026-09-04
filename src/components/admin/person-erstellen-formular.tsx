"use client"

import { useRef, useState, useTransition } from "react"

import { ROLLEN_OPTIONEN } from "@/lib/rollen-optionen"
import { Rolle } from "@/generated/prisma/enums"
import { FeldInfo } from "@/components/feld-info"

type Option = { id: string; name: string }

/**
 * Anlegen-Formular für einen neuen Benutzer — bewusst KEIN `<form
 * action={personErstellen}>` wie sonst in diesem Projekt üblich: die
 * Server Action gibt Benutzername und das einmalige Zufallspasswort
 * zurück (siehe personErstellen), und ein Rückgabewert ginge bei einer
 * normalen Formular-Aktion mit anschließendem Redirect verloren. Deshalb
 * wird die Server Action hier direkt aus der Client-Komponente heraus
 * aufgerufen (das funktioniert bei Next.js Server Actions genauso wie
 * über `<form action>`, inklusive `revalidatePath`).
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
      } catch (fehlerObjekt) {
        setFehler(fehlerObjekt instanceof Error ? fehlerObjekt.message : "Das hat nicht geklappt.")
      }
    })
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      {ergebnis && (
        <div className="mb-4 rounded-lg border border-marke-gruen/40 bg-marke-gruen/10 px-3 py-2 text-sm text-marke-grau">
          <p className="font-medium">{ergebnis.name} wurde angelegt.</p>
          <p className="mt-1">
            Benutzername: <span className="font-mono font-semibold">{ergebnis.benutzername}</span>
          </p>
          <p className="mt-1">
            Startpasswort: <span className="font-mono font-semibold">{ergebnis.passwort}</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
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
            <label htmlFor="pe-vorname" className="block text-xs font-medium text-neutral-600">
              Vorname{" "}
              <FeldInfo text="Bei Namensgleichheit in derselben Abteilung hier den vollständigen Vornamen inkl. Zweitname eintragen, z. B. „Jonas Heinz“ statt „Jonas“." />
            </label>
            <input
              id="pe-vorname"
              name="vorname"
              type="text"
              required
              className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="pe-nachname" className="block text-xs font-medium text-neutral-600">
              Nachname
            </label>
            <input
              id="pe-nachname"
              name="nachname"
              type="text"
              required
              className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Der Benutzername wird automatisch aus Vorname, Nachname und Abteilung gebildet
          (vorname.nachname@kuerzel) — keine Personalnummer und keine E-Mail nötig. Ein fester Standort ist
          hier bewusst kein Pflichtfeld: manche Personen bekommen ihren Einsatzort nur über mehrere Gruppen
          verschiedener Standorte. Wer einen festen Standort braucht, bekommt ihn später über &quot;Bearbeiten&quot;.
        </p>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label htmlFor="pe-abteilung" className="block text-xs font-medium text-neutral-600">
              Abteilung
            </label>
            <select
              id="pe-abteilung"
              name="abteilungId"
              required
              className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {abteilungen.map((abteilung) => (
                <option key={abteilung.id} value={abteilung.id}>
                  {abteilung.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="pe-rolle" className="block text-xs font-medium text-neutral-600">
              Rolle
            </label>
            <select
              id="pe-rolle"
              name="rolle"
              defaultValue={Rolle.MITARBEITENDE}
              className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {ROLLEN_OPTIONEN.map((option) => (
                <option key={option.wert} value={option.wert}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={istPending}
          className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-60"
        >
          {istPending ? "Wird angelegt …" : "Benutzer anlegen"}
        </button>
      </form>
    </div>
  )
}
