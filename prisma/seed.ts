import { createHash } from "node:crypto"

import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

import { PrismaClient } from "../src/generated/prisma/client"
import { DokumentArt } from "../src/generated/prisma/enums"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

/**
 * Grunddaten für die Entwicklung.
 *
 * Mehrfach ausführbar (upsert), damit man die Datenbank jederzeit neu
 * befüllen kann, ohne sie vorher zu leeren.
 */

const STANDORTE = [
  { name: "Kamenz", kuerzel: "KM" },
  { name: "Schwepnitz", kuerzel: "SW" },
  { name: "Königsbrück", kuerzel: "KB" },
  { name: "Pulsnitz", kuerzel: "PU" },
  { name: "Ohorn", kuerzel: "OH" },
]

// Echte Abteilungen aus "Gruppen, Berechtigung, Abteilung, Orte.pdf"
// (Rollenmodell-Übersicht des Altsystems app.ueberblick.io). `kuerzel` fürs
// automatisch zusammengesetzte vorname.nachname@kuerzel (siehe
// personErstellen) — Jonas' eigener Vorschlag.
const ABTEILUNGEN = [
  { name: "Geschäftsführung", kuerzel: "gf" },
  { name: "Pflegezentrum", kuerzel: "pz" },
  { name: "Servicezentrum", kuerzel: "sz" },
  { name: "Therapiezentrum", kuerzel: "tz" },
]

// Gruppen aus derselben Übersicht — feinere, freie Mehrfachzuordnung
// unabhängig von Abteilung/Standort/Rolle (siehe Kommentar am Model
// Gruppe). 1:1 übernommen, damit echte Mitarbeitende später nahtlos
// migriert werden können; zwei offensichtliche Klammer-Tippfehler der
// Vorlage sind hier korrigiert (Rezeption/Praxisleitung Königsbrück).
const GRUPPEN = [
  "All",
  "Ambulanz (Kamenz)",
  "Ambulanz (Königsbrück)",
  "Bereichsleitung (Pflege)",
  "Bereichsleitung (Therapie)",
  "BEWO (Ohorn)",
  "Buchhaltung",
  "Büro (Pflege)",
  "Ergo (Kamenz)",
  "Ergo (Königsbrück)",
  "Fahrdienst",
  "Geschäftsleitung Büro KM",
  "Hausmeister",
  "Hauswirtschaft",
  "Intensivpflege",
  "Logo (Kamenz)",
  "Logo (Königsbrück)",
  "Pflegedienstleitung",
  "Physio (Kamenz)",
  "Physio (Königsbrück)",
  "Physio (Pulsnitz)",
  "Physio (Schwepnitz)",
  "Podo (Kamenz)",
  "Podo (Königsbrück)",
  "Praxis (Kamenz)",
  "Praxis (Königsbrück)",
  "Praxis (Pulsnitz)",
  "Praxis (Schwepnitz)",
  "Praxisleitung (Kamenz)",
  "Praxisleitung (Königsbrück)",
  "Praxisleitung (Pulsnitz)",
  "Praxisleitung (Schwepnitz)",
  "Rechtsabteilung",
  "Rezeption (Kamenz)",
  "Rezeption (Königsbrück)",
  "Rezeption (Pulsnitz)",
  "Rezeption (Schwepnitz)",
  "Teamleitung (Ambulanz)",
  "Teamleitung (Intensivpflege)",
  "Teamleitung (Hauswirtschaft)",
  "Teamleitung (Ohorn)",
  "Teamleitung (WG Kamenz)",
  "Teamleitung (WG Königsbrück)",
  "Training (Kamenz)",
  "WG (Kamenz)",
  "WG (Königsbrück)",
]

// Berechtigungen aus derselben Übersicht — feature-bezogene Freischaltung
// pro Person, unabhängig von Rolle und Gruppe (siehe Kommentar am Model
// Berechtigung). "Werkstattleiter" und "Projektmanager" gab es im
// Altsystem noch nicht, sind aber schon für das neue System vorgesehen.
const BERECHTIGUNGEN = [
  "Admin",
  "Adminbereich",
  "Aufgaben",
  "Bearbeiten",
  "Infos",
  "Löschen & Bearbeiten",
  "Meldestelle",
  "Wiederkehrende Aufgaben",
  "Wissensartikel anlegen",
  "Wissensmanager",
  "Werkstattleiter",
  "Projektmanager",
]

// Orte aus derselben Übersicht — feinere Orte innerhalb eines Standorts
// (siehe Kommentar am Model Ort), z. B. für eine künftige Orts-Auswahl bei
// Terminen statt Freitext.
const ORTE = [
  "Halle Jesau",
  "Kamenz - Büro Bauhofgäßchen",
  "Kamenz - Büro Oststraße",
  "Kamenz - Praxis",
  "Kamenz - Ambulanz",
  "Kamenz - Intensivpflege",
  "Kamenz - PflegeWG",
  "Königsbrück - Praxis",
  "Königsbrück - Pflege-WG",
  "Ohorn - BeWo",
  "Pulsnitz - Praxis",
  "Schwepnitz - Praxis",
]

async function main() {
  // --- Standorte und Abteilungen ------------------------------------------

  for (const s of STANDORTE) {
    await prisma.standort.upsert({
      where: { kuerzel: s.kuerzel },
      update: { name: s.name },
      create: s,
    })
  }

  for (const a of ABTEILUNGEN) {
    await prisma.abteilung.upsert({
      where: { name: a.name },
      update: { kuerzel: a.kuerzel },
      create: a,
    })
  }

  for (const name of GRUPPEN) {
    await prisma.gruppe.upsert({ where: { name }, update: {}, create: { name } })
  }

  // "Alle" — einzige Gruppe mit `automatisch: true` (siehe Kommentar am
  // Model Gruppe), bekommt am Ende dieses Skripts jede vorhandene Person
  // automatisch als Mitglied zugeordnet. Bewusst NICHT Teil der GRUPPEN-
  // Liste oben (das sind die 1:1 aus der Altsystem-PDF übernommenen
  // Gruppen, "Alle" ist neu und hat eine andere Bedeutung).
  await prisma.gruppe.upsert({
    where: { name: "Alle" },
    update: { automatisch: true },
    create: { name: "Alle", automatisch: true },
  })

  for (const name of BERECHTIGUNGEN) {
    await prisma.berechtigung.upsert({ where: { name }, update: {}, create: { name } })
  }

  for (const name of ORTE) {
    await prisma.ort.upsert({ where: { name }, update: {}, create: { name } })
  }

  const kamenz = await prisma.standort.findUniqueOrThrow({ where: { kuerzel: "KM" } })
  const servicezentrum = await prisma.abteilung.findUniqueOrThrow({ where: { name: "Servicezentrum" } })
  const fahrdienstGruppe = await prisma.gruppe.findUniqueOrThrow({ where: { name: "Fahrdienst" } })

  // --- Testkonto Werkstattleiter -------------------------------------------
  // Passwort aus der Umgebung, damit hier kein Geheimnis im Repository steht.
  // Bekommt zusätzlich die Berechtigungen "Werkstattleiter", "Adminbereich"
  // und "Admin", damit sich derselbe Testzugang auch im Fuhrpark-Modul und
  // im Adminbereich anmelden lässt, ohne einen zweiten Testnutzer zu
  // brauchen — in der Praxis kann eine Person durchaus mehrere
  // Berechtigungen gleichzeitig tragen.

  const startpasswort = process.env.SEED_PASSWORT ?? "start-1234"

  const werkstattleiter = await prisma.person.upsert({
    where: { benutzername: "1001" },
    update: {},
    create: {
      benutzername: "1001",
      vorname: "Test",
      nachname: "Werkstattleiter",
      passwortHash: await bcrypt.hash(startpasswort, 10),
      passwortWechselErforderlich: true,
      aktiv: true,
    },
  })

  await prisma.zugehoerigkeit.upsert({
    where: {
      personId_standortId_abteilungId: {
        personId: werkstattleiter.benutzername,
        standortId: kamenz.id,
        abteilungId: servicezentrum.id,
      },
    },
    update: {},
    create: {
      personId: werkstattleiter.benutzername,
      standortId: kamenz.id,
      abteilungId: servicezentrum.id,
    },
  })

  for (const name of ["Werkstattleiter", "Adminbereich", "Admin"]) {
    const testBerechtigung = await prisma.berechtigung.findUniqueOrThrow({ where: { name } })
    await prisma.personBerechtigung.upsert({
      where: { personId_berechtigungId: { personId: werkstattleiter.benutzername, berechtigungId: testBerechtigung.id } },
      update: {},
      create: { personId: werkstattleiter.benutzername, berechtigungId: testBerechtigung.id },
    })
  }

  await prisma.personGruppe.upsert({
    where: { personId_gruppeId: { personId: werkstattleiter.benutzername, gruppeId: fahrdienstGruppe.id } },
    update: {},
    create: { personId: werkstattleiter.benutzername, gruppeId: fahrdienstGruppe.id },
  })

  // --- Testfahrzeug ---------------------------------------------------------
  // >>> ANPASSEN: echte Kennzeichen und vor allem den echten
  //     Bruttolistenpreis — ohne ihn ist der geldwerte Vorteil nicht
  //     berechenbar.

  await prisma.fahrzeug.upsert({
    where: { kennzeichen: "KM-TP 100" },
    update: {},
    create: {
      kennzeichen: "KM-TP 100",
      bezeichnung: "VW Multivan",
      sitzplaetze: 8,
      merkmale: "8 Sitze, Anhängerkupplung",
      bruttolistenpreisCent: 6_000_000, // 60.000 € — PLATZHALTER
      kraftstoffart: "Diesel",
      tankgroesseLiter: 70,
      fuerPrivatausleiheFreigegeben: true,
      standortId: kamenz.id,
    },
  })

  await prisma.fahrzeug.upsert({
    where: { kennzeichen: "KM-TP 200" },
    update: {},
    create: {
      kennzeichen: "KM-TP 200",
      bezeichnung: "VW Caddy",
      sitzplaetze: 5,
      merkmale: "5 Sitze",
      bruttolistenpreisCent: 2_800_000, // 28.000 € — PLATZHALTER
      kraftstoffart: "Diesel",
      tankgroesseLiter: 55,
      fuerPrivatausleiheFreigegeben: true,
      standortId: kamenz.id,
    },
  })

  await prisma.fahrzeug.upsert({
    where: { kennzeichen: "KM-TP 300" },
    update: {},
    create: {
      kennzeichen: "KM-TP 300",
      bezeichnung: "VW Crafter",
      sitzplaetze: 9,
      merkmale: "9 Sitze, Rollstuhlrampe",
      bruttolistenpreisCent: 7_500_000, // 75.000 € — PLATZHALTER
      kraftstoffart: "Diesel",
      tankgroesseLiter: 75,
      fuerPrivatausleiheFreigegeben: true,
      standortId: kamenz.id,
    },
  })

  // --- Nutzungsvereinbarung, Version 1 -------------------------------------
  // Wortlaut aus "TuPZW-Fahrzeug-Nutzungsvereinbarung_ausfuellbar_1.pdf".
  // {{ENTLEIHER}}/{{FAHRER}}/{{FAHRZEUG}}/{{ZEITRAUM}} sind Merge-Platzhalter
  // für die Live-Vorschau bei "Fahrzeug mieten" — siehe anfrage-formular.tsx.
  // Ändert sich der Wortlaut der echten Vereinbarung, NICHT diese Version
  // anpassen, sondern Version 2 anlegen (Regel 1 in der CLAUDE.md).

  const dokument = await prisma.dokument.upsert({
    where: { id: "dok-nutzungsvereinbarung" },
    update: {},
    create: {
      id: "dok-nutzungsvereinbarung",
      titel: "Nutzungsvereinbarung Firmenfahrzeuge (privat)",
      art: DokumentArt.NUTZUNGSVEREINBARUNG,
    },
  })

  const nutzungsvereinbarungText = `
<h2>Fahrzeug-Nutzungsvereinbarung</h2>
<p><em>Private Nutzung von Fahrzeugen aus dem betrieblichen Fahrzeugpool</em></p>

<h3>1. Vertragsparteien</h3>
<p><strong>Vermieter:</strong> Therapie- und Pflegezentrum Westlausitz GmbH</p>
<p><strong>Mieter/in (Mitarbeiter/in):</strong> {{ENTLEIHER}}</p>
<p><strong>Fahrer, falls abweichend:</strong> {{FAHRER}}</p>

<h3>2. Fahrzeugdaten &amp; Nutzungszeitraum</h3>
<p><strong>Fahrzeug (Modell / Kennzeichen):</strong> {{FAHRZEUG}}</p>
<p><strong>Nutzungszeitraum (Von – Bis):</strong> {{ZEITRAUM}}</p>

<h3>3. Besondere Vereinbarungen &amp; Konditionen</h3>
<ul>
<li><strong>Kilometerregelung:</strong> Dem Mieter stehen während des gesamten Mietzeitraums unbegrenzte Kilometer zur Verfügung. Es erfolgt keine Nachberechnung von Fahrleistungskilometern.</li>
<li><strong>Tankregelung:</strong> Das Fahrzeug wird vollgetankt übergeben und ist von der Mieterin/dem Mieter vollgetankt (Kraftstoffart beachten!) zurückzugeben. Einzige anfallende Kosten der privaten Nutzung sind die selbst getankten Kraftstoffkosten; diese trägt die Mieterin/der Mieter vollständig selbst. Wird das Fahrzeug nicht vollgetankt zurückgegeben, wird der fehlende Kraftstoff der Mieterin/dem Mieter in Rechnung gestellt.</li>
<li><strong>Rauchverbot:</strong> Im gesamten Fahrzeug gilt ein absolutes und striktes Rauchverbot. Bei Missachtung behält sich Therapie- und Pflegezentrum Westlausitz das Recht vor, die Kosten für eine professionelle Innenraumreinigung und Geruchsbeseitigung der/dem verursachenden Mitarbeitenden in Rechnung zu stellen.</li>
<li><strong>Auslandsfahrten:</strong> Fahrten ins europäische Ausland sind nach vorheriger Rücksprache mit dem Vermieter möglich. Die Mieterin/der Mieter hat sicherzustellen, dass für die jeweiligen Zielländer die notwendigen Dokumente (z. B. grüne Versicherungskarte) im Fahrzeug mitgeführt werden.</li>
<li><strong>Versicherung &amp; Haftung (Selbstbehalt):</strong> Das Fahrzeug ist haftpflicht- und vollkaskoversichert. Im Schadensfall (selbstverschuldeter Unfall, Vandalismus oder Wildschaden) beträgt der maximale Selbstbehalt (SB) 1.000,- EUR pro Schadensereignis und geht zulasten der Mieterin/des Mieters, da es sich um eine private Fahrt handelt. Für Schäden durch grobe Fahrlässigkeit oder Vorsatz haftet die Mieterin/der Mieter unbeschränkt.</li>
<li><strong>Vorrang der betrieblichen Nutzung:</strong> Der betriebliche Bedarf (Fahrdienst, Handwerker, sonstige dienstliche Einsätze) hat grundsätzlich Vorrang vor der privaten Nutzung. Der Vermieter ist berechtigt, eine bereits bestätigte private Buchung bei kurzfristigem betrieblichem Bedarf abzusagen oder zu verschieben; die Mieterin/der Mieter wird hierüber so früh wie möglich informiert.</li>
</ul>

<h3>4. Pflichten der Mieterin / des Mieters &amp; Fahrzeugzustand</h3>
<ul>
<li>Die Mieterin/der Mieter bestätigt, das Fahrzeug vor Fahrtantritt auf Schäden geprüft zu haben. Bestehende Vorschäden sind im Übergabeprotokoll festzuhalten.</li>
<li>Das Fahrzeug darf nur von den im Vertrag eingetragenen Personen geführt werden.</li>
<li>Voraussetzung für die Übergabe ist ein gültiger Führerschein der für dieses Fahrzeug erforderlichen Klasse. Der Vermieter kontrolliert dies bei der Übergabe.</li>
<li>Beschädigungen, Unfälle oder technische Mängel sind unverzüglich dem Vermieter sowie der Geschäftsführung zu melden.</li>
<li>Nach Nutzungsende ist das Fahrzeug ordnungsgemäß am vereinbarten Ort abzustellen und der Fahrzeugschlüssel gemäß Übergaberegelung an den Vermieter zurückzugeben.</li>
</ul>

<p><em>Anlage: Bei jeder Übergabe und Rückgabe ist zusätzlich das Formular „TuPZW-Fahrzeug-Übergabeprotokoll" auszufüllen. Es ist Bestandteil dieser Vereinbarung.</em></p>

<p>Ort, Datum, Unterschrift Vermieter&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Ort, Datum, Unterschrift Mieter/in</p>
`.trim()

  await prisma.dokumentversion.upsert({
    where: {
      dokumentId_versionsnummer: { dokumentId: dokument.id, versionsnummer: 1 },
    },
    // Bewusst NICHT `update: {}`: In dieser frühen Entwicklungsphase (noch
    // keine echte Unterschrift, die auf diese Version zeigt) darf der Seed
    // den Text bei jedem Lauf auffrischen. Sobald real unterschrieben wird,
    // hier auf `update: {}` zurückstellen und stattdessen Version 2 anlegen.
    update: {
      inhaltHtml: nutzungsvereinbarungText,
      inhaltHash: hashe(nutzungsvereinbarungText),
    },
    create: {
      dokumentId: dokument.id,
      versionsnummer: 1,
      inhaltHtml: nutzungsvereinbarungText,
      inhaltHash: hashe(nutzungsvereinbarungText),
      selbstbeteiligungCent: 100_000, // 1.000 € — aus der echten Nutzungsvereinbarung
      gueltigAb: new Date(),
      freigegebenAm: new Date(),
      freigegebenVonId: werkstattleiter.benutzername,
      aenderungshinweis: "Erste Fassung (Wortlaut aus dem echten PDF)",
    },
  })

  // --- Übergabeprotokoll, Version 1 ----------------------------------------
  // Anders als bei der Nutzungsvereinbarung gibt es hier keinen Vertragstext
  // zum Mergen — `inhaltHtml` ist trotzdem Pflichtfeld auf `Dokumentversion`
  // und beschreibt hier schlicht, welche Vorlage gemeint ist. Jede
  // Unterschrift auf einem `Uebergabeprotokoll` zeigt auf diese Version.

  const uebergabeprotokollDokument = await prisma.dokument.upsert({
    where: { id: "dok-uebergabeprotokoll" },
    update: {},
    create: {
      id: "dok-uebergabeprotokoll",
      titel: "TuPZW-Fahrzeug-Übergabeprotokoll",
      art: DokumentArt.UEBERGABEPROTOKOLL,
    },
  })

  const uebergabeprotokollBeschreibung =
    "TuPZW-Fahrzeug-Übergabeprotokoll — Formular für Ausgabe und Rücknahme bei der privaten Fahrzeugausleihe."

  await prisma.dokumentversion.upsert({
    where: {
      dokumentId_versionsnummer: {
        dokumentId: uebergabeprotokollDokument.id,
        versionsnummer: 1,
      },
    },
    update: {},
    create: {
      dokumentId: uebergabeprotokollDokument.id,
      versionsnummer: 1,
      inhaltHtml: uebergabeprotokollBeschreibung,
      inhaltHash: hashe(uebergabeprotokollBeschreibung),
      gueltigAb: new Date(),
      freigegebenAm: new Date(),
      freigegebenVonId: werkstattleiter.benutzername,
      aenderungshinweis: "Erste Fassung",
    },
  })

  // --- Dummy-Personen ---------------------------------------------------
  // Nur zum Testen der Mitarbeiter-Auswahl bei Terminen (Kalender-Baustein)
  // — ohne Zugang (kein passwortHash), wie alle Personen außer Werkstatt-
  // leitung/Verwaltung. >>> ENTFERNEN, sobald echte Mitarbeitende im
  // System stehen.
  const schwepnitz = await prisma.standort.findUniqueOrThrow({ where: { kuerzel: "SW" } })
  const koenigsbrueck = await prisma.standort.findUniqueOrThrow({ where: { kuerzel: "KB" } })
  const pulsnitz = await prisma.standort.findUniqueOrThrow({ where: { kuerzel: "PU" } })
  const pflegezentrum = await prisma.abteilung.findUniqueOrThrow({ where: { name: "Pflegezentrum" } })
  const therapiezentrum = await prisma.abteilung.findUniqueOrThrow({ where: { name: "Therapiezentrum" } })
  const geschaeftsfuehrung = await prisma.abteilung.findUniqueOrThrow({ where: { name: "Geschäftsführung" } })

  const dummyPersonen = [
    { benutzername: "2001", vorname: "Anna", nachname: "Schmidt", standort: kamenz, abteilung: pflegezentrum },
    { benutzername: "2002", vorname: "Jonas", nachname: "Weber", standort: schwepnitz, abteilung: therapiezentrum },
    { benutzername: "2003", vorname: "Sophie", nachname: "Wagner", standort: kamenz, abteilung: geschaeftsfuehrung },
    { benutzername: "2004", vorname: "Lukas", nachname: "Becker", standort: koenigsbrueck, abteilung: servicezentrum },
    { benutzername: "2005", vorname: "Marie", nachname: "Hoffmann", standort: pulsnitz, abteilung: pflegezentrum },
  ]

  for (const d of dummyPersonen) {
    const person = await prisma.person.upsert({
      where: { benutzername: d.benutzername },
      update: {},
      create: {
        benutzername: d.benutzername,
        vorname: d.vorname,
        nachname: d.nachname,
        aktiv: true,
      },
    })

    await prisma.zugehoerigkeit.upsert({
      where: {
        personId_standortId_abteilungId: {
          personId: person.benutzername,
          standortId: d.standort.id,
          abteilungId: d.abteilung.id,
        },
      },
      update: {},
      create: {
        personId: person.benutzername,
        standortId: d.standort.id,
        abteilungId: d.abteilung.id,
      },
    })
  }

  // --- Aufräumen: alte geratene Abteilungen ---------------------------
  // Frühere Fassungen dieser Datei hatten "Therapie", "Pflege",
  // "Fahrdienst", "Verwaltung" als geratene Platzhalter angelegt (siehe
  // Git-Historie) — abgelöst durch die echten Abteilungen oben. Bereinigt
  // wird nur bei den TESTPERSONEN (1001, 2001–2005): Jonas Freudenbergs
  // echte Zugehörigkeit (1002) bleibt unangetastet, da real in Nutzung —
  // die zieht er sich bei Bedarf selbst im neuen Adminbereich um. Die
  // alten Abteilungen selbst werden nur deaktiviert, nicht gelöscht, weil
  // seine Zugehoerigkeit weiterhin darauf zeigt.
  const alteAbteilungsnamen = ["Therapie", "Pflege", "Fahrdienst", "Verwaltung"]
  const testBenutzernamen = ["1001", "2001", "2002", "2003", "2004", "2005"]

  const alteAbteilungen = await prisma.abteilung.findMany({ where: { name: { in: alteAbteilungsnamen } } })
  const alteAbteilungIds = alteAbteilungen.map((a) => a.id)

  if (alteAbteilungIds.length > 0) {
    await prisma.zugehoerigkeit.deleteMany({
      where: { abteilungId: { in: alteAbteilungIds }, person: { benutzername: { in: testBenutzernamen } } },
    })
    await prisma.abteilung.updateMany({ where: { id: { in: alteAbteilungIds } }, data: { aktiv: false } })
  }

  // "Verwaltung" bleibt deaktiviert (keine 5. wählbare Abteilung für neue
  // Personen — die vier echten reichen laut Jonas: Therapie/Pflege stecken
  // schon in ihren jeweiligen Zentren, Fahrdienst in Servicezentrum).
  // Bekommt aber ein Kürzel, damit die wenigen bestehenden Personen mit
  // dieser (alten) Zugehörigkeit — z. B. Jonas Freudenberg — bei Bedarf
  // trotzdem einen regulären vorname.nachname@vw-Benutzernamen bekommen
  // könnten.
  await prisma.abteilung.updateMany({ where: { name: "Verwaltung" }, data: { kuerzel: "vw" } })

  // Jede aktive Person der automatischen Gruppe "Alle" zuordnen — läuft
  // hier am Ende über ALLE Personen statt nur die gerade in diesem Skript
  // angelegten, damit auch ein erneuter Seed-Lauf gegen eine bereits
  // bestehende Datenbank (z. B. nach manuell im Adminbereich angelegten
  // Personen) vollständig aktuell bleibt.
  const alleGruppe = await prisma.gruppe.findUniqueOrThrow({ where: { name: "Alle" } })
  const aktivePersonen = await prisma.person.findMany({ where: { aktiv: true }, select: { benutzername: true } })
  for (const person of aktivePersonen) {
    await prisma.personGruppe.upsert({
      where: { personId_gruppeId: { personId: person.benutzername, gruppeId: alleGruppe.id } },
      update: {},
      create: { personId: person.benutzername, gruppeId: alleGruppe.id },
    })
  }

  console.log(`Fertig. Anmeldung: Benutzername 1001, Passwort "${startpasswort}"`)
}

function hashe(text: string): string {
  // Node-eigenes crypto, keine zusätzliche Abhängigkeit.
  return createHash("sha256").update(text, "utf8").digest("hex")
}

main()
  .catch((fehler) => {
    console.error(fehler)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
