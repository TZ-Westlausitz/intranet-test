"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"

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
      zugehoerigkeiten: { create: { abteilungId } },
    },
  })

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

/**
 * Benutzername nachträglich ändern — die automatische Zusammensetzung
 * greift nur beim Anlegen (personErstellen). Vor allem gedacht, um
 * Alt-Logins (noch mit Personalnummer aus der Zeit vor der Umstellung,
 * siehe Kommentar am Model Person) auf das neue Format zu bringen.
 */
export async function personBenutzernameAktualisieren(personId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const benutzername = String(formData.get("benutzername") ?? "").trim()
  if (!benutzername) return

  const vorhanden = await prisma.person.findUnique({ where: { benutzername } })
  if (vorhanden && vorhanden.benutzername !== personId) {
    throw new Error(`Der Benutzername "${benutzername}" ist schon vergeben.`)
  }

  // benutzername ist der Primärschlüssel (siehe Model Person) — dieses
  // Update ändert also den Primärschlüssel selbst. Die Fremdschlüssel-
  // Relationen auf Person laufen mit onUpdate: Cascade, deshalb schreibt
  // Postgres automatisch jede referenzierende Zeile (Zugehoerigkeit,
  // Ausleihe, Termin, ...) auf den neuen Wert um.
  await prisma.person.update({ where: { benutzername: personId }, data: { benutzername } })

  revalidatePath("/admin/benutzer")
}

/**
 * Ergänzt eine weitere Zugehörigkeit (Standort × Abteilung) — eine
 * Person kann mehrere gleichzeitig haben, siehe Kommentar am Model
 * Zugehoerigkeit ("Mehrfachstandorte kommen vor"). Anders als beim Anlegen
 * (personErstellen) wird der Standort hier weiterhin abgefragt: wer über
 * "Bearbeiten" gezielt einen festen Standort ergänzen will, kann das.
 */
export async function zugehoerigkeitHinzufuegen(personId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const standortId = String(formData.get("standortId") ?? "")
  const abteilungId = String(formData.get("abteilungId") ?? "")
  if (!standortId || !abteilungId) return

  await prisma.zugehoerigkeit.upsert({
    where: { personId_standortId_abteilungId: { personId, standortId, abteilungId } },
    update: { bisDatum: null },
    create: { personId, standortId, abteilungId },
  })

  revalidatePath("/admin/benutzer")
}

/** Beendet eine Zugehörigkeit zum heutigen Tag statt sie zu löschen — die Historie bleibt nachvollziehbar. */
export async function zugehoerigkeitBeenden(zugehoerigkeitId: string) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  await prisma.zugehoerigkeit.update({ where: { id: zugehoerigkeitId }, data: { bisDatum: new Date() } })

  revalidatePath("/admin/benutzer")
}

/** Ersetzt die komplette Gruppen-Zuordnung einer Person durch die im Formular angehakten Gruppen. */
export async function personGruppenAktualisieren(personId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const gruppenIds = formData.getAll("gruppen").map(String)

  await prisma.$transaction([
    prisma.personGruppe.deleteMany({ where: { personId, gruppeId: { notIn: gruppenIds } } }),
    ...gruppenIds.map((gruppeId) =>
      prisma.personGruppe.upsert({
        where: { personId_gruppeId: { personId, gruppeId } },
        update: {},
        create: { personId, gruppeId },
      }),
    ),
  ])

  revalidatePath("/admin/benutzer")
}

/** Ersetzt die komplette Berechtigungs-Zuordnung einer Person durch die im Formular angehakten Berechtigungen. */
export async function personBerechtigungenAktualisieren(personId: string, formData: FormData) {
  await berechtigung({ benoetigteBerechtigung: "Adminbereich" })

  const berechtigungIds = formData.getAll("berechtigungen").map(String)

  await prisma.$transaction([
    prisma.personBerechtigung.deleteMany({ where: { personId, berechtigungId: { notIn: berechtigungIds } } }),
    ...berechtigungIds.map((berechtigungId) =>
      prisma.personBerechtigung.upsert({
        where: { personId_berechtigungId: { personId, berechtigungId } },
        update: {},
        create: { personId, berechtigungId },
      }),
    ),
  ])

  revalidatePath("/admin/benutzer")
}
