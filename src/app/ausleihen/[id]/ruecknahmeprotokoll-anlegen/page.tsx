import { notFound, redirect } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiAblegen } from "@/lib/ablage"
import {
  ausgabeDatenZuFeldern,
  ruecknahmeDatenZuFeldern,
  uebergabeprotokollPdfErzeugen,
  type AusgabeEntwurfDaten,
  type RuecknahmeEntwurfDaten,
  type Schadenspunkt,
} from "@/lib/pdf/uebergabeprotokoll"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"
import { DatumUhrzeitFeld } from "@/components/datum-uhrzeit-feld"
import { RuecknahmeBewertung } from "@/components/ruecknahme-bewertung"

/**
 * Rücknahmeprotokoll vorbereiten — zweite Hälfte desselben
 * Übergabeprotokoll-Entwurfs (siehe lib/pdf/uebergabeprotokoll.ts). Setzt
 * voraus, dass die Ausgabe bereits echt unterschrieben ist (Status
 * UEBERGEBEN): Vorher gab es noch kein rechtsverbindliches Fahrzeug
 * unterwegs, für das eine Rückgabe überhaupt Sinn ergäbe (Regel 3: genau
 * zwei Übergabeprotokolle, AUSGABE zuerst).
 *
 * Zustand & Skizze starten mit einer Zusammenfassung der Vorschäden statt
 * sie zu wiederholen — siehe Kommentar in components/ruecknahme-bewertung.tsx
 * und components/zustand-und-vorschaeden.tsx.
 */

async function ruecknahmeprotokollEntwurfErzeugen(formData: FormData) {
  "use server"

  await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  const ausleihe = await prisma.ausleihe.findUniqueOrThrow({
    where: { id: ausleiheId },
    include: { fahrzeug: true, entleiher: true },
  })

  const ausgabeDaten = ausleihe.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null
  if (ausleihe.status !== AusleiheStatus.UEBERGEBEN || !ausgabeDaten) {
    // Über die UI nicht erreichbar — der Button erscheint erst, wenn die
    // Ausgabe unterschrieben ist. Kein Fehlertext nötig, nur kein
    // Fortschreiben ohne Grundlage.
    redirect(`/ausleihen/${ausleiheId}`)
  }

  let schadenspunkte: Schadenspunkt[] = []
  try {
    const eingabe = JSON.parse(String(formData.get("schadenspunkte") ?? "[]"))
    if (Array.isArray(eingabe)) schadenspunkte = eingabe
  } catch {
    schadenspunkte = []
  }

  const ruecknahmeDaten: RuecknahmeEntwurfDaten = {
    datumUhrzeit: String(formData.get("datumUhrzeit") ?? ""),
    kilometerstand: String(formData.get("kilometerstand") ?? ""),
    tankfuellung: String(formData.get("tankfuellung") ?? ""),
    ort: String(formData.get("ort") ?? ""),
    entgegengenommenDurch: String(formData.get("entgegengenommenDurch") ?? ""),
    zustand: {
      karosserie: String(formData.get("zustand_karosserie") ?? ""),
      scheiben: String(formData.get("zustand_scheiben") ?? ""),
      reifen: String(formData.get("zustand_reifen") ?? ""),
      innenraum: String(formData.get("zustand_innenraum") ?? ""),
      bordwerkzeug: String(formData.get("zustand_bordwerkzeug") ?? ""),
      fahrzeugpapiere: String(formData.get("zustand_fahrzeugpapiere") ?? ""),
      ladekabel: String(formData.get("zustand_ladekabel") ?? ""),
    } as RuecknahmeEntwurfDaten["zustand"],
    schaeden: String(formData.get("vorschaeden") ?? ""),
    abrechnung: {
      keineKosten: formData.get("abrechnung_keine_kosten") === "on",
      kraftstoffkosten: formData.get("abrechnung_kraftstoffkosten") === "on",
      schaden: formData.get("abrechnung_schaden") === "on",
    },
    schadenspunkte,
  }

  const ausgabeFelder = ausgabeDatenZuFeldern(ausgabeDaten, {
    fahrzeugText: `${ausleihe.fahrzeug.bezeichnung} (${ausleihe.fahrzeug.kennzeichen})`,
    mieterName: `${ausleihe.entleiher.vorname} ${ausleihe.entleiher.nachname}`,
    bezugVertragsdatum: `Ausleihe ${ausleihe.vorgangsnummer}`,
  })
  const ruecknahmeFelder = ruecknahmeDatenZuFeldern(ruecknahmeDaten)

  const pdfBytes = await uebergabeprotokollPdfErzeugen(ausgabeFelder, ruecknahmeFelder)

  const relativerPfad = `uebergabeprotokoll-entwuerfe/${ausleiheId}-ausgabe.pdf`
  await dateiAblegen(relativerPfad, pdfBytes)
  await prisma.ausleihe.update({
    where: { id: ausleiheId },
    data: {
      ausgabeprotokollEntwurfPfad: relativerPfad,
      ruecknahmeprotokollEntwurfDaten: ruecknahmeDaten,
    },
  })

  redirect(`/ausleihen/${ausleiheId}`)
}

export default async function RuecknahmeprotokollAnlegenSeite({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const kontext = await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })

  const { id } = await params

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id },
    include: { fahrzeug: true, entleiher: true },
  })

  const ausgabeDaten = ausleihe?.ausgabeprotokollEntwurfDaten as AusgabeEntwurfDaten | null

  if (!ausleihe || ausleihe.status !== AusleiheStatus.UEBERGEBEN || !ausgabeDaten) {
    notFound()
  }

  const gespeichert = ausleihe.ruecknahmeprotokollEntwurfDaten as RuecknahmeEntwurfDaten | null

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <p className="text-sm text-sekundaer">Ausleihe {ausleihe.vorgangsnummer}</p>
      <h1 className="text-2xl font-semibold text-ueberschrift">Rücknahmeprotokoll</h1>

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
        Dies erzeugt einen ausgefüllten PDF-Entwurf für die Rücknahme — noch
        keine Unterschrift, kein rechtsverbindliches Protokoll. Das entsteht
        erst bei der eigentlichen Rücknahme.
      </Hinweis>

      <form action={ruecknahmeprotokollEntwurfErzeugen} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="ausleiheId" value={ausleihe.id} />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-sekundaer">Angaben zur Rücknahme</h2>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Datum, Uhrzeit</span>
            <DatumUhrzeitFeld name="datumUhrzeit" required defaultValue={gespeichert?.datumUhrzeit} />
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

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Ort der Rückgabe</span>
            <input
              type="text"
              name="ort"
              required
              defaultValue={gespeichert?.ort}
              className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Rücknahme entgegengenommen durch:</span>
            <input
              type="text"
              name="entgegengenommenDurch"
              required
              defaultValue={gespeichert?.entgegengenommenDurch || kontext.name}
              className="rounded-lg border border-flaeche-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>
        </div>

        <RuecknahmeBewertung
          ausgabeTankfuellung={ausgabeDaten.tankfuellung}
          anfangsTankfuellung={gespeichert?.tankfuellung}
          vorherigeSchadenspunkte={ausgabeDaten.schadenspunkte}
          anfangsZustand={gespeichert?.zustand}
          anfangsVorschaeden={gespeichert?.schaeden}
          anfangsSchadenspunkte={gespeichert?.schadenspunkte}
          anfangsAbrechnung={gespeichert?.abrechnung}
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
