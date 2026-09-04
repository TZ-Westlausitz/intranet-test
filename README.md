# TPZ Intranet

Interne Web-App für die Mitarbeitenden des TPZ Westlausitz.
Löst app.ueberblick.io schrittweise ab.

**Erster Baustein: die private Ausleihe von Firmenfahrzeugen.** Nicht der
betriebliche Fahrbetrieb — nur der Sonderfall, dass ein Kollege einen
Transporter privat ausleiht (Umzug, Familienfeier). Nutzungsvereinbarung bei
der Zusage, Übergabeprotokoll bei Ausgabe und bei Rücknahme.

> **Wenn du das hier liest, weil Jonas nicht verfügbar ist:**
> Der Stack ist bewusst Standard (Next.js, PostgreSQL, Prisma), damit jeder
> Webentwickler übernehmen kann. Die fachlichen Regeln, die man kennen muss,
> stehen in `CLAUDE.md` — die ersten neun Punkte sind nicht verhandelbar.
> Zugangsdaten liegen im Passwort-Manager, die Geschäftsführung hat Zugriff.

## Lokal starten

Voraussetzungen: Node LTS, Docker Desktop, Git.

```bash
git clone <repo> && cd tpz-intranet
cp .env.example .env
npx auth secret            # schreibt AUTH_SECRET in .env

docker compose up -d       # PostgreSQL auf Port 5432
npx prisma migrate dev     # Schema einspielen
npm run seed               # Standorte, Abteilungen, Testperson

npm run dev                # http://localhost:3000
```

Datenbank ansehen: `npx prisma studio` oder Adminer auf http://localhost:8080.

## Vor der Inbetriebnahme klären — wichtiger als der Code

1. **Versicherung:** Deckt die Flottenpolice private Fahrten von
   Mitarbeitenden, die nicht zum eingetragenen Fahrerkreis gehören?
   Wenn nein, hilft keine App.
2. **Steuer:** Die kostenlose Überlassung erzeugt einen geldwerten Vorteil.
   Berechnungsmethode (siehe `CLAUDE.md`) vom Steuerberater bestätigen lassen.
3. **Schriftform:** Prüfen, ob die bestehende Nutzungsvereinbarung eine
   Schriftformklausel enthält.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/app/(werkstatt)/` | Handy-Ansicht: Ausleihe anlegen, übergeben, zurücknehmen |
| `src/app/(verwaltung)/` | Desktop: Fahrzeuge, Vorlagen, Auswertung Lohnbuchhaltung |
| `src/lib/auth/` | Anmeldung und die zentrale Rechtefunktion |
| `src/lib/pdf/` | Serverseitige PDF-Erzeugung |
| `src/lib/steuer/` | Geldwerter Vorteil, Fünf-Tage-Prüfung |
| `prisma/` | Schema und Migrationen |

## Betrieb (ab Phase P1)

Läuft On-Premise, nicht bei einem Cloud-Anbieter. Docker Compose + Caddy für
automatisches TLS. Test- und Produktivumgebung sind getrennt.

- Sicherung: restic oder Borg, **verschlüsselt**, inklusive `ABLAGE_PFAD`
- Wiederherstellung quartalsweise wirklich testen, nicht nur die Sicherung prüfen
- Feste Wartungsstunde im Monat für Updates
- Änderungen nie direkt am Produktivsystem

## Datenschutz

Reines Mitarbeitersystem. **Keine Patientendaten. Keine Telematik-, GPS- oder
Fahrtenbuchdaten.** Vom Führerschein wird nur ein Prüfvermerk gespeichert,
kein Scan und kein Foto. Was protokolliert wird, ist in der Nutzungsordnung
abschließend aufgezählt; neue Protokollfelder sind mitbestimmungsrelevant.

Vereinbarungen und Protokolle sind Nachweise und bleiben bis zum Ende der
Aufbewahrungsfrist erhalten — auch nach dem Ausscheiden. Konten werden
deaktiviert, Nachweise nicht gelöscht.

## Hintergrund

Claude-Projekt „Eigenes Intranet":
`claude/fahrplan-intranet.md` und `claude/baustein-01-fahrzeugausleihe.md`.
