# Erste Sitzung: vom leeren Ordner zum laufenden Fundament

Ziel dieser Sitzung: Du meldest dich lokal an, siehst die Startseite mit einem
Modul und darunter das Testfahrzeug. Mehr nicht — und das ist genug für einen
Abend.

Nichts davon hängt an euren beiden Formularen oder an den Auskünften von
Versicherer und Steuerberater. Die kannst du parallel einholen.

---

## 1 · Projekt anlegen

```bash
npx create-next-app@latest tpz-intranet \
  --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"

cd tpz-intranet
```

## 2 · Abhängigkeiten

```bash
npm install prisma @prisma/adapter-pg next-auth@beta bcryptjs dotenv
npm install -D tsx @types/bcryptjs
```

Beachte: **kein `@prisma/client`** mehr. Ab Prisma 7 wird der Client ins
Projekt erzeugt (siehe unten) statt aus einem Paket importiert. Der
`@prisma/adapter-pg` stellt die Verbindung zu PostgreSQL her.

`next-auth@beta` ist der Kanal, über den v5 ausgeliefert wird. Notiere die
tatsächlich installierten Versionen in der README.

## 3 · Dateien einsortieren

Aus dem Startpaket in den Projektordner:

```
docker-compose.yml
.env.example
prisma.config.ts                          ← Projektstamm, nicht prisma/
CLAUDE.md
README.md
prisma/schema.prisma
prisma/seed.ts
src/middleware.ts
src/lib/db.ts
src/lib/auth/auth.config.ts
src/lib/auth/auth.ts
src/lib/auth/berechtigung.ts
src/types/next-auth.d.ts
src/app/page.tsx                          (überschreibt die erzeugte Datei)
src/app/anmelden/page.tsx
src/app/fahrzeuge/page.tsx
src/app/api/auth/[...nextauth]/route.ts
```

In die `package.json` unter `"scripts"`:

```json
"seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio"
```

In die `.gitignore`:

```
/src/generated
```

Der erzeugte Client wird nicht eingecheckt — er entsteht bei jedem
`prisma generate` neu.

## 4 · Umgebung

```bash
cp .env.example .env
npx auth secret          # schreibt AUTH_SECRET in .env
```

Prüfen, dass `.env` in der `.gitignore` steht. Das ist der häufigste Weg, wie
Zugangsdaten in ein Repository geraten.

## 5 · Datenbank

```bash
docker compose up -d
npx prisma migrate dev --name fundament-und-fahrzeugausleihe
npx prisma generate
npm run seed
```

`prisma generate` erzeugt den Client unter `src/generated/prisma`. **Schau
einmal in diesen Ordner**, bevor du weitermachst: Wenn die Importe in
`src/lib/db.ts` und `prisma/seed.ts` nicht auflösen, sagt dir die tatsächliche
Ordnerstruktur, wie der Pfad heißen muss. Ich konnte das hier nicht erzeugen.

## 6 · Starten

```bash
npm run dev
```

Auf <http://localhost:3000> landest du auf `/anmelden`.
Personalnummer `1001`, Passwort `start-1234` (oder was in `SEED_PASSWORT` steht).

---

## Prüfliste — daran erkennst du, dass es stimmt

- [ ] Aufruf von `/` ohne Anmeldung leitet auf `/anmelden` um
- [ ] Falsches Passwort zeigt eine Meldung, keine Ausnahmeseite
- [ ] Nach der Anmeldung steht dein Name auf der Startseite
- [ ] Die Startseite zeigt **eine** Kachel: Fahrzeugausleihe
- [ ] `/fahrzeuge` zeigt den VW Multivan
- [ ] In Prisma Studio (`npm run db:studio`) bei der Testperson `aktiv` auf
      `false` setzen, Seite neu laden → du fliegst raus. **Das ist der
      wichtigste Test der ganzen Sitzung**, denn er beweist, dass die
      Deaktivierung trotz JWT wirkt.
- [ ] `aktiv` wieder auf `true`, es geht weiter

---

## Was hier schiefgehen kann

**Migration schlägt fehl, weil Prisma zwei Beziehungen nicht zuordnen kann.**
Zwischen `Person` und `Ausleihe` gibt es zwei (Entleiher, Entscheider). Beide
sind im Schema benannt. Falls die Meldung trotzdem kommt, fehlt irgendwo ein
`@relation("…")` — die Fehlermeldung nennt das Modellpaar.

**Middleware bricht mit einer Meldung über Node-Module.** Dann importiert
`auth.config.ts` direkt oder indirekt etwas, das Prisma oder bcrypt anfasst.
Diese Datei muss frei davon bleiben — das ist der ganze Zweck der Aufteilung
in zwei Dateien.

**`session.user.id` ist `undefined`.** Dann fehlt `src/types/next-auth.d.ts`
oder TypeScript hat sie nicht eingelesen. Entwicklungsserver neu starten.

**Endlosschleife zwischen `/` und `/anmelden`.** Dann greift der
`authorized`-Rückruf auch für `/anmelden` selbst. Die Ausnahme dafür steht in
`auth.config.ts`.

---

## Ehrlich zum Stand dieses Codes

**Geprüft:** Das Prisma-Schema ist gegen den Prisma-7-Validator gelaufen und
ist gültig — inklusive der benannten Beziehungen und aller Indizes.

**Nicht geprüft:** alles andere. Migration, Client-Erzeugung und Typprüfung
brauchen Netzzugriff, den die Cowork-Sandbox blockiert. Rechne mit
Korrekturen vor allem an drei Stellen:

1. **Importpfade** zum erzeugten Prisma-Client (`@/generated/prisma/client`
   und `@/generated/prisma/enums`) — der Ordner nach `prisma generate` sagt
   dir, wie sie wirklich heißen.
2. **Auth.js-Signaturen**, falls sich die Beta seit meinem Stand bewegt hat.
3. **Prisma 7 ist noch jung.** Die Umstellung von `prisma-client-js` auf
   `prisma-client` mit Treiber-Adapter ist neu; viele Anleitungen im Netz
   zeigen noch den alten Weg. Wenn dir etwas widerspricht, prüfe zuerst, auf
   welche Hauptversion es sich bezieht.

### Warum überhaupt Prisma 7 und nicht das vertrautere 6?

Weil die Migration sonst später kommt — dann mit echten Nachweisen in der
Datenbank und dir allein. Auf einer leeren Datenbank kostet sie eine Stunde.
Der Preis ist, dass weniger Anleitungen passen. Wenn dir das während der
ersten Sitzung zu zäh wird, ist ein Rückzug auf Prisma 6 vertretbar — dann
aber bewusst und mit einer Notiz in der README, nicht als Versehen.

Genau dafür ist der Moment gekommen, an dem Claude Code im Terminal besser ist
als ich hier: Es sieht die Fehlermeldung, ändert die Datei und probiert erneut.
Nimm die `CLAUDE.md` mit ins Repository, dann kennt es die Regeln.

---

## Danach

Der nächste Baustein ist die Werkstattansicht: Ausleihe anlegen, übergeben,
zurücknehmen. Dafür brauche ich eure beiden Formulare — sonst modelliere ich
wieder an eurer Wirklichkeit vorbei.
