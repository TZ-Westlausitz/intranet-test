import { berechtigung } from "@/lib/auth/berechtigung"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { InfoAvatar } from "@/components/info-avatar"
import { ProfilbildBearbeiten } from "@/components/profilbild-bearbeiten"
import { ROLLE_NAMEN } from "@/lib/rollen-optionen"
import { personKontaktDetail } from "@/lib/kontakte/abfragen"
import { profilAktualisieren, profilbildAktualisieren } from "@/lib/profil/aktionen"

const FEHLER_TEXTE: Record<string, string> = {
  emailVergeben: "Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.",
  zuGross: "Das Bild ist zu groß (maximal 5 MB).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind JPG, PNG, WEBP und HEIC.",
}

/**
 * Eigenes Profil — Name/Benutzername/Rolle(n) bleiben Anzeige (die pflegt
 * die Verwaltung im Adminbereich, siehe personBenutzernameAktualisieren
 * & Co.), aber E-Mail/Telefon/Weitere Informationen/Profilbild sind
 * freiwillige Angaben, die jede Person selbst pflegt (Vorbild Altsystem
 * "Überblick", Rückmeldung vom 2026-09-07) — dieselben Felder, die auch in
 * der Kontakte-Übersicht erscheinen, deshalb hier `personKontaktDetail`
 * wiederverwendet statt eines eigenen, engeren Querys. Kein Rollenfilter
 * in `berechtigung()`: jede angemeldete Person darf ihre eigenen Daten
 * sehen und ändern.
 */
export default async function ProfilSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler } = await searchParams

  const person = await personKontaktDetail(kontext.personId)
  if (!person) throw new Error("Angemeldete Person nicht gefunden")

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-2xl font-semibold text-ueberschrift">Profil</h1>

      <div className="mt-6 flex flex-col items-center gap-3">
        <InfoAvatar
          alsUnternehmen={false}
          vorname={person.vorname}
          nachname={person.nachname}
          personId={person.benutzername}
          profilbildPfad={person.profilbildPfad}
          groesse="gross"
        />
        <ProfilbildBearbeiten aktion={profilbildAktualisieren} />
      </div>

      <dl className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b border-flaeche-100 pb-2">
          <dt className="text-sekundaer">Name</dt>
          <dd className="font-medium">{kontext.name}</dd>
        </div>
        <div className="flex justify-between border-b border-flaeche-100 pb-2">
          <dt className="text-sekundaer">Benutzername</dt>
          <dd className="font-medium">{kontext.benutzername}</dd>
        </div>
        <div className="flex justify-between border-b border-flaeche-100 pb-2">
          <dt className="text-sekundaer">Rolle(n)</dt>
          <dd className="font-medium">
            {kontext.rollen.length > 0 ? kontext.rollen.map((r) => ROLLE_NAMEN[r]).join(", ") : "—"}
          </dd>
        </div>
        {person.zugehoerigkeiten.length > 0 && (
          <div className="flex justify-between border-b border-flaeche-100 pb-2">
            <dt className="text-sekundaer">Abteilung</dt>
            <dd className="text-right font-medium">
              {person.zugehoerigkeiten.map((z, index) => (
                <span key={z.id}>
                  {index > 0 && ", "}
                  {z.abteilung.name}
                  {z.standort ? ` (${z.standort.name})` : ""}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      <form
        action={profilAktualisieren}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-rand bg-flaeche p-4"
      >
        <div>
          <label htmlFor="profil-email" className="block text-xs font-medium text-primaer">
            E-Mail (optional)
          </label>
          <input
            id="profil-email"
            name="email"
            type="email"
            defaultValue={person.email ?? ""}
            placeholder="name@beispiel.de"
            className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="profil-telefon" className="block text-xs font-medium text-primaer">
            Telefon (optional)
          </label>
          <input
            id="profil-telefon"
            name="telefon"
            type="tel"
            defaultValue={person.telefon ?? ""}
            placeholder="0171 2345678"
            className="mt-1 h-9 w-full rounded-lg border border-flaeche-300 px-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="profil-weitere-informationen" className="block text-xs font-medium text-primaer">
            Weitere Informationen (optional)
          </label>
          <textarea
            id="profil-weitere-informationen"
            name="weitereInformationen"
            defaultValue={person.weitereInformationen ?? ""}
            rows={3}
            placeholder="z. B. Erreichbarkeit, Zuständigkeit …"
            className="mt-1 w-full rounded-lg border border-flaeche-300 px-2 py-1.5 text-sm"
          />
        </div>

        <button
          type="submit"
          className="ml-auto h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
        >
          Speichern
        </button>
      </form>

      <ZurueckButton />
    </main>
  )
}
