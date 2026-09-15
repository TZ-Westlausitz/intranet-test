import { notFound, redirect } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiAblegen } from "@/lib/ablage"
import { datumUmMitternachtFuerDatumUhrzeitFeld } from "@/lib/datum"
import {
  ausgabeDatenZuFeldern,
  ruecknahmeDatenZuFeldern,
  uebergabeprotokollPdfErzeugen,
  type AusgabeEntwurfDaten,
  type RuecknahmeEntwurfDaten,
  type Schadenspunkt,
} from "@/lib/pdf/uebergabeprotokoll"
import { Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"
import { DatumUhrzeitFeld } from "@/components/datum-uhrzeit-feld"
import { ZustandUndVorschaeden } from "@/components/zustand-und-vorschaeden"

/**
 * Übergabeprotokoll (Ausgabe) vorbereiten — für die Übergabe an die/den
 * Entleiher/in. Erzeugt einen ausgefüllten, aber NICHT unterschriebenen
 * PDF-Entwurf (siehe Kommentar in lib/pdf/uebergabeprotokoll.ts). Die echte
 * Unterschrift und damit das echte `Uebergabeprotokoll` entstehen erst mit
 * einer künftigen Unterschriften-Erfassung.
 *
 * Das PDF wird bei jedem Speichern komplett aus der Vorlage neu erzeugt
 * (nie durch Nachbearbeiten der vorherigen Datei) — deshalb wird hier auch
 * die bereits vorhandene Rücknahme (falls es sie schon gibt) erneut
 * mitgezeichnet, sonst würde ein späteres Bearbeiten der Ausgabe die
 * Rücknahme-Seite aus dem PDF verschwinden lassen.
 */

const TANKFUELLUNG_OPTIONEN = [
  { wert: "VOLL", label: "voll" },
  { wert: "DREI_VIERTEL", label: "¾" },
  { wert: "HALB", label: "½" },
  { wert: "VIERTEL", label: "¼" },
  { wert: "LEER", label: "leer" },
] as const

async function protokollEntwurfErzeugen(formData: FormData) {
  "use server"

  await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUniqueOrThrow({
    where: { id: ausleiheId },
    include: { fahrzeug: true, entleiher: true },
  })

  let schadenspunkte: Schadenspunkt[] = []
  try {
    const eingabe = JSON.parse(String(formData.get("schadenspunkte") ?? "[]"))
    if (Array.isArray(eingabe)) schadenspunkte = eingabe
  } catch {
    schadenspunkte = []
  }

  const ausgabeDaten: AusgabeEntwurfDaten = {
    datumUhrzeit: String(formData.get("datumUhrzeit") ?? ""),
    kilometerstand: String(formData.get("kilometerstand") ?? ""),
    tankfuellung: String(formData.get("tankfuellung") ?? ""),
    ort: String(formData.get("ort") ?? ""),
    uebergebenDurch: String(formData.get("uebergebenDurch") ?? ""),
    fuehrerschein: formData.get("fuehrerschein") === "on",
    zustand: {
      karosserie: String(formData.get("zustand_karosserie") ?? ""),
      scheiben: String(formData.get("zustand_scheiben") ?? ""),
      reifen: String(formData.get("zustand_reifen") ?? ""),
      innenraum: String(formData.get("zustand_innenraum") ?? ""),
      bordwerkzeug: String(formData.get("zustand_bordwerkzeug") ?? ""),
      fahrzeugpapiere: String(formData.get("zustand_fahrzeugpapiere") ?? ""),
      ladekabel: String(formData.get("zustand_ladekabel") ?? ""),
    } as AusgabeEntwurfDaten["zustand"],
    vorschaeden: String(formData.get("vorschaeden") ?? ""),
    schadenspunkte,
  }

  const ausgabeFelder = ausgabeDatenZuFeldern(ausgabeDaten, {
    fahrzeugText: `${ausleihe.fahrzeug.bezeichnung} (${ausleihe.fahrzeug.kennzeichen})`,
    mieterName: `${ausleihe.entleiher.vorname} ${ausleihe.entleiher.nachname}`,
    bezugVertragsdatum: `Ausleihe ${ausleihe.vorgangsnummer}`,
  })

  const ruecknahmeDaten = ausleihe.ruecknahmeprotokollEntwurfDaten as RuecknahmeEntwurfDaten | null
  const ruecknahmeFelder = ruecknahmeDaten ? ruecknahmeDatenZuFeldern(ruecknahmeDaten) : undefined

  const pdfBytes = await uebergabeprotokollPdfErzeugen(ausgabeFelder, ruecknahmeFelder)

  const relativerPfad = `uebergabeprotokoll-entwuerfe/${ausleiheId}-ausgabe.pdf`
  await dateiAblegen(relativerPfad, pdfBytes)
  await prisma.ausleihe.update({
    where: { id: ausleiheId },
    data: {
      ausgabeprotokollEntwurfPfad: relativerPfad,
      ausgabeprotokollEntwurfDaten: ausgabeDaten,
    },
  })

  redirect(`/ausleihen/${ausleiheId}`)
}

export default async function UebergabeprotokollAnlegenSeite({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { fahrzeug: true, entleiher: true },
  })

  if (!ausleihe) {
    notFound()
  }

  // Bei "Übergabeprotokoll bearbeiten" stehen hier die zuletzt eingegebenen
  // Werte — sonst müsste man nach dem ersten Entwurf alles noch einmal
  // eintippen.
  const gespeichert = ausleihe.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null

  // Beim allerersten Anlegen (noch keine gespeicherten Werte) startet
  // Datum/Uhrzeit mit dem Ausleihe-Beginn um Mitternacht — meist stimmt das
  // schon, "Jetzt" bleibt für den tatsächlichen Übergabezeitpunkt.
  const datumUhrzeitStandard =
    gespeichert?.datumUhrzeit || datumUmMitternachtFuerDatumUhrzeitFeld(ausleihe.geplantVon)

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <p className="text-sm text-sekundaer">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-ueberschrift">Übergabeprotokoll</h1>

      <dl className="mt-4 flex flex-col gap-2 text-sm text-primaer">
        <div className="flex justify-between">
          <dt>Fahrzeug</dt>
          <dd className="font-medium text-primaer">
            {ausleihe.fahrzeug.bezeichnung} ({ausleihe.fahrzeug.kennzeichen})
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Mieter/in</dt>
          <dd className="font-medium text-primaer">
            {ausleihe.entleiher.vorname} {ausleihe.entleiher.nachname}
          </dd>
        </div>
        {ausleihe.fahrerName && (
          <div className="flex justify-between">
            <dt>Fahrer</dt>
            <dd className="font-medium text-primaer">{ausleihe.fahrerName}</dd>
          </div>
        )}
      </dl>

      <Hinweis>
        Dies erzeugt einen ausgefüllten PDF-Entwurf für die Übergabe — noch
        keine Unterschrift, kein rechtsverbindliches Protokoll. Das entsteht
        erst bei der eigentlichen Übergabe.
      </Hinweis>

      <form action={protokollEntwurfErzeugen} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="ausleiheId" value={ausleihe.id} />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-sekundaer">Angaben zur Übergabe</h2>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="fuehrerschein"
              required
              defaultChecked={gespeichert?.fuehrerschein ?? false}
            />
            Führerschein kontrolliert — Klasse ausreichend für dieses Fahrzeug
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Datum, Uhrzeit</span>
            <DatumUhrzeitFeld name="datumUhrzeit" required defaultValue={datumUhrzeitStandard} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Kilometerstand</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="kilometerstand"
                required
                min={0}
                defaultValue={gespeichert?.kilometerstand}
                className="min-w-0 flex-1 rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
              />
              <span className="shrink-0 text-sm text-tertiaer">km</span>
            </div>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">Tankfüllung</legend>
            <div className="flex flex-wrap gap-3">
              {TANKFUELLUNG_OPTIONEN.map((option) => (
                <label key={option.wert} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="tankfuellung"
                    value={option.wert}
                    required
                    defaultChecked={gespeichert?.tankfuellung === option.wert}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Ort der Übergabe</span>
            <input
              type="text"
              name="ort"
              required
              defaultValue={gespeichert?.ort}
              className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Übergeben durch</span>
            <input
              type="text"
              name="uebergebenDurch"
              required
              defaultValue={gespeichert?.uebergebenDurch || kontext.name}
              className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>
        </div>

        <ZustandUndVorschaeden
          anfangsZustand={gespeichert?.zustand}
          anfangsVorschaeden={gespeichert?.vorschaeden}
          anfangsSchadenspunkte={gespeichert?.schadenspunkte}
        />

        <button
          type="submit"
          className="rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
        >
          PDF-Entwurf erzeugen
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
