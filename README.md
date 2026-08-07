# Hudiy Marketplace

Hudiy Marketplace is a single-page, touch-friendly Hudiy WebView for discovering community-made apps, widgets, overlays, and declarative configurations.

Every community entry is treated as unverified. The Marketplace never guarantees that a package is secure, virus-free, compatible, or error-free.

This guide covers local development, Supabase connectivity, Raspberry Pi installation, USB deployment, verification, rollback, and troubleshooting.

## Table of contents

- [Chapter 1: What this project contains](#chapter-1-what-this-project-contains)
- [Chapter 2: Compatibility target](#chapter-2-compatibility-target)
- [Chapter 3: Requirements](#chapter-3-requirements)
  - [Local development](#local-development)
  - [Hudiy device](#hudiy-device)
- [Chapter 4: Fastest local start](#chapter-4-fastest-local-start)
  - [Recommended one-liner](#recommended-one-liner)
  - [Windows PowerShell one-liner](#windows-powershell-one-liner)
  - [Verify before using the preview](#verify-before-using-the-preview)
- [Chapter 5: Supabase connection](#chapter-5-supabase-connection)
  - [Local `.env`](#local-env)
  - [Catalog response](#catalog-response)
- [Chapter 6: Install on a Hudiy Raspberry Pi](#chapter-6-install-on-a-hudiy-raspberry-pi)
  - [6.1 Create a backup](#61-create-a-backup)
  - [6.2 Copy the Marketplace files](#62-copy-the-marketplace-files)
  - [6.3 Register the Hudiy application](#63-register-the-hudiy-application)
  - [6.4 Register the Hudiy settings menu entry](#64-register-the-hudiy-settings-menu-entry)
  - [6.5 Restart and open](#65-restart-and-open)
- [Chapter 7: USB installation workflow](#chapter-7-usb-installation-workflow)
- [Chapter 8: One-liner for a prepared Hudiy device](#chapter-8-one-liner-for-a-prepared-hudiy-device)
- [Chapter 9: Security model](#chapter-9-security-model)
- [Chapter 10: Theme and Hudiy bridge behavior](#chapter-10-theme-and-hudiy-bridge-behavior)
- [Chapter 11: Troubleshooting](#chapter-11-troubleshooting)
  - [The browser shows an old page](#the-browser-shows-an-old-page)
  - [The catalog is empty](#the-catalog-is-empty)
  - [Supabase returns an error](#supabase-returns-an-error)
  - [The WebView is blank on Hudiy](#the-webview-is-blank-on-hudiy)
  - [The menu item does not appear](#the-menu-item-does-not-appear)
- [Chapter 12: Rollback](#chapter-12-rollback)
- [Chapter 13: Release checklist](#chapter-13-release-checklist)
- [Chapter 14: License](#chapter-14-license)

## Chapter 1: What this project contains

The project is intentionally small and contains one visible HTML page:

~~~text
index.html                                  Single Hudiy WebView page
app.js                                      Catalog, theme bridge, dialogs, validation
styles.css                                  Material 3-inspired responsive styling
hudiy-theme.json                            Local theme fallback
server.mjs                                  Local HTTP server and optional Supabase proxy
package.json                                Start and verification scripts
style.md                                    Integration, theme, catalog, security contract
assets/MaterialSymbolsRounded.ttf           Hudiy-compatible icon font
integration/hudiy/                          Hudiy application/menu registrations
scripts/verify-hudiy-integration.mjs        Automated integration checks
~~~

There are no demo cards, mock plugins, fake uploads, simulated installations, or additional HTML pages.

## Chapter 2: Compatibility target

The implementation was checked against the Hudiy installation files provided on the USB drive.

The checked Hudiy build reports version 1.24 and includes installer targets for:

- Raspberry Pi OS Bookworm 64-bit on supported Raspberry Pi hardware
- Raspberry Pi OS Trixie 64-bit on supported Raspberry Pi hardware
- Debian Trixie x86_64

Hudiy opens the Marketplace using this application action and file URL:

~~~text
action: hudiy_marketplace
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

The application therefore uses relative asset paths. It works from both:

- the local HTTP preview at http://localhost:4174/
- the Hudiy file WebView path under ~/.hudiy

Hudiy owns the surrounding settings frame, navigation, and back behavior. The Marketplace does not create a second sidebar, kiosk mode, or duplicate Hudiy navigation.

## Chapter 3: Requirements

### Local development

- Node.js 20 or newer is recommended.
- Git is recommended for cloning and updates.
- A modern Chromium-based browser is recommended for the local preview.
- Internet access is required for the Supabase catalog.

### Hudiy device

- A supported Hudiy installation.
- A writable Hudiy home directory, normally /home/pi on Raspberry Pi.
- The Marketplace destination must be writable:

~~~text
~/.hudiy/share/marketplace/hudiy-marketplace/
~~~

Do not modify the USB drive or the Hudiy installation until you have a backup.

## Chapter 4: Fastest local start

### Recommended one-liner

Clone the repository and start the verified local preview:

~~~bash
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git && cd Hudiy-Marketplace && npm start
~~~

Open:

~~~text
http://localhost:4174/
~~~

The page intentionally shows an empty state when no published catalog entry is available.

### Windows PowerShell one-liner

~~~powershell
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git; Set-Location Hudiy-Marketplace; npm start
~~~

### Verify before using the preview

Run:

~~~bash
node --check app.js
node --check server.mjs
npm run test:integration
git diff --check
~~~

The integration test verifies the page, the Hudiy registration format, the empty-catalog boundary, required bridge names, relative WebView paths, and the absence of known demo names.

## Chapter 5: Supabase connection

The connected Supabase project uses the following public project URL:

~~~text
https://mdzsxuxqrhnadmkroalq.supabase.co
~~~

The project contains these protected resources:

- plugins
- plugin_versions
- plugin_uploads
- plugin_downloads
- plugin_ratings
- private Storage bucket plugin-packages

Row Level Security is enabled on all Marketplace tables. The public catalog can only read rows with status = published.

### Local .env

Create a local .env file from the example:

~~~bash
cp .env.example .env
~~~

Then set:

~~~dotenv
PORT=4174
SUPABASE_URL=https://mdzsxuxqrhnadmkroalq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_replace_with_project_publishable_key
~~~

The .env file is ignored by Git. Never put a Supabase service_role key or sb_secret key into the browser, repository, USB package, or Hudiy WebView.

The local server proxies the published catalog through /api/catalog. The browser receives only catalog data; it never receives a privileged server key.

### Catalog response

The frontend accepts either:

~~~json
[
  {
    "id": "example-id"
  }
]
~~~

or:

~~~json
{
  "plugins": []
}
~~~

Each accepted entry must contain a valid manifest with:

~~~json
{
  "id": "stable-plugin-id",
  "name": "Community name",
  "description": "Description",
  "author": "Author",
  "version": "1.0.0",
  "type": "app",
  "supportedHudiyVersion": ">=1.0.0",
  "permissions": [],
  "entrypoints": { "webview": "dist/index.js" },
  "files": ["dist/index.js"],
  "checksum": "sha256:..."
}
~~~

Allowed types are app, widget, overlay, and configuration. Invalid manifests are discarded. A catalog with zero published entries remains empty; no placeholder object is generated.

## Chapter 6: Install on a Hudiy Raspberry Pi

The safest procedure is to copy the application files into the Hudiy Marketplace directory and merge the two registration objects into the existing Hudiy configuration.

### 6.1 Create a backup

On the Hudiy device:

~~~bash
set -eu
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/.hudiy/share/config/marketplace-backup-$STAMP"
mkdir -p "$BACKUP"
cp -a "$HOME/.hudiy/share/config/applications.json" "$BACKUP/"
cp -a "$HOME/.hudiy/share/config/applications_menu.json" "$BACKUP/"
if [ -d "$HOME/.hudiy/share/marketplace/hudiy-marketplace" ]; then
  cp -a "$HOME/.hudiy/share/marketplace/hudiy-marketplace" "$BACKUP/"
fi
printf 'Backup created at %s\n' "$BACKUP"
~~~

### 6.2 Copy the Marketplace files

From a checked-out repository on the device:

~~~bash
set -eu
TARGET="$HOME/.hudiy/share/marketplace/hudiy-marketplace"
mkdir -p "$TARGET/assets"
cp -f index.html app.js styles.css hudiy-theme.json "$TARGET/"
cp -f assets/MaterialSymbolsRounded.ttf "$TARGET/assets/"
~~~

The Hudiy WebView entry point is:

~~~text
$HOME/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

### 6.3 Register the Hudiy application

Add this object to the existing applications array in:

~~~text
~/.hudiy/share/config/applications.json
~~~

~~~json
{
  "action": "hudiy_marketplace",
  "url": "file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html",
  "allowBackground": false,
  "controlAudioFocus": false,
  "audioStreamCategory": "NONE",
  "zoomFactor": 1
}
~~~

Do not replace the complete configuration file unless you have a verified backup and understand the remaining Hudiy applications.

### 6.4 Register the Hudiy settings menu entry

Add this object to the existing Hudiy menu action list in:

~~~text
~/.hudiy/share/config/applications_menu.json
~~~

~~~json
{
  "categories": ["Hudiy"],
  "label": "Hudiy Marketplace",
  "iconFontFamily": "Material Symbols Rounded",
  "iconName": "storefront",
  "action": "hudiy_marketplace"
}
~~~

The exact array location can vary between Hudiy releases. Preserve the surrounding Hudiy configuration and append the object to the existing action list.

### 6.5 Restart and open

After validating the JSON files, restart Hudiy using the normal Hudiy exit/restart flow or reboot the device:

~~~bash
sudo reboot
~~~

Open Hudiy Marketplace from the normal Hudiy settings. The surrounding Hudiy navigation and back button must remain visible outside the WebView content.

## Chapter 7: USB installation workflow

The USB installer archive contains separate binaries for the supported architectures. Do not unpack the installer on Windows and copy it into the Hudiy application directory. Follow the official Hudiy installer instructions for the operating system image and license validation.

For the Marketplace itself, the USB is only a transfer medium:

1. Keep the Hudiy operating-system installer archive unchanged.
2. Copy the Marketplace repository or release folder to the USB.
3. Connect the USB to the Hudiy device.
4. Copy the checked files into ~/.hudiy/share/marketplace/hudiy-marketplace/.
5. Back up and update the two Hudiy configuration files.
6. Validate, reboot, and open the Marketplace from Hudiy settings.

Do not overwrite the USB existing .hudiy directory without a backup. The currently installed USB Marketplace copy may be older than this repository.

## Chapter 8: One-liner for a prepared Hudiy device

The following Bash one-liner is intended only for a device where the repository URL is trusted and the user has already confirmed the backup policy. It clones the repository, copies the WebView assets, and leaves configuration registration for the explicit JSON merge step:

~~~bash
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git /tmp/hudiy-marketplace && install -d "$HOME/.hudiy/share/marketplace/hudiy-marketplace/assets" && cp -f /tmp/hudiy-marketplace/index.html /tmp/hudiy-marketplace/app.js /tmp/hudiy-marketplace/styles.css /tmp/hudiy-marketplace/hudiy-theme.json "$HOME/.hudiy/share/marketplace/hudiy-marketplace/" && cp -f /tmp/hudiy-marketplace/assets/MaterialSymbolsRounded.ttf "$HOME/.hudiy/share/marketplace/hudiy-marketplace/assets/" && printf 'Marketplace files copied. Merge Hudiy configuration and reboot.\n'
~~~

This one-liner does not silently edit Hudiy settings, does not install community plugins, and does not execute files from a community package.

## Chapter 9: Security model

- Community content is always labelled Community-made and unverified.
- No security, virus-free, or functional guarantee is made.
- External URLs are restricted to http:// and https://.
- javascript:, data:, file:, and other unsafe URL schemes are rejected for external catalog links.
- Catalog data is inserted using DOM text nodes rather than unescaped HTML.
- Plugin paths are restricted to approved declarative directories and file extensions.
- Shell, Python, systemd, package-manager, and arbitrary filesystem commands are not accepted as plugin capabilities.
- Package checksums must use the sha256: format.
- Installation requires an explicit user action and a Hudiy installation bridge.
- Storage is private; package downloads must be mediated by a trusted server or signed URL flow.
- A Supabase service key must never be exposed to the browser or committed to Git.

## Chapter 10: Theme and Hudiy bridge behavior

The Marketplace reads the current Hudiy theme from:

~~~javascript
window.hudiy.colorScheme
~~~

It registers live updates through:

~~~javascript
window.hudiy.onColorSchemeChanged = callback
~~~

The supported tokens are background, surface, surfaceContainer, surfaceContainerHigh, onBackground, onSurface, onSurfaceVariant, primary, onPrimary, outline, outlineVariant, error, and tertiary.

When the Hudiy bridge is absent, the local hudiy-theme.json file is used as a fallback. The application also registers window.hudiy.onGoBack; open dialogs close inside the page, while normal back navigation is returned to Hudiy.

## Chapter 11: Troubleshooting

### The browser shows an old page

Verify the server response directly:

~~~bash
curl -I http://localhost:4174/
~~~

Reload the page without visible cache parameters. The application removes technical rev, fresh, and cache parameters from the visible URL with history.replaceState.

### The catalog is empty

An empty catalog is expected when there are no published rows. Check:

~~~bash
curl http://localhost:4174/api/catalog
~~~

The response must contain plugins: [] when no published catalog entries are available. No demo cards should appear.

### Supabase returns an error

Check:

1. The project is active.
2. SUPABASE_URL points to the correct project.
3. SUPABASE_ANON_KEY is the public publishable key.
4. The plugins table has RLS enabled.
5. The request filters for status = published.
6. The device has internet access and valid DNS/TLS.

The local sandbox may block outbound HTTPS even when the same configuration works on the Hudiy device. In that case the local proxy returns an empty safe response and the UI shows no cards.

### The WebView is blank on Hudiy

Check the file path and relative assets:

~~~bash
ls -la "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/index.html"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/app.js"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/styles.css"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/assets/MaterialSymbolsRounded.ttf"
~~~

Then verify that applications.json points to:

~~~text
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

### The menu item does not appear

Check that the menu object uses the exact action string:

~~~text
hudiy_marketplace
~~~

The action value in applications.json and applications_menu.json must match.

## Chapter 12: Rollback

Restore the backup created before installation:

~~~bash
set -eu
BACKUP="$HOME/.hudiy/share/config/marketplace-backup-YYYYMMDD-HHMMSS"
cp -f "$BACKUP/applications.json" "$HOME/.hudiy/share/config/applications.json"
cp -f "$BACKUP/applications_menu.json" "$HOME/.hudiy/share/config/applications_menu.json"
rm -rf "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
if [ -d "$BACKUP/hudiy-marketplace" ]; then
  cp -a "$BACKUP/hudiy-marketplace" "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
fi
sudo reboot
~~~

Replace the timestamp with the actual backup directory. Only run the rollback after checking that the path points inside ~/.hudiy/share/config/.

## Chapter 13: Release checklist

Before distributing a release:

- Run node --check app.js.
- Run node --check server.mjs.
- Run npm run test:integration.
- Run git diff --check.
- Confirm there is exactly one HTML page: index.html.
- Confirm no demo names or mock data exist.
- Confirm no .env, database password, service key, or secret key is staged.
- Confirm the Supabase catalog contains only validated manifests.
- Confirm the USB/Hudiy integration points to the file:// path.
- Test both light and dark Hudiy themes.
- Test search, type filters, sort order, detail dialogs, empty state, and explicit installation flow.
- Test at a narrow mobile width and a wide Hudiy touchscreen width.

## Chapter 14: License

See LICENSE.
