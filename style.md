# Hudiy Marketplace – Style und Integrationsvertrag

## Produktkontext

Hudiy Marketplace ist eine einzelne WebView-Anwendung innerhalb der normalen Hudiy-Einstellungen. Hudiy liefert den Einstellungsrahmen, die Navigation und die Zurück-Funktion. Die WebView zeigt ausschließlich Marketplace-Inhalte: keine eigene Sidebar, keinen Kiosk-Modus und keinen zweiten Hudiy-Header.

Auf dem geprüften Hudiy-USB-Stand (`version.txt`: `1.24`) wird die Anwendung über `hudiy_marketplace` und die Datei-URL `file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html` geöffnet. Deshalb verwendet die Anwendung ausschließlich relative Asset- und Theme-Pfade und funktioniert sowohl als lokale HTTP-Preview als auch direkt aus der Hudiy-WebView.

Technische Bridge-Namen bleiben unverändert: `window.hudiy`, `hudiy_marketplace`, `~/.hudiy` und `hudiy-theme.json`.

## Visuelles System

- Material-3-inspiriertes Layout mit ruhigen Oberflächen, großen Touch-Zielen und klarer Hierarchie.
- Alle interaktiven Ziele sind mindestens 44 CSS-Pixel hoch.
- Die Tokens liegen als CSS-Variablen in `styles.css`. `hudiy-theme.json` ist ausschließlich der lokale Preview-Fallback.
- Unterstützte Theme-Tokens: `background`, `surface`, `surfaceContainer`, `surfaceContainerHigh`, `onBackground`, `onSurface`, `onSurfaceVariant`, `primary`, `onPrimary`, `outline`, `outlineVariant`, `error`, `tertiary`.
- Helle und dunkle Hudiy-Themes werden durch die gelieferten Farbwerte unterstützt; die Seite erzwingt kein eigenes Produkt-Theme.
- Responsive Regeln: einspaltig bei schmalen Touchscreens, zweispaltig auf mittleren Breiten und dreispaltig auf breiten Hudiy-Touchscreens. Die Seite hat keine horizontale Überbreite.
- Sichtbare Produkttexte verwenden ausschließlich „Hudiy“. Community-Inhalte dürfen ihren eigenen Namen tragen, werden aber als „Community-made · ungeprüft“ markiert.

## Theme-Bridge

Beim Start liest `app.js` zuerst `window.hudiy.colorScheme`. Wenn keine Bridge vorhanden ist, wird `hudiy-theme.json` geladen. Änderungen werden über den Hudiy-Callback `hudiy.onColorSchemeChanged` verarbeitet; zusätzlich wird ein `colorSchemeChanged`-Event unterstützt. Die WebView registriert außerdem `hudiy.onGoBack`, gibt bei geschlossenen Dialogen aber `false` zurück, damit Hudiy die normale Zurück-Navigation übernimmt. Nur bekannte Tokens und sichere Hex-/RGB-Farbwerte werden in CSS geschrieben.

## Katalogvertrag

Der Standard-Endpunkt ist `/api/catalog`. Die Antwort darf entweder ein Array oder `{ "plugins": [] }` sein. Jeder veröffentlichte Eintrag muss mindestens dieses Manifest erfüllen:

```json
{
  "id": "stable-plugin-id",
  "name": "Community-Name",
  "description": "Beschreibung",
  "author": "Autor",
  "version": "1.0.0",
  "type": "app",
  "supportedHudiyVersion": ">=1.0.0",
  "permissions": [],
  "entrypoints": { "webview": "dist/index.js" },
  "files": ["dist/index.js"],
  "checksum": "sha256:..."
}
```

Erlaubte Typen sind `app`, `widget`, `overlay` und `configuration`. Optionale Felder sind `downloads`, `rating`, `updatedAt` und sichere `links` mit ausschließlich `http://` oder `https://`. Ungültige Einträge werden vollständig verworfen. Ohne erreichbare oder konfigurierte Katalogquelle wird kein Plugin gerendert.

## Supabase-/Firebase-Anbindung

Die UI bleibt backend-agnostisch. Im Hudiy-Betrieb kann `window.hudiy.marketplaceCatalog` direkt als echter Katalog geliefert werden; alternativ ruft die WebView den verbundenen Supabase-REST-Endpunkt mit dem öffentlichen Publishable-Key ab. Die lokale Preview ist mit dem Projekt `mdzsxuxqrhnadmkroalq` verbunden und proxied den Katalog über `SUPABASE_URL` und `SUPABASE_ANON_KEY` aus `.env`. Nur der öffentliche Publishable-Key wird verwendet; ein Service-Key bleibt ausschließlich serverseitig und wird nicht in das Repository geschrieben. `HUDIY_CATALOG_URL` und `HUDIY_CATALOG_FILE` bleiben als backend-agnostische Alternativen verfügbar.

Für Supabase wird empfohlen:

- Google OAuth über Supabase Auth; Redirect-URLs auf die Hudiy-WebView beschränken.
- PostgreSQL-Tabellen für `plugins`, `plugin_versions`, `downloads` und `ratings`.
- Storage-Bucket für signierte Plugin-Pakete; Paketpfad aus einer serverseitig vergebenen Plugin-ID ableiten.
- Row Level Security: Lesen nur veröffentlichter Versionen; Schreiben/Upload nur für authentifizierte Benutzer; Autor- und Versionsänderungen serverseitig prüfen.
- Uploads erst nach Manifest-, Pfad-, Dateityp-, Größen-, Hash- und Versionsprüfung veröffentlichen.

Firebase kann dieselben Verträge mit Google Sign-In, Firestore, Cloud Storage und Security Rules umsetzen. Die WebView erwartet nur den JSON-Katalogvertrag; Authentifizierung und Veröffentlichung bleiben serverseitig.

## OAuth, Upload und Installation

Der sichtbare Upload-Dialog beschreibt den sicheren Ablauf, simuliert aber keinen Upload. Ein echter Google-Login wird erst aktiviert, wenn `googleOAuthEndpoint` konfiguriert und sicher ist. Uploads müssen das vollständige Manifest enthalten und vor Veröffentlichung validiert werden. Erlaubt sind nur deklarative Dateien und bekannte Paketpfade; Shell-, Python-, systemd-, Paketmanager- und beliebige Dateipfad-Aktionen sind ausgeschlossen.

Installationen passieren ausschließlich nach einer expliziten Benutzeraktion. Die Seite übergibt nur `id`, `version` und `checksum` an `window.hudiy.installMarketplacePlugin`, wenn diese sichere Hudiy-Schnittstelle vorhanden ist. Automatisches Ausführen fremder Dateien, stille Installationen und direkte Systemänderungen sind nicht Teil der WebView.

Berechtigungen werden vor jeder Installation im Detaildialog angezeigt.

## Sicherheitsgrenzen

- Jeder Eintrag ist sichtbar als Community-made und ungeprüft markiert. Es wird niemals Sicherheit, Virenfreiheit oder Fehlerfreiheit garantiert.
- Katalogwerte werden mit DOM-Textknoten statt unescaped HTML eingesetzt.
- Externe URLs akzeptieren nur `http://` und `https://`; `javascript:`, `data:`, `file:` und andere Schemes werden verworfen.
- Externe Links öffnen mit `noopener noreferrer`. Der Server erlaubt nur bekannte Projektdateien und blockiert Pfad-Traversal.
- Pakete brauchen serverseitige Hash- und Versionsprüfungen sowie eine Allowlist für Dateitypen und Zielpfade.
- Supabase-RLS bzw. Firebase Security Rules müssen veröffentlichte Versionen, Autorrechte, Uploadstatus und Bewertungsmanipulation getrennt absichern.

## Lokale Preview und Hudiy-Installation

`npm start` startet die Preview unter `http://localhost:4174/`. Technische Cache-Parameter werden beim Laden mit `history.replaceState` aus der sichtbaren URL entfernt. Ohne Katalog zeigt die Preview ausschließlich den Leerzustand.

Für eine Hudiy-/Pi-Installation wird die Anwendung nach `~/.hudiy/share/marketplace/hudiy-marketplace/` kopiert. Der Eintrag unter `integration/hudiy/applications.marketplace.json` folgt dem geprüften Hudiy-Schema mit `action`, Datei-URL, Audio-Fokus und Zoom-Faktor. Der Menüeintrag unter `integration/hudiy/applications_menu.marketplace.json` verwendet die reale Hudiy-Struktur mit Kategorie, Label, Material-Symbol und Action. Der Installer auf dem USB-Stick unterstützt `trixie_aarch64`, `bookworm_aarch64` und `trixie_x86_64`; für Raspberry Pi ist damit der 64-bit Pi-Installationsweg abgedeckt.
