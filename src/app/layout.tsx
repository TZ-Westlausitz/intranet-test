import type { Metadata } from "next";
import { Lato } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { kontextOderNull } from "@/lib/auth/berechtigung";
import { Rolle } from "@/generated/prisma/enums";
import { BenutzerMenu } from "@/components/benutzer-menu";
import { BenachrichtigungsGlocke } from "@/components/benachrichtigungs-glocke";
import { ChatWidget } from "@/components/chat-widget";
import { AdminModusSchalter } from "@/components/admin-modus-schalter";
import { BausteineLeiste } from "@/components/bausteine-leiste";
import { neuesteBenachrichtigungen, ungeleseneAnzahl } from "@/lib/benachrichtigungen/abfragen";
import { meineKonversationen } from "@/lib/chat/abfragen";
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "TPZ Intranet",
  description: "Internes Portal des Therapie- und Pflegezentrums Westlausitz",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // kontextOderNull statt berechtigung(): Dieses Layout umschließt auch
  // /anmelden, wo es noch keine angemeldete Person gibt — die Kopfzeile
  // fällt dann einfach weg, statt die Seite mit einem Fehler abzubrechen.
  const kontext = await kontextOderNull();

  const [benachrichtigungenRoh, anzahlUngelesen, chatKonversationen] = kontext
    ? await Promise.all([
        neuesteBenachrichtigungen(kontext.personId),
        ungeleseneAnzahl(kontext.personId),
        meineKonversationen(kontext),
      ])
    : [[], 0, []];
  const chatUngeleseneAnzahl = chatKonversationen.filter((k) => k.ungelesen).length;

  const benachrichtigungen = benachrichtigungenRoh.map((b) => ({
    id: b.id,
    text: b.text,
    link: b.link,
    zeitpunktAnzeige: `${formatiereDatumAusDate(b.erstelltAm)} · ${zeitAusDate(b.erstelltAm)}`,
    gelesen: b.gelesenAm !== null,
  }));

  return (
    <html
      lang="de"
      data-theme={kontext?.farbschema === "DUNKEL" ? "dunkel" : undefined}
      className={`${lato.variable} h-full antialiased`}
    >
      {/*
        Bewusst KEIN "flex flex-col" auf body: body als Flex-Container hätte
        zur Folge, dass die "mx-auto max-w-2xl"-Container in den Seiten
        (Cross-Achse eines Column-Flex) nicht mehr auf volle Breite
        gestreckt werden, sondern auf ihren Inhalt schrumpfen — automatische
        Ränder zur Zentrierung deaktivieren laut Flexbox-Spezifikation die
        Streckung. Die feste Kopfzeile unten ist ein normaler Block vor
        {children}, kein Flex-Layout auf body-Ebene.
      */}
      <body className="min-h-full font-sans">
        {/*
          Ab `md:` wird dieser Wrapper zur Flex-Spalte über genau eine
          Bildschirmhöhe (h-screen, overflow-hidden) — Kopfzeile behält ihre
          natürliche Höhe, der Seiteninhalt darunter bekommt den Rest
          (flex-1) und scrollt bei Bedarf nur INNERHALB dieses Bereichs statt
          die ganze Seite zu verlängern. Auf dem Handy bleibt der Wrapper ein
          normaler Block (keine der drei md:-Klassen greift dort) — genau
          das unveränderte Verhalten, das die mx-auto-Container der mobilen
          Seiten brauchen (siehe Kommentar unten zu body selbst).
        */}
        <div className="md:flex md:h-screen md:flex-col md:overflow-hidden">
          {/* Grüner Akzentbalken ganz oben — auf dem Handy hier statt in
              Kopfleiste, damit er wie auf dem Desktop randlos über die volle
              Breite geht und nicht durch das "px-5" der Seiten eingerückt
              wird. Kopfleiste (Logo, Drei-Striche-Menü, BenutzerMenu) bleibt
              weiterhin dort, wo sie schon steht. */}
          {/* dark:bg-none dark:bg-background (Rückmeldung 2026-09-11): im
              Dunkel-Modus kein bunter Verlauf mehr, sondern derselbe dunkle
              Ton wie die Kopfzeile direkt darunter — bg-none entfernt den
              Verlauf als background-image, sonst würde die Hintergrundfarbe
              nicht durchscheinen. */}
          {kontext && (
            <div className="h-1.5 shrink-0 bg-gradient-to-r from-marke-gruen via-marke-gruen-dunkel to-marke-orange dark:bg-none dark:bg-background md:hidden" />
          )}

          {kontext && (
            <div className="hidden shrink-0 md:block">
              <div className="h-1.5 bg-gradient-to-r from-marke-gruen via-marke-gruen-dunkel to-marke-orange dark:bg-none dark:bg-background" />

              <div className="flex items-center justify-between border-b border-rand px-8 py-4">
                <Link href="/" aria-label="Zur Startseite">
                  {/* Zwei Bilder statt eines umgefärbten: das weiße Logo ist eine
                      eigene Datei (von Jonas bereitgestellt), keine reine
                      Farbvariante des normalen Logos. dark:hidden/dark:block
                      statt Server-seitiger Fallunterscheidung, weil hier kein
                      zusätzliches Prop nötig ist — dieselbe an data-theme
                      gekoppelte Variante wie in globals.css definiert.
                      Beide Dateien sind gleich groß angelegt (2278×439,
                      Stand 2026-09-11) — dieselben width/height für beide,
                      daraus abgeleitet. */}
                  <Image
                    src="/logo.png"
                    alt="Therapie- und Pflegezentrum Westlausitz"
                    width={208}
                    height={40}
                    priority
                    className="h-10 w-auto dark:hidden"
                  />
                  <Image
                    src="/logo-weiss.png"
                    alt="Therapie- und Pflegezentrum Westlausitz"
                    width={208}
                    height={40}
                    priority
                    className="hidden h-10 w-auto dark:block"
                  />
                </Link>
                <div className="flex items-center gap-1">
                  <BenachrichtigungsGlocke
                    benachrichtigungen={benachrichtigungen}
                    ungeleseneAnzahl={anzahlUngelesen}
                  />
                  <BenutzerMenu
                    name={kontext.name}
                    istAdmin={kontext.rollen.includes(Rolle.ADMINISTRATION)}
                    adminModusAktiv={kontext.adminModusAktiv}
                  />
                </div>
              </div>

              <nav
                aria-label="Bausteine"
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-rand bg-flaeche-schwach px-8 py-3"
              >
                <BausteineLeiste adminModusAktiv={kontext.adminModusAktiv} />

                {kontext.rollen.includes(Rolle.ADMINISTRATION) && (
                  <AdminModusSchalter aktiv={kontext.adminModusAktiv} />
                )}
              </nav>
            </div>
          )}

          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">{children}</div>
        </div>

        {kontext && <ChatWidget konversationen={chatKonversationen} ungeleseneAnzahl={chatUngeleseneAnzahl} />}
      </body>
    </html>
  );
}
