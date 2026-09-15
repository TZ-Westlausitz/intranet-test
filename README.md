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

## Testbetrieb auf Vercel + Supabase (nicht die Produktivumgebung!)

Nur zum Ausprobieren auf mehreren Geräten (Handy, Tablet) über eine echte
Internet-Adresse, solange kein eigener Server läuft. Ersetzt NICHT den
On-Premise-Betrieb unter "Betrieb (ab Phase P1)" unten — dort bleibt es
beim eigenen Server, hier geht es nur um einen schnellen, kostenlosen
Testaufbau.

1. Bei [supabase.com](https://supabase.com) ein neues Projekt anlegen.
   - **Verbindungs-URL:** Projekteinstellungen → Database → Connection
     string → "Connection pooling" (Modus "Transaction", Port 6543) als
     `DATABASE_URL` verwenden — für Serverless-Umgebungen wie Vercel
     gedacht, viele kurze Verbindungen gleichzeitig.
   - **Storage:** Unter Storage einen neuen Bucket anlegen (Name muss zu
     `SUPABASE_STORAGE_BUCKET` passen, Standard `ablage`), "Public" davon
     ausschalten lassen — die App liefert Dateien über ihre eigenen,
     berechtigungsgeprüften Routen aus, nicht direkt aus dem Bucket.
   - **API-Zugangsdaten:** Projekteinstellungen → API → `Project URL` als
     `SUPABASE_URL`, `service_role`-Schlüssel (geheim, nicht `anon`!) als
     `SUPABASE_SERVICE_ROLE_KEY`.
2. Auf [vercel.com](https://vercel.com) mit dem GitHub-Repo verbinden,
   neues Projekt daraus anlegen (Next.js wird automatisch erkannt).
3. In den Vercel-Projekteinstellungen → Environment Variables alle
   Variablen aus `.env.example` eintragen (DATABASE_URL, AUTH_SECRET,
   SEED_PASSWORT, STANDARD_STARTPASSWORT, SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET) sowie zusätzlich
   `AUTH_TRUST_HOST=true` (Auth.js muss der von Vercel vorgegebenen
   Adresse vertrauen, sonst schlägt die Anmeldung fehl).
4. Einmalig lokal gegen die Supabase-Datenbank ausrollen (eigene `.env`
   dafür kurz auf die Supabase-`DATABASE_URL` umstellen, danach wieder
   zurück auf die lokale):
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
5. Vercel deployt ab jetzt automatisch bei jedem Push auf `main`.

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
