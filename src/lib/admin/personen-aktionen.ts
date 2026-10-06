"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { kalendertagAusEingabe } from "@/lib/datum"

/**
 * Gemeinsames Startpasswort für alle im Adminbereich neu angelegten bzw.
 * zurückgesetzten Zugänge — sicher trotz geteiltem Passwort, weil danach
 * ein Passwortwechsel erzwungen wird (siehe personWechselErforderlich-Feld
 * am Model Person und die Umleitung in berechtigung()). Bewusst aus der
 * Umgebung statt hartkodiert (keine Geheimnisse im Code/Repository) — und
 * hier ANDERS als bei SEED_PASSWORT (Entwicklungs-Fallback "start-1234")
 * OHNE Fallback: das hier läuft im echten Betrieb, ein stillschweigend
 * geratener Produktionswert wäre gefährlicher als ein klarer Abbruch.
 */
function standardStartpasswort(): string {
  const wert = process.env.STANDARD_STARTPASSWORT
  if (!wert) {
    throw new Error("STANDARD_STARTPASSWORT fehlt in der Umgebung (.env) — bitte zuerst dort eintragen.")
  }
  return wert
}

/**
 * Für den Benutzernamen: Kleinschreibung, Umlaute ausgeschrieben (keine
 * Sonderzeichen im Login), Leerzeichen (bei Zweit-/Doppelnamen im
 * Vorname-Feld, z. B. "Jonas Heinz") werden zu Bindestrichen —
 * "jonas-heinz.freudenberg@tz" statt "jonas heinz.freudenberg@tz".
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
 * Legt eine neue Person MIT Zugang an (Benutzername + Startpasswort) —
 * anders als z. B. Kalender-Teilnehmer, die nur als Datensatz ohne Zugang
 * existieren (siehe Baustein 1: "alle anderen existieren als Datensatz,
 * aber ohne Zugang"). Der Adminbereich ist gerade dafür da, echten Zugang
 * zu vergeben.
 *
 * Der Benutzername wird automatisch aus Vorname, Nachname und
 * Abteilungskürzel zusammengesetzt (vorname.nachname@kuerzel) — weder
 * Personalnummer noch E-Mail werden dafür gebraucht (siehe Kommentar am
 * Model Person): jede Person kann ihn sich aus dem eigenen Namen und der
 * eigenen Abteilung selbst herleiten, ohne dass ihr wer eine zugewiesene
 * Nummer mitteilen muss. Kollidiert er (gleicher Name, gleiche Abteilung),
 * bricht die Aktion mit einer Fehlermeldung ab — die Admin trägt dann im
 * Vorname-Feld den vollständigen Vornamen inkl. Zweitname ein (z. B. "Jonas
 * Heinz" statt "Jonas") und versucht es erneut.
 *
 * Kein Standort hier: manche Personen lassen sich keinem festen Standort
 * zuordnen, sie bekommen ihren Einsatzort stattdessen über mehrere Gruppen
 * verschiedener Standorte (siehe Kommentar am Model Gruppe). Wer doch einen
 * festen Standort braucht, bekommt ihn nachträglich über "Bearbeiten"
 * (zugehoerigkeitHinzufuegen) — das fragt Standort weiterhin ab.
 *
 * Gibt Benutzername und Klartextpasswort einmalig zurück, statt sie zu
 * speichern oder zu loggen — die aufrufende Seite zeigt beides einmalig an.
 * Deshalb KEIN `redirect()` wie sonst in diesem Projekt üblich (der
 * Rückgabewert ginge dabei verloren) — wird direkt aus einer
 * Client-Komponente aufgerufen, nicht über `<form action>`.
 */
export async function personErstellen(
  formData: FormData,
): Promise<{ personId: string; benutzername: string; passwort: string }> {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const vorname = String(formData.get("vorname") ?? "").trim()
  const nachname = String(formData.get("nachname") ?? "").trim()
  const abteilungId = String(formData.get("abteilungId") ?? "")

  if (!vorname || !nachname || !abteilungId) {
    throw new Error("Bitte Vorname, Nachname und Abteilung ausfüllen.")
  }

  const abteilung = await prisma.abteilung.findUnique({ where: { id: abteilungId } })
  if (!abteilung?.kuerzel) {
    throw new Error(
      "Diese Abteilung hat noch kein Kürzel für den Benutzernamen — bitte zuerst unter Gruppen & Abteilungen ergänzen.",
    )
  }

  const benutzername = `${nameNormalisieren(vorname)}.${nameNormalisieren(nachname)}@${abteilung.kuerzel}`

  const vorhanden = await prisma.person.findUnique({ where: { benutzername } })
  if (vorhanden) {
    throw new Error(
      `Der Benutzername "${benutzername}" ist schon vergeben. Bitte im Vorname-Feld einen zweiten Vornamen ergänzen (z. B. "Jonas Heinz" statt "Jonas"), um ihn eindeutig zu machen.`,
    )
  }

  const passwort = standardStartpasswort()

  const person = await prisma.person.create({
    data: {
      vorname,
      nachname,
      benutzername,
      passwortHash: await bcrypt.hash(passwort, 10),
      passwortWechselErforderlich: true,
      eintrittAm: kalendertagAusEingabe(formData.get("eintrittAm")),
      zugehoerigkeiten: { create: { abteilungId } },
    },
  })

  // Jede neue Person automatisch in die Gruppe "Alle" (Gruppe.automatisch)
  // — die läuft komplett über die normale PersonGruppe-Mitgliedschaft,
  // taucht deshalb ohne weiteres Zutun in jeder Empfänger-/Mitglieder-Liste
  // auf, die Gruppen einbezieht (Infos, Formulare, Wissen, Chat-Gruppen).
  const alleGruppe = await prisma.gruppe.findFirst({ where: { automatisch: true } })
  if (alleGruppe) {
    await prisma.personGruppe.create({ data: { personId: person.benutzername, gruppeId: alleGruppe.id } })
  }

  revalidatePath("/admin/benutzer")
  revalidatePath("/admin")
  return { personId: person.benutzername, benutzername, passwort }
}

/**
 * Setzt das gemeinsame Startpasswort zurück. Regel 4 (nie löschen) gilt
 * sinngemäß auch für den Zugang: Zugang sperren läuft über
 * `personAktivSetzen`, ein zurückgesetztes Passwort allein sperrt niemanden
 * aus, der es kennt.
 */
export async function personPasswortZuruecksetzen(personId: string): Promise<string> {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const passwort = standardStartpasswort()
  await prisma.person.update({
    where: { benutzername: personId },
    data: { passwortHash: await bcrypt.hash(passwort, 10), passwortWechselErforderlich: true },
  })

  revalidatePath("/admin/benutzer")
  return passwort
}

/** Regel 4: Person wird nie gelöscht, nur deaktiviert. */
export async function personAktivSetzen(personId: string, aktiv: boolean) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  await prisma.person.update({
    where: { benutzername: personId },
    data: { aktiv, deaktiviertAm: aktiv ? null : new Date() },
  })

  revalidatePath("/admin/benutzer")
  revalidatePath("/admin")
}

export type PersonSpeichernErgebnis = { ok: boolean; fehler?: string }

/**
 * Speichert ALLES, was im Bearbeiten-Pop-Up einer Person steht, in einem
 * Rutsch (Rückmeldung 2026-10-06: ein Speichern-Knopf unten statt einer je
 * Abschnitt): Benutzername, Eintrittsdatum, Gruppen, Berechtigungen, beendete
 * und neue Zugehörigkeiten. Alles läuft in EINER Transaktion — entweder wird
 * alles gespeichert oder nichts.
 *
 * Der Benutzername ist der Primärschlüssel (siehe Model Person); die
 * Fremdschlüssel laufen mit onUpdate: Cascade, Postgres schreibt also jede
 * referenzierende Zeile (Zugehoerigkeit, Ausleihe, Termin, ...) automatisch
 * um. Deshalb kommt die Umbenennung als LETZTER Schritt: Alle anderen
 * Änderungen laufen noch unter dem alten Namen. Ein bereits vergebener Name
 * wird vorab geprüft und als Fehlertext zurückgegeben (statt die Seite mit
 * einer Fehlerseite abzubrechen) — dann ist noch nichts gespeichert.
 *
 * `Gruppen` lässt die automatische Gruppe "Alle" unangetastet (sie steht gar
 * nicht erst als Checkbox im Formular, ein `notIn`-Löschen ohne den Zusatz
 * würde sie sonst bei jedem Speichern entfernen). Zugehörigkeiten werden nie
 * gelöscht, sondern zum heutigen Tag beendet (die Historie bleibt).
 */
export async function personSpeichern(
  personId: string,
  _vorher: PersonSpeichernErgebnis | null,
  formData: FormData,
): Promise<PersonSpeichernErgebnis> {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const neuerName = String(formData.get("benutzername") ?? "").trim()
  if (!neuerName) return { ok: false, fehler: "Der Benutzername darf nicht leer sein." }
  if (neuerName !== personId) {
    const vorhanden = await prisma.person.findUnique({ where: { benutzername: neuerName }, select: { benutzername: true } })
    if (vorhanden) return { ok: false, fehler: `Der Benutzername "${neuerName}" ist schon vergeben.` }
  }

  const gruppenIds = formData.getAll("gruppen").map(String)
  const berechtigungIds = formData.getAll("berechtigungen").map(String)
  const zuBeenden = formData.getAll("zugehoerigkeitBeenden").map(String)
  const standortId = String(formData.get("standortId") ?? "")
  const abteilungId = String(formData.get("abteilungId") ?? "")

  await prisma.$transaction([
    prisma.person.update({
      where: { benutzername: personId },
      data: { eintrittAm: kalendertagAusEingabe(formData.get("eintrittAm")) },
    }),

    prisma.personGruppe.deleteMany({
      where: { personId, gruppeId: { notIn: gruppenIds }, gruppe: { automatisch: false } },
    }),
    ...gruppenIds.map((gruppeId) =>
      prisma.personGruppe.upsert({
        where: { personId_gruppeId: { personId, gruppeId } },
        update: {},
        create: { personId, gruppeId },
      }),
    ),

    prisma.personBerechtigung.deleteMany({ where: { personId, berechtigungId: { notIn: berechtigungIds } } }),
    ...berechtigungIds.map((berechtigungId) =>
      prisma.personBerechtigung.upsert({
        where: { personId_berechtigungId: { personId, berechtigungId } },
        update: {},
        create: { personId, berechtigungId },
      }),
    ),

    // Nur Zugehörigkeiten DIESER Person (die IDs kommen aus dem Browser).
    prisma.zugehoerigkeit.updateMany({
      where: { id: { in: zuBeenden }, personId },
      data: { bisDatum: new Date() },
    }),
    ...(standortId && abteilungId
      ? [
          prisma.zugehoerigkeit.upsert({
            where: { personId_standortId_abteilungId: { personId, standortId, abteilungId } },
            update: { bisDatum: null },
            create: { personId, standortId, abteilungId },
          }),
        ]
      : []),

    ...(neuerName !== personId
      ? [prisma.person.update({ where: { benutzername: personId }, data: { benutzername: neuerName } })]
      : []),
  ])

  revalidatePath("/admin/benutzer")
  return { ok: true }
}
