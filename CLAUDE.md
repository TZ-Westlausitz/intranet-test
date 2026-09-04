# TPZ Intranet — Regeln für die Arbeit an diesem Code

Interne Web-App für die Mitarbeitenden des TPZ Westlausitz an fünf Standorten.
Ersetzt schrittweise app.ueberblick.io.

**Das Wichtigste zuerst:** Dieser Code wird von jemandem gepflegt, der nicht
hauptberuflich entwickelt, und muss im Zweifel von einem externen Dienstleister
übernommen werden können. Naheliegende, langweilige Lösungen schlagen clevere.
Wenn eine Abkürzung Verständlichkeit kostet, nimm die Abkürzung nicht.

## Baustein 1 — worum es geht

Die Firma hat Transporter (VW Multivan, Crafter), die unter der Woche
betrieblich für Personen-, Material- und Rollstuhltransport laufen.
**Dieser betriebliche Betrieb ist nicht Teil dieses Systems.**

Abgebildet wird ausschließlich der Sonderfall: Ein Kollege, der sonst kein
Fahrzeugführer ist, möchte ein Fahrzeug **privat** ausleihen — Umzug,
Familienfeier, ein Wochenende. Er fragt den Werkstattleiter. Sagt der zu,
werden bei der Übergabe die Nutzungsvereinbarung und das Übergabeprotokoll
ausgefüllt, bei der Rückgabe das Protokoll ein zweites Mal.

Das passiert ein paar Mal im Jahr, nicht täglich. Der Vorgang ist klein, aber
er hat einen Lebenszyklus und rechtliche Folgen — daher der Aufwand.

**Unterschrieben wird auf dem Gerät des Werkstattleiters**, beide Parteien
nacheinander. Nur Werkstattleiter und Verwaltung haben ein Konto; die übrigen
Personen existieren als Datensatz, damit man sie als Entleiher auswählen kann.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL 17 · **Prisma 7** · Auth.js v5 ·
Tailwind + shadcn/ui · Betrieb später On-Premise via Docker Compose + Caddy.

**Prisma 7 weicht von den meisten Anleitungen im Netz ab.** Drei Punkte, die
regelmäßig für Verwirrung sorgen:

- Der Generator heißt `prisma-client`, nicht `prisma-client-js`.
- Die Verbindungs-URL steht in `prisma.config.ts` im Projektstamm, **nicht**
  im Schema. Ein `url = env(...)` im datasource-Block ist ein
  Validierungsfehler.
- Der Client wird nach `src/generated/prisma` erzeugt und von dort importiert
  (`@/generated/prisma/client`), **nicht** aus `@prisma/client`. Für die
  Verbindung braucht er `@prisma/adapter-pg`.

Wenn eine Anleitung etwas anderes zeigt, prüfe zuerst, auf welche
Hauptversion sie sich bezieht.

## Fachliche Regeln — nicht verhandelbar

Diese Punkte sind bewusst so entschieden. Wenn eine Änderung sie verletzt, ist
die Änderung falsch, nicht die Regel. Bei Zweifeln nachfragen statt umbauen.

1. **Unterschriften zeigen auf eine `Dokumentversion`, nie auf ein
   `Dokument`.** Textänderung erzeugt eine neue Version; bereits
   unterschriebene Ausleihen bleiben ihrer Version zugeordnet.

2. **`Vereinbarung` und `Uebergabeprotokoll` sind append-only.** Nach dem
   Anlegen kein Update, kein Delete — nie. Eine Korrektur ist ein Vermerk
   oder ein neuer Datensatz.

3. **Genau zwei Übergabeprotokolle pro Ausleihe**, AUSGABE und RUECKNAHME.
   Der Unique-Index darauf ist Absicht.

4. **`Person` wird nie gelöscht, nur deaktiviert** (`aktiv = false`).

5. **Die Rechteprüfung steht in genau einer Funktion**, und jede Server Action
   ruft sie als erste Zeile auf. Ein ausgeblendeter Knopf ist keine
   Zugriffskontrolle.

6. **PDFs werden ausschließlich serverseitig erzeugt.** Ein PDF, das der
   Client baut und hochlädt, ist als Nachweis wertlos.

7. **Dateien gehören nicht in die Datenbank.** Unterschriften (PNG),
   Schadensfotos und PDFs auf das Volume bzw. nach MinIO, nur der Pfad
   in die Tabelle.

8. **Vom Führerschein wird nur ein Prüfvermerk gespeichert** — geprüft am,
   von wem, Klassen, gültig bis. **Kein Scan, kein Foto.** Ein Abbild wäre
   für den Zweck nicht erforderlich.

9. **Die App entscheidet nicht über betriebliche Verfügbarkeit.** Sie kennt
   nur die privaten Ausleihen und warnt nur vor Überschneidungen mit diesen.
   Ob das Fahrzeug betrieblich gebraucht wird, weiß allein der
   Werkstattleiter. Keine Funktion bauen, die das Gegenteil suggeriert.

   *Angedacht für später:* Fahrdienstleiter sollen Fahrzeuge im
   Verfügbarkeitskalender auch für den betrieblichen Bedarf blockieren
   können (meist unter der Woche) — dann kennt die App diese Termine
   zusätzlich zu den privaten und kann davor warnen. Bis das gebaut ist,
   bleibt es bei "nur warnen anhand der privaten Ausleihen".

   Zwei Dinge dazu, Stand jetzt noch nicht endgültig: Die Rolle
   "Fahrdienstleiter" entsteht erst, wenn perspektivisch alle Mitarbeitenden
   mit ihren jeweiligen Rollen ins Intranet übernommen werden — bis dahin
   keine Annahme treffen, ob das über eine neue `Rolle` läuft oder
   anders. Und: Die betrieblichen Belegzeiten sind vermutlich jede Woche
   gleich (ein wiederkehrendes Muster, kein Einzeltermin je Fahrzeug) —
   das ist aber noch nicht final geprüft. Falls das stimmt, braucht die
   spätere Umsetzung eher ein wiederkehrendes Wochenschema als
   Einzeltermine wie bei der `Ausleihe`.

10. **Keine Patientendaten. Keine Telematik-, GPS- oder Fahrtenbuchdaten.**
    Zugesagte Grenze, keine Geschmacksfrage.

11. **Protokolliert wird nur, was in der Nutzungsordnung aufgezählt ist.**
    Neue Protokollfelder sind mitbestimmungsrelevant.

## Geldwerter Vorteil — rechne das nicht neu

Nach dem BMF-Schreiben vom 3.3.2022, Rz. 16 sind bei Überlassung *von Fall
zu Fall* und für *nicht mehr als fünf Kalendertage im Kalendermonat*
**0,001 % des inländischen Listenpreises je gefahrenem Kilometer** als
geldwerter Vorteil anzusetzen. Wird die Fünf-Tage-Grenze gerissen, greift
die 1-%-Regelung — und zwar für den **ganzen Monat**.

Daraus folgt für den Code:

- Der Listenpreis wird bei der Ausleihe **eingefroren**
  (`bruttolistenpreisCentBeiAusleihe`), nicht zur Auswertungszeit vom
  Fahrzeug gelesen.
- Gefahrene Kilometer kommen aus der Differenz der beiden Protokolle.
- Die Verwaltungssicht **warnt**, wenn eine Person in einem Kalendermonat
  über fünf Tage kommt. Die App entscheidet nicht, sie warnt.
- Der berechnete Betrag wird gespeichert, nicht bei jedem Aufruf neu
  berechnet — sonst ändert sich Vergangenheit.

Die Berechnung ist vor Inbetriebnahme vom Steuerberater zu bestätigen.
Wenn er eine andere Methode vorgibt, ist seine Vorgabe maßgeblich.

## Technische Konventionen

- **Sprache:** Domänenbegriffe deutsch (`Ausleihe`, `Uebergabeprotokoll`,
  `geplantVon`), Technik englisch (`page.tsx`, `middleware`, `useState`).
  Umlaute in Bezeichnern ausgeschrieben: `Uebergabeprotokoll`.
- **Geldbeträge immer als `Int` in Cent.** Niemals Float, niemals Decimal
  für Beträge, die addiert werden.
- **Tankfüllung in fünf Stufen** (voll, ¾, ½, ¼, leer) — genau die Stufen aus
  dem echten Übergabeprotokoll, keine Achtel und kein Prozentwert.
- **Mobile first.** Der Werkstattleiter steht mit dem Handy am Fahrzeug,
  oft in einer Halle mit schlechtem Empfang. Formulare müssen kurz sein und
  Zwischenstände lokal halten, bis das Speichern durchgeht.
- **Server Actions** statt eigener API-Routen, außer wo ein echter Endpunkt
  gebraucht wird (PDF-Auslieferung, Health Check).
- **Keine Migration von Hand am Produktivsystem.**
- **Geheimnisse nur in `.env`**, niemals im Code oder Repository.

## Auth — bekannte Falle

Auth.js v5 unterstützt beim **Credentials-Provider keine
Datenbank-Sessions**, nur JWT. Bibliotheks-Einschränkung, kein
Konfigurationsfehler.

Folge: Ein deaktiviertes Konto behält sein gültiges Token bis zum Ablauf.
Deshalb prüft die zentrale Rechtefunktion (Regel 5) bei **jeder** Anfrage
gegen die Datenbank, ob `person.aktiv` noch stimmt. Diese Prüfung nicht
wegoptimieren — sie ist der Ersatz für die fehlende Session-Verwaltung.

**Im Token steht nur die Person-ID.** Rollen und Standorte bewusst nicht:
`berechtigung()` fragt die Datenbank ohnehin bei jeder Anfrage ab. Stünden
die Rollen zusätzlich im Token, gäbe es zwei Wahrheitsquellen — und eine
Rollenänderung würde erst beim nächsten Token-Wechsel wirken. Eine Abfrage
pro Anfrage ist bei dieser Nutzerzahl kein Thema.

**Split-Config-Muster:** `auth.config.ts` ist edge-sicher (keine Provider,
kein Prisma, kein bcrypt) und wird von der Middleware geladen; `auth.ts`
ergänzt den Credentials-Provider und läuft nur im Node-Runtime. Importiere
in `auth.config.ts` niemals etwas, das Prisma oder bcrypt anfasst — die
Middleware bricht dann mit einer schwer lesbaren Meldung.

## Verzeichnisse

```
src/app/(werkstatt)/      Handy-Ansicht: Ausleihe anlegen, übergeben, zurücknehmen
src/app/(verwaltung)/     Desktop: Fahrzeuge, Vorlagen, Auswertung Lohnbuchhaltung
src/lib/auth/             Anmeldung + die eine Rechtefunktion
src/lib/pdf/              Serverseitige PDF-Erzeugung
src/lib/steuer/           Berechnung des geldwerten Vorteils, Fünf-Tage-Prüfung
src/lib/protokoll/        Schreiben von Protokolleinträgen
prisma/                   Schema und Migrationen
```

## Wenn du unsicher bist

Der fachliche Hintergrund steht im Claude-Projekt „Eigenes Intranet":
`claude/fahrplan-intranet.md` (Gesamtvorhaben) und
`claude/baustein-01-fahrzeugausleihe.md` (dieses Modul).
Dort steht das *Warum*. Hier steht das *Wie*.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
