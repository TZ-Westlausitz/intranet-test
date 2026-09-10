"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { berechtigung, NichtBerechtigt } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { richTextSanitisieren } from "@/lib/rich-text"
import { benachrichtigungErstellen } from "@/lib/benachrichtigungen/erstellen"
import { infoAnhaengePruefen, infoAnhaengeSpeichern, infoAnhangLoeschenIntern } from "@/lib/infos/anhaenge"
import {
  istInfoEmpfaenger,
  istGeschaeftsfuehrung,
  infoEmpfaengerIds,
  darfInfoBearbeiten,
  darfInfoLoeschen,
} from "@/lib/infos/sichtbarkeit"
import { UNTERNEHMENSNAME, infoDetailFuerPerson } from "@/lib/infos/abfragen"

function anhaengeAusFormData(formData: FormData, feldname = "anhaenge"): File[] {
  return formData.getAll(feldname).filter((wert): wert is File => wert instanceof File)
}

/**
 * Liest und validiert die Felder, die sich Erstellen und Bearbeiten teilen
 * (Titel, Inhalt, Kategorie, Empfänger ×3, Bestätigung/Kommentare,
 * Anhänge, Inline-Bilder) — `fehlerBasisPfad` ist die Seite, auf die bei
 * einem Validierungsfehler zurückgeleitet wird (`/newsfeed` beim Anlegen,
 * `/newsfeed/<id>` beim Bearbeiten). `entwurf: true` (siehe
 * infoAlsEntwurfSpeichern, Rückmeldung 2026-09-09) schaltet Titel-/
 * Empfänger-Pflicht ab — ein Entwurf darf unvollständig sein.
 */
async function infoFelderLesenOderFehler(formData: FormData, fehlerBasisPfad: string, opts?: { entwurf?: boolean }) {
  const entwurf = opts?.entwurf ?? false
  const titel = String(formData.get("titel") ?? "").trim()
  if (!titel && !entwurf) {
    redirect(`${fehlerBasisPfad}?fehler=pflichtfeld`)
  }

  const empfaengerPersonen = formData.getAll("empfaengerPersonen").map(String).filter(Boolean)
  const empfaengerGruppen = formData.getAll("empfaengerGruppen").map(String).filter(Boolean)
  const empfaengerAbteilungen = formData.getAll("empfaengerAbteilungen").map(String).filter(Boolean)
  if (empfaengerPersonen.length === 0 && empfaengerGruppen.length === 0 && empfaengerAbteilungen.length === 0 && !entwurf) {
    redirect(`${fehlerBasisPfad}?fehler=keinEmpfaenger`)
  }

  const inhalt = richTextSanitisieren(String(formData.get("inhalt") ?? "")) || null

  const kategorieIdEingabe = String(formData.get("kategorieId") ?? "")
  const kategorieId = kategorieIdEingabe || null
  if (kategorieId) {
    const kategorie = await prisma.infoKategorie.findUnique({ where: { id: kategorieId } })
    if (!kategorie?.aktiv) {
      redirect(`${fehlerBasisPfad}?fehler=pflichtfeld`)
    }
  }

  const mitBestaetigung = formData.get("mitBestaetigung") === "on"
  const kommentareErlaubt = formData.get("kommentareErlaubt") === "on"

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = infoAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`${fehlerBasisPfad}?fehler=${anhaengeFehler}`)
  }

  // Inline im Fließtext eingefügte Bilder (siehe RichTextEditor,
  // bilderErlaubt) — eigenes Formularfeld statt des normalen
  // "anhaenge"-Felds, damit die Reihenfolge zu den cids eindeutig bleibt
  // und nicht mit frei gewählten Datei-Anhängen kollidiert.
  const inlineBilder = anhaengeAusFormData(formData, "inlineBilder")
  const inlineCids = String(formData.get("inlineBilderCids") ?? "").split(",").filter(Boolean)
  const inlineBilderFehler = infoAnhaengePruefen(inlineBilder)
  if (inlineBilderFehler) {
    redirect(`${fehlerBasisPfad}?fehler=${inlineBilderFehler}`)
  }

  return {
    titel,
    inhalt,
    kategorieId,
    empfaengerPersonen,
    empfaengerGruppen,
    empfaengerAbteilungen,
    mitBestaetigung,
    kommentareErlaubt,
    neueAnhaenge,
    inlineBilder,
    inlineCids,
  }
}

/**
 * Speichert neu eingefügte Inline-Bilder und ersetzt ihre data-cid-Marker
 * im Inhalt durch den echten `src` (siehe RichTextEditor, bilderErlaubt,
 * und die Sanitizer-Erklärung in src/lib/rich-text.ts). Gibt den ggf.
 * angepassten Inhalt zurück, sonst unverändert das übergebene `inhalt` —
 * nur auflösen, wenn Anzahl der Dateien und cids exakt zusammenpassen
 * (eine Abweichung ist nur durch ein manipuliertes Formular möglich, dann
 * wird das Feld schlicht ignoriert statt falsch zugeordnet).
 */
async function inlineBilderAufloesenUndSpeichern(
  infoId: string,
  personId: string,
  inhalt: string | null,
  inlineBilder: File[],
  inlineCids: string[],
): Promise<string | null> {
  if (inlineBilder.length === 0 || inlineBilder.length !== inlineCids.length || !inhalt) {
    return inhalt
  }
  const gespeicherteBilder = await infoAnhaengeSpeichern(infoId, inlineBilder, personId, undefined, true)
  let aufgeloestesInhalt = inhalt
  gespeicherteBilder.forEach((anhang, index) => {
    const cid = inlineCids[index]
    aufgeloestesInhalt = aufgeloestesInhalt.replace(
      `data-cid="${cid}"`,
      `data-cid="${cid}" src="/api/infos/${infoId}/anhaenge/${anhang.id}"`,
    )
  })
  return aufgeloestesInhalt
}

/**
 * Legt eine Info an — Berechtigung "Infos" ist Voraussetzung fürs
 * Erstellen überhaupt (siehe Kommentar am Model Info). Mindestens ein
 * Empfänger (Person, Gruppe oder Abteilung) ist Pflicht, genau wie im
 * Altsystem.
 */
export async function infoErstellen(formData: FormData) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Infos" })

  const {
    titel,
    inhalt,
    kategorieId,
    empfaengerPersonen,
    empfaengerGruppen,
    empfaengerAbteilungen,
    mitBestaetigung,
    kommentareErlaubt,
    neueAnhaenge,
    inlineBilder,
    inlineCids,
  } = await infoFelderLesenOderFehler(formData, "/newsfeed")

  // NIE dem übermittelten Formularwert vertrauen (Regel 5) — der Schalter
  // wird zwar clientseitig nur bei entsprechender Zugehörigkeit angezeigt,
  // serverseitig aber unabhängig davon neu berechnet.
  const darfAlsUnternehmen = await istGeschaeftsfuehrung(kontext.personId)
  const alsUnternehmen = darfAlsUnternehmen && formData.get("alsUnternehmen") === "on"

  // "Geplant am" — ein Termin in der Vergangenheit/Gegenwart wird
  // stillschweigend wie "sofort" behandelt (kein Fehler, keine
  // Sondermeldung, robust gegen leicht abweichende Client-Uhren). Siehe
  // Kommentar an Info.veroeffentlichtAm: dieser Zeitpunkt entscheidet über
  // Sichtbarkeit UND Sortierung, wird hier einmalig eingefroren.
  const geplantAmRoh = String(formData.get("geplantAm") ?? "").trim()
  const jetzt = new Date()
  const geplantAmEingabe = geplantAmRoh ? new Date(geplantAmRoh) : null
  const istGeplant = geplantAmEingabe !== null && geplantAmEingabe > jetzt
  const geplantAm = istGeplant ? geplantAmEingabe : null
  const veroeffentlichtAm = istGeplant ? geplantAmEingabe! : jetzt

  // Umfrage — nur beim Anlegen möglich, siehe Kommentar am Model
  // InfoUmfrage. Wird hier (statt in infoFelderLesenOderFehler) gelesen,
  // weil infoAktualisieren sie nie anfassen soll.
  const umfrageAktiv = formData.get("umfrageAktiv") === "on"
  const umfrageMehrfachauswahl = formData.get("umfrageMehrfachauswahl") === "on"
  const umfrageFrage = String(formData.get("umfrageFrage") ?? "").trim() || null
  const umfrageOptionen = umfrageAktiv
    ? formData
        .getAll("umfrageOptionen")
        .map(String)
        .map((option) => option.trim())
        .filter(Boolean)
    : []
  if (umfrageAktiv && umfrageOptionen.length < 2) {
    redirect(`/newsfeed?fehler=umfrageZuWenigOptionen`)
  }

  const info = await prisma.info.create({
    data: {
      titel,
      inhalt,
      kategorieId,
      mitBestaetigung,
      kommentareErlaubt,
      alsUnternehmen,
      geplantAm,
      veroeffentlichtAm,
      erstelltVonId: kontext.personId,
      empfaengerPersonen: { create: empfaengerPersonen.map((personId) => ({ personId })) },
      empfaengerGruppen: { create: empfaengerGruppen.map((gruppeId) => ({ gruppeId })) },
      empfaengerAbteilungen: { create: empfaengerAbteilungen.map((abteilungId) => ({ abteilungId })) },
    },
  })

  if (umfrageAktiv) {
    await prisma.infoUmfrage.create({
      data: {
        infoId: info.id,
        frage: umfrageFrage,
        mehrfachauswahl: umfrageMehrfachauswahl,
        optionen: { create: umfrageOptionen.map((text, reihenfolge) => ({ text, reihenfolge })) },
      },
    })
  }

  if (neueAnhaenge.length > 0) {
    await infoAnhaengeSpeichern(info.id, neueAnhaenge, kontext.personId)
  }

  const aufgeloestesInhalt = await inlineBilderAufloesenUndSpeichern(info.id, kontext.personId, inhalt, inlineBilder, inlineCids)
  if (aufgeloestesInhalt !== inhalt) {
    await prisma.info.update({ where: { id: info.id }, data: { inhalt: aufgeloestesInhalt } })
  }

  // Bei "Geplant am" gibt es beim Anlegen noch niemanden zu benachrichtigen
  // — diese Codebasis hat keinen Cron-/Background-Job, der die
  // Benachrichtigung nachträglich beim Sichtbarwerden verschicken könnte
  // (siehe Kommentar an Info.veroeffentlichtAm). Bewusste Einschränkung,
  // keine offene Lücke.
  if (!istGeplant) {
    const absenderName = alsUnternehmen ? UNTERNEHMENSNAME : kontext.name
    const empfaengerIds = (await infoEmpfaengerIds(info.id)).filter((id) => id !== kontext.personId)
    await Promise.all(
      empfaengerIds.map((personId) =>
        benachrichtigungErstellen({
          personId,
          text: `${absenderName} hat eine neue Info veröffentlicht: "${titel}"`,
          // Infos haben keine eigene Seite mehr (siehe InfoAnzeigenDialog) —
          // "?info=" öffnet beim Laden von /newsfeed automatisch das
          // passende Pop-up (siehe NewsfeedListe).
          link: `/newsfeed?info=${info.id}`,
        }),
      ),
    )
  }

  revalidatePath("/newsfeed")
  revalidatePath("/")
  redirect("/newsfeed")
}

/**
 * Speichert den "+ Info"-Dialog als Entwurf — ausgelöst, wenn er ohne
 * normales Veröffentlichen geschlossen wird (Abbrechen/Escape, siehe
 * InfoErstellenDialog/EntwurfBestaetigenDialog) und sich die Person
 * dagegen entscheidet, die Eingaben zu verwerfen. Anders als
 * `infoErstellen` keine Pflichtprüfungen (siehe infoFelderLesenOderFehler,
 * `entwurf: true`), keine Benachrichtigung, keine Umfrage — ein Entwurf
 * ist rein privat und unvollständig, bis er über `infoAktualisieren`
 * normal fertiggestellt wird.
 */
export async function infoAlsEntwurfSpeichern(formData: FormData) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Infos" })

  const {
    titel,
    inhalt,
    kategorieId,
    empfaengerPersonen,
    empfaengerGruppen,
    empfaengerAbteilungen,
    mitBestaetigung,
    kommentareErlaubt,
    neueAnhaenge,
    inlineBilder,
    inlineCids,
  } = await infoFelderLesenOderFehler(formData, "/newsfeed", { entwurf: true })

  const info = await prisma.info.create({
    data: {
      titel: titel || "Entwurf ohne Titel",
      inhalt,
      kategorieId,
      mitBestaetigung,
      kommentareErlaubt,
      istEntwurf: true,
      // Muss technisch gesetzt sein (Spalte NOT NULL), spielt aber keine
      // Rolle — Entwürfe sind komplett aus infosFuerPerson ausgeschlossen
      // und bekommen bei der Fertigstellung über infoAktualisieren einen
      // frischen, echten Wert (siehe dortiger Kommentar).
      veroeffentlichtAm: new Date(),
      erstelltVonId: kontext.personId,
      empfaengerPersonen: { create: empfaengerPersonen.map((personId) => ({ personId })) },
      empfaengerGruppen: { create: empfaengerGruppen.map((gruppeId) => ({ gruppeId })) },
      empfaengerAbteilungen: { create: empfaengerAbteilungen.map((abteilungId) => ({ abteilungId })) },
    },
  })

  if (neueAnhaenge.length > 0) {
    await infoAnhaengeSpeichern(info.id, neueAnhaenge, kontext.personId)
  }

  const aufgeloestesInhalt = await inlineBilderAufloesenUndSpeichern(info.id, kontext.personId, inhalt, inlineBilder, inlineCids)
  if (aufgeloestesInhalt !== inhalt) {
    await prisma.info.update({ where: { id: info.id }, data: { inhalt: aufgeloestesInhalt } })
  }

  revalidatePath("/newsfeed")
  redirect("/newsfeed")
}

/**
 * Löscht einen eigenen Entwurf — anders als `infoLoeschen` (Berechtigung
 * "Löschen & Bearbeiten", unabhängig von Autorenschaft) hier bewusst
 * autorenscharf: ein Entwurf ist rein privat, seine Berechtigung "Infos"
 * (zum Anlegen) reicht deshalb, um ihn auch wieder zu löschen — ohne dass
 * dafür die zusätzliche Löschen-Berechtigung nötig wäre.
 */
export async function infoEntwurfLoeschen(infoId: string) {
  const kontext = await berechtigung(undefined, { benoetigteBerechtigung: "Infos" })

  const info = await prisma.info.findUnique({ where: { id: infoId }, select: { erstelltVonId: true, istEntwurf: true } })
  if (!info?.istEntwurf || info.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("Entwurf nicht gefunden")
  }

  await prisma.info.delete({ where: { id: infoId } })
  revalidatePath("/newsfeed")
}

/**
 * Stimmt für eine Option ab bzw. nimmt die eigene Stimme dafür zurück,
 * wenn sie schon gesetzt war (echtes Togglen, wie infoLikeUmschalten). Bei
 * einer Einzelauswahl-Umfrage werden zuerst alle anderen eigenen Stimmen
 * dieser Umfrage entfernt, bevor die neue gesetzt wird — dadurch bleibt
 * "genau eine Stimme" erzwungen, ohne dass das Formular selbst
 * Radio-Semantik braucht.
 */
export async function infoUmfrageOptionUmschalten(optionId: string) {
  const kontext = await berechtigung()

  const option = await prisma.infoUmfrageOption.findUnique({
    where: { id: optionId },
    include: { umfrage: { select: { infoId: true, mehrfachauswahl: true } } },
  })
  if (!option) throw new NichtBerechtigt("Option nicht gefunden")
  if (!(await istInfoEmpfaenger(option.umfrage.infoId, kontext.personId))) {
    throw new NichtBerechtigt("Info nicht sichtbar")
  }

  const bestehend = await prisma.infoUmfrageStimme.findUnique({
    where: { optionId_personId: { optionId, personId: kontext.personId } },
  })

  if (bestehend) {
    await prisma.infoUmfrageStimme.delete({ where: { id: bestehend.id } })
  } else {
    if (!option.umfrage.mehrfachauswahl) {
      await prisma.infoUmfrageStimme.deleteMany({
        where: { personId: kontext.personId, option: { umfrageId: option.umfrageId } },
      })
    }
    await prisma.infoUmfrageStimme.create({ data: { optionId, personId: kontext.personId } })
  }

  revalidatePath("/newsfeed")
  revalidatePath("/")
}

/** Append-only (siehe Kommentar am Model InfoBestaetigung) — ein zweiter Klick ist ein No-op, kein Fehler. */
export async function infoBestaetigen(infoId: string) {
  const kontext = await berechtigung()

  if (!(await istInfoEmpfaenger(infoId, kontext.personId))) {
    throw new NichtBerechtigt("Info nicht sichtbar")
  }

  await prisma.infoBestaetigung.upsert({
    where: { infoId_personId: { infoId, personId: kontext.personId } },
    create: { infoId, personId: kontext.personId },
    update: {},
  })

  revalidatePath("/newsfeed")
  revalidatePath("/")
}

/** Echtes An/Aus, anders als infoBestaetigen (siehe Kommentar am Model InfoLike). */
export async function infoLikeUmschalten(infoId: string) {
  const kontext = await berechtigung()

  if (!(await istInfoEmpfaenger(infoId, kontext.personId))) {
    throw new NichtBerechtigt("Info nicht sichtbar")
  }

  const bestehend = await prisma.infoLike.findUnique({
    where: { infoId_personId: { infoId, personId: kontext.personId } },
  })
  if (bestehend) {
    await prisma.infoLike.delete({ where: { id: bestehend.id } })
  } else {
    await prisma.infoLike.create({ data: { infoId, personId: kontext.personId } })
  }

  revalidatePath("/newsfeed")
  revalidatePath("/")
}

/**
 * Rückfragen zu einer Info — abschaltbar über Info.kommentareErlaubt. Der
 * Anhang-Fehlerfall leitet noch per redirect auf die Liste um (dort steht
 * die fehler-Anzeige bereits) — die Info hat seit dem Pop-up-Umbau
 * (InfoAnzeigenDialog) keine eigene Seite mehr, auf die gezielter
 * umgeleitet werden könnte.
 */
export async function infoKommentarErstellen(infoId: string, formData: FormData) {
  const kontext = await berechtigung()

  const info = await prisma.info.findUnique({ where: { id: infoId } })
  if (!info || !(await istInfoEmpfaenger(infoId, kontext.personId))) {
    throw new NichtBerechtigt("Info nicht sichtbar")
  }
  if (!info.kommentareErlaubt) {
    throw new NichtBerechtigt("Kommentare sind für diese Info deaktiviert")
  }

  const neueAnhaenge = anhaengeAusFormData(formData)
  const anhaengeFehler = infoAnhaengePruefen(neueAnhaenge)
  if (anhaengeFehler) {
    redirect(`/newsfeed?fehler=${anhaengeFehler}`)
  }

  const text = String(formData.get("text") ?? "").trim()
  if (!text) return

  const kommentar = await prisma.infoKommentar.create({ data: { infoId, personId: kontext.personId, text } })

  if (neueAnhaenge.length > 0) {
    await infoAnhaengeSpeichern(infoId, neueAnhaenge, kontext.personId, kommentar.id)
  }

  revalidatePath("/newsfeed")
}

/** Anhänge lassen sich nur nachträglich löschen, nicht ergänzen — nur durch die erstellende Person der Info. */
export async function infoAnhangLoeschen(anhangId: string) {
  const kontext = await berechtigung()

  const anhang = await prisma.infoAnhang.findUnique({ where: { id: anhangId }, include: { info: true } })
  if (!anhang || anhang.info.erstelltVonId !== kontext.personId) {
    throw new NichtBerechtigt("nur die erstellende Person darf Anhänge entfernen")
  }

  await infoAnhangLoeschenIntern(anhangId)
  revalidatePath("/newsfeed")
  revalidatePath("/")
}

/**
 * Lädt die volle Detailansicht für das Lese-Pop-up (InfoAnzeigenDialog) —
 * clientseitig direkt aufgerufen, keine eigene Seite mehr dafür.
 * `absenderName` wird hier (serverseitig) statt im Pop-up selbst berechnet,
 * damit das Pop-up UNTERNEHMENSNAME nicht importieren muss — ein
 * Laufzeit-Import aus abfragen.ts würde dessen Prisma-Import mit in den
 * Browser-Bundle ziehen.
 */
export async function infoDetailLaden(infoId: string) {
  const kontext = await berechtigung()
  const info = await infoDetailFuerPerson(infoId, kontext)
  if (!info) return null
  return {
    ...info,
    absenderName: info.alsUnternehmen ? UNTERNEHMENSNAME : `${info.erstelltVon.vorname} ${info.erstelltVon.nachname}`,
  }
}

/**
 * Löschen ist NICHT der erstellenden Person vorbehalten (anders als bei
 * Auftrag/Termin) — nur die Berechtigung "Löschen & Bearbeiten" erlaubt
 * es, bewusst unabhängig von Autorenschaft (siehe darfInfoLoeschen).
 */
export async function infoLoeschen(infoId: string) {
  const kontext = await berechtigung()

  if (!darfInfoLoeschen(kontext)) {
    throw new NichtBerechtigt("nur mit der Berechtigung 'Löschen & Bearbeiten'")
  }

  await prisma.info.delete({ where: { id: infoId } })

  revalidatePath("/newsfeed")
  revalidatePath("/")
  redirect("/newsfeed")
}

/**
 * Bearbeitet eine bestehende Info — dieselben Felder wie infoErstellen,
 * siehe darfInfoBearbeiten für die Berechtigungslogik. Bewusst KEINE
 * erneuten Benachrichtigungen an Empfänger (nur beim ursprünglichen
 * Erstellen) — sonst Benachrichtigungs-Spam bei mehrfachem Nachbessern.
 * Empfänger werden komplett ersetzt statt diffweise angepasst (einfacher,
 * und nur die aktuelle Mitgliedschaft zählt ohnehin für die Sichtbarkeit).
 */
export async function infoAktualisieren(infoId: string, formData: FormData) {
  const kontext = await berechtigung()

  const info = await prisma.info.findUnique({ where: { id: infoId } })
  if (!info || !darfInfoBearbeiten(info, kontext)) {
    throw new NichtBerechtigt("keine Berechtigung, diese Info zu bearbeiten")
  }

  // Keine eigene Seite mehr je Info (siehe InfoAnzeigenDialog) — sowohl
  // Fehler- als auch Erfolgsfall führen zurück auf die Liste.
  const fehlerBasisPfad = "/newsfeed"
  const {
    titel,
    inhalt,
    kategorieId,
    empfaengerPersonen,
    empfaengerGruppen,
    empfaengerAbteilungen,
    mitBestaetigung,
    kommentareErlaubt,
    neueAnhaenge,
    inlineBilder,
    inlineCids,
  } = await infoFelderLesenOderFehler(formData, fehlerBasisPfad)

  // Dieselbe Regel-5-Prüfung wie beim Erstellen — die BEARBEITENDE Person
  // muss aktuell zur Geschäftsführung gehören, unabhängig davon, wer die
  // Info ursprünglich erstellt hat oder was dort bisher stand.
  const darfAlsUnternehmen = await istGeschaeftsfuehrung(kontext.personId)
  const alsUnternehmen = darfAlsUnternehmen && formData.get("alsUnternehmen") === "on"

  // "Geplant am" nur anfassen, wenn die Info noch nicht veröffentlicht ist
  // — sonst bleibt sie unverändert, egal was im (dann gar nicht erst
  // angezeigten) Formularfeld steht (Regel 5: nie dem Formularwert
  // vertrauen, wenn er gar nicht gelten darf). Ein geleertes Feld bei
  // einem noch nicht veröffentlichten Entwurf heißt "jetzt sofort
  // veröffentlichen". Ein ECHTER Entwurf (`istEntwurf`, siehe
  // infoAlsEntwurfSpeichern) zählt hier IMMER als "noch nicht
  // veröffentlicht" — sein gespeichertes `veroeffentlichtAm` ist nur ein
  // technischer Platzhalter vom Entwurf-Speichern, kein echter Termin.
  const jetzt = new Date()
  const nochNichtVeroeffentlicht = info.istEntwurf || info.veroeffentlichtAm > jetzt
  const geplantAmUpdate = nochNichtVeroeffentlicht
    ? (() => {
        const roh = String(formData.get("geplantAm") ?? "").trim()
        const eingabe = roh ? new Date(roh) : null
        const weiterhinGeplant = eingabe !== null && eingabe > jetzt
        return { geplantAm: weiterhinGeplant ? eingabe : null, veroeffentlichtAm: weiterhinGeplant ? eingabe! : jetzt }
      })()
    : {}

  await prisma.$transaction([
    prisma.infoEmpfaengerPerson.deleteMany({ where: { infoId } }),
    prisma.infoEmpfaengerGruppe.deleteMany({ where: { infoId } }),
    prisma.infoEmpfaengerAbteilung.deleteMany({ where: { infoId } }),
    prisma.infoEmpfaengerPerson.createMany({ data: empfaengerPersonen.map((personId) => ({ infoId, personId })) }),
    prisma.infoEmpfaengerGruppe.createMany({ data: empfaengerGruppen.map((gruppeId) => ({ infoId, gruppeId })) }),
    prisma.infoEmpfaengerAbteilung.createMany({
      data: empfaengerAbteilungen.map((abteilungId) => ({ infoId, abteilungId })),
    }),
    prisma.info.update({
      where: { id: infoId },
      // Jede erfolgreiche normale Speicherung graduiert einen Entwurf
      // endgültig zu einer echten Info (no-op, falls schon echt).
      data: { titel, inhalt, kategorieId, mitBestaetigung, kommentareErlaubt, alsUnternehmen, istEntwurf: false, ...geplantAmUpdate },
    }),
  ])

  if (neueAnhaenge.length > 0) {
    await infoAnhaengeSpeichern(infoId, neueAnhaenge, kontext.personId)
  }

  const aufgeloestesInhalt = await inlineBilderAufloesenUndSpeichern(infoId, kontext.personId, inhalt, inlineBilder, inlineCids)
  if (aufgeloestesInhalt !== inhalt) {
    await prisma.info.update({ where: { id: infoId }, data: { inhalt: aufgeloestesInhalt } })
  }

  // Ein Entwurf (siehe infoAlsEntwurfSpeichern) hat beim Speichern noch
  // niemanden benachrichtigt, weil er rein privat war — diese Speicherung
  // ist also das ERSTE Mal, dass Empfänger überhaupt von der Info
  // erfahren, anders als bei einer normalen Nachbesserung. Nur bei
  // sofortiger (nicht "Geplant am") Veröffentlichung, wie bei infoErstellen.
  if (info.istEntwurf && !("geplantAm" in geplantAmUpdate && geplantAmUpdate.geplantAm)) {
    const absenderName = alsUnternehmen ? UNTERNEHMENSNAME : kontext.name
    const empfaengerIds = (await infoEmpfaengerIds(infoId)).filter((id) => id !== kontext.personId)
    await Promise.all(
      empfaengerIds.map((personId) =>
        benachrichtigungErstellen({
          personId,
          text: `${absenderName} hat eine neue Info veröffentlicht: "${titel}"`,
          link: `/newsfeed?info=${infoId}`,
        }),
      ),
    )
  }

  revalidatePath("/newsfeed")
  revalidatePath("/")
  redirect(fehlerBasisPfad)
}
