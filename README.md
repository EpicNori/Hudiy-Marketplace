# Hudiy Marketplace

Hudiy Marketplace is a single-page community catalogue embedded in Hudiy as a normal WebView application. It lists community-made apps, widgets, overlays, and declarative configurations when a real catalogue is connected.

Every community entry is visibly marked as community-made and unverified. This project never guarantees that a community package is safe, virus-free, compatible, or error-free.

This README is based on:

- the official [Hudiy source repository and documentation](https://github.com/wiboma/hudiy/blob/main/README.md)
- the official [Hudiy overview](https://hudiy.eu/overview/)
- the official [Hudiy product requirements](https://hudiy.eu/product/hudiy/)
- a read-only inspection of the supplied Hudiy USB installation, which reports Hudiy version 1.24

The USB installation is evidence of one installed Hudiy version. It is not a promise that every future Hudiy release uses identical files or menu structures.

## Table of contents

- [Chapter 1: Project scope](#chapter-1-project-scope)
- [Chapter 2: How Hudiy integration actually works](#chapter-2-how-hudiy-integration-actually-works)
- [Chapter 3: Repository layout](#chapter-3-repository-layout)
- [Chapter 4: Compatibility and requirements](#chapter-4-compatibility-and-requirements)
- [Chapter 5: Local preview](#chapter-5-local-preview)
- [Chapter 6: Supabase catalogue](#chapter-6-supabase-catalogue)
- [Chapter 7: Install the official Hudiy base system](#chapter-7-install-the-official-hudiy-base-system)
- [Chapter 8: Install Hudiy Marketplace into Hudiy](#chapter-8-install-hudiy-marketplace-into-hudiy)
- [Chapter 9: Configuration files and registration](#chapter-9-configuration-files-and-registration)
- [Chapter 10: WebView bridge and theming](#chapter-10-webview-bridge-and-theming)
- [Chapter 11: Catalogue, upload, and installation boundaries](#chapter-11-catalogue-upload-and-installation-boundaries)
- [Chapter 12: Security model](#chapter-12-security-model)
- [Chapter 13: Verification and troubleshooting](#chapter-13-verification-and-troubleshooting)
- [Chapter 14: Backup, rollback, and release checklist](#chapter-14-backup-rollback-and-release-checklist)
- [Chapter 15: License and sources](#chapter-15-license-and-sources)

## Chapter 1: Project scope

Hudiy Marketplace is a Hudiy application, not a replacement launcher.

Hudiy supplies:

- the surrounding settings frame
- the settings navigation and back action
- the embedded Chromium WebView
- the native application action system
- the Hudiy JavaScript bridge
- the active Material 3 colour scheme

This project supplies only the Marketplace content inside that WebView:

- one visible page: index.html
- search by name, type, author, and description
- filters for apps, widgets, overlays, and configurations
- sorting by popularity, recency, and name
- plugin detail dialogs
- visible permissions and compatibility information
- an empty state when no real catalogue is connected
- an upload architecture boundary without simulated uploads
- an explicit hand-off to a future safe Hudiy installation interface

The project deliberately does not create:

- a second sidebar
- a second Hudiy header
- a kiosk mode
- another HTML page
- fake catalogue cards
- demo names or placeholder plugins
- automatic community-package installation
- arbitrary shell, Python, systemd, package-manager, or filesystem execution

## Chapter 2: How Hudiy integration actually works

The official Hudiy documentation describes custom applications, widgets, and overlays as HTML/JavaScript content displayed in an embedded Chromium WebView. A WebView may load a local HTML file or a web URL. Hudiy exposes a special JavaScript object named window.hudiy for deeper integration.

The Marketplace uses the local-file model for the device installation:

~~~text
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

All application assets use relative paths so the same page works in:

~~~text
http://localhost:4174/
~~~

and in the Hudiy WebView under:

~~~text
~/.hudiy/share/marketplace/hudiy-marketplace/
~~~

The local Node server is a development preview and catalogue proxy. It is not required as a permanent service on the Raspberry Pi when the static files are installed into Hudiy.

Hudiy actions must be unique. The technical action used by this project is:

~~~text
hudiy_marketplace
~~~

Do not rename this action without updating every registration and integration test.

## Chapter 3: Repository layout

~~~text
index.html
    The only visible HTML page.

app.js
    Catalogue loading, validation, search, filtering, sorting, dialogs,
    safe links, theme application, and the Hudiy bridge.

styles.css
    Responsive Material 3-style presentation for touchscreens.

hudiy-theme.json
    Theme fallback used during local preview when the Hudiy bridge is absent.

server.mjs
    Local static-file server and optional catalogue proxy on port 4174.

package.json
    Node scripts. The server uses Node built-ins and has no runtime dependency install.

style.md
    Visual rules, theme tokens, responsive rules, catalogue contract,
    backend notes, permissions, and security boundaries.

assets/MaterialSymbolsRounded.ttf
    The Material Symbols Rounded font copied from the supplied Hudiy installation.

integration/hudiy/applications.marketplace.json
    The application object to add to Hudiy applications.json.

integration/hudiy/applications_menu.marketplace.json
    The menu item object to add to Hudiy applications_menu.json.

scripts/verify-hudiy-integration.mjs
    Automated checks for registration, paths, empty-catalog behaviour,
    URL validation, and required bridge names.

LICENSE
    Project license.
~~~

There are no additional pages, fixtures, simulated uploads, or demo data.

## Chapter 4: Compatibility and requirements

### 4.1 Official Hudiy hardware and operating systems

The official Hudiy product documentation lists support for:

- Raspberry Pi Zero 2
- Raspberry Pi 3B and 3B+
- Raspberry Pi 4B
- Raspberry Pi 5
- x86_64 systems

The official product page specifies Raspberry Pi OS Desktop 64-bit variants for supported Raspberry Pi hardware and Debian Trixie 64-bit for x86_64. Check the official documentation before installing because supported operating-system combinations can change.

The supplied USB installation was inspected without writing to it. It contains:

~~~text
Hudiy version: 1.24
Configuration directory: .hudiy/share/config/
Marketplace directory: .hudiy/share/marketplace/hudiy-marketplace/
Application config: .hudiy/share/config/applications.json
Menu config: .hudiy/share/config/applications_menu.json
~~~

### 4.2 Device requirements

The official installation material states that the device should have:

- at least 8 GB of free storage after the operating system
- a display up to 1920x1080
- active internet access for components and license validation
- a clean supported desktop operating-system image

An SSD or NVMe device is recommended where the hardware supports it.

### 4.3 Local development requirements

- Node.js 20 or newer is recommended.
- A Chromium-based browser is recommended.
- Internet access is required when the configured catalogue is remote.
- No package installation is required for the current server because it uses Node built-ins.

## Chapter 5: Local preview

### 5.1 Recommended one-liner

~~~bash
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git && cd Hudiy-Marketplace && npm start
~~~

Open the clean URL:

~~~text
http://localhost:4174/
~~~

The server binds to 127.0.0.1. Port 4174 is intentional because another local service previously occupied the original preview port.

### 5.2 Windows PowerShell

~~~powershell
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git; Set-Location Hudiy-Marketplace; npm start
~~~

### 5.3 Local configuration

Copy the example file:

~~~bash
cp .env.example .env
~~~

Set only public catalogue configuration or server-side proxy configuration:

~~~dotenv
PORT=4174
SUPABASE_URL=https://mdzsxuxqrhnadmkroalq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_replace_with_project_publishable_key
~~~

The .env file is ignored by Git. Never put a Supabase service key, secret key, database password, or OAuth client secret into the browser, repository, USB package, or Hudiy WebView.

If no real catalogue is reachable, the page must remain empty. This is intentional. It must never invent cards to make the interface look populated.

### 5.4 URL and cache behaviour

The visible URL remains:

~~~text
http://localhost:4174/
~~~

The application removes technical cache parameters from the visible address with history.replaceState. Cache-busting is not allowed to reintroduce old demo data, and no visible rev, fresh, or cache query parameter is required for normal use.

## Chapter 6: Supabase catalogue

### 6.1 Current project

The connected Supabase project is:

~~~text
Project name: hudiy-marketplace
Project reference: mdzsxuxqrhnadmkroalq
Region: eu-central-1
~~~

The repository is backend-agnostic. Supabase is the current implementation; Firebase or another backend can provide the same catalogue contract later.

The current database design contains:

- plugins
- plugin_versions
- plugin_uploads
- plugin_downloads
- plugin_ratings
- private Storage bucket: plugin-packages

Row Level Security is enabled for Marketplace tables. The public catalogue must expose only published records.

### 6.2 Catalogue transport

The frontend can receive a catalogue from:

1. window.hudiy.marketplaceCatalog when Hudiy supplies one directly
2. a configured safe HTTP or HTTPS catalogue endpoint
3. the local /api/catalog proxy
4. a configured local JSON file during controlled development

The local server can proxy Supabase through /api/catalog. It accepts only HTTP or HTTPS upstream URLs and returns an empty safe response when the upstream is unavailable.

Check the local response:

~~~bash
curl http://localhost:4174/api/catalog
~~~

A valid empty response is:

~~~json
{
  "plugins": [],
  "catalogConnected": true
}
~~~

A temporarily unavailable catalogue may return an error status with plugins: []. The UI still shows no plugin cards.

### 6.3 Manifest contract

Every published entry must contain a validated manifest:

~~~json
{
  "id": "stable-plugin-id",
  "name": "Community name",
  "description": "A useful description.",
  "author": "Community author",
  "version": "1.0.0",
  "type": "app",
  "supportedHudiyVersion": ">=1.0.0",
  "permissions": [],
  "entrypoints": {
    "webview": "dist/index.js"
  },
  "files": [
    "dist/index.js"
  ],
  "checksum": "sha256:..."
}
~~~

Allowed type values are:

~~~text
app
widget
overlay
configuration
~~~

The UI also displays downloads, rating, and updated date when the catalogue supplies them.

Invalid entries are discarded before rendering. Required fields must be non-empty, paths must be allowed, the checksum must use the sha256: form, and external links must use only http:// or https://.

## Chapter 7: Install the official Hudiy base system

This project does not replace the official Hudiy installer.

The supplied USB contains hudiy_installer.tar.gz and INSTALL.pdf. The installer archive contains architecture-specific installer files. Follow the official instructions for the operating-system image, hardware, order number, and license.

The documented installation sequence is:

1. Start with a clean supported desktop installation.
2. Copy hudiy_installer.tar.gz unchanged to the target device.
3. Do not unpack the archive before copying it to the target device.
4. Open a terminal locally or connect through SSH.
5. Extract the archive on the target device.
6. Enter the installer directory.
7. Make run.sh executable.
8. Run ./run.sh.
9. Enter the Hudiy order number when requested.
10. Reboot when the installer completes.

The core command sequence on the target device is:

~~~bash
tar -xzvf hudiy_installer.tar.gz
cd hudiy_installer
chmod +x run.sh
./run.sh
sudo reboot
~~~

Do not execute this sequence on a Windows workstation. It belongs to the supported Hudiy target system.

## Chapter 8: Install Hudiy Marketplace into Hudiy

Install the official Hudiy base system first. Then copy the Marketplace static files into the existing Hudiy home directory.

### 8.1 Back up the existing files

Run this on the Hudiy device:

~~~bash
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP=$HOME/.hudiy/share/config/marketplace-backup-$STAMP
mkdir -p "$BACKUP"
cp -a "$HOME/.hudiy/share/config/applications.json" "$BACKUP/"
cp -a "$HOME/.hudiy/share/config/applications_menu.json" "$BACKUP/"
if [ -d "$HOME/.hudiy/share/marketplace/hudiy-marketplace" ]; then
  cp -a "$HOME/.hudiy/share/marketplace/hudiy-marketplace" "$BACKUP/"
fi
printf 'Backup created at %s\n' "$BACKUP"
~~~

### 8.2 Copy the static files

From a checked-out repository or release directory on the device:

~~~bash
set -eu
TARGET=$HOME/.hudiy/share/marketplace/hudiy-marketplace
mkdir -p "$TARGET/assets"
cp -f index.html app.js styles.css hudiy-theme.json "$TARGET/"
cp -f assets/MaterialSymbolsRounded.ttf "$TARGET/assets/"
~~~

The device entry point must exist at:

~~~text
$HOME/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

### 8.3 Register the application and menu item

Merge the two supplied JSON objects into the existing Hudiy configuration. Do not replace a complete Hudiy configuration file with a small Marketplace fragment.

The exact objects are documented in [integration/hudiy/applications.marketplace.json](integration/hudiy/applications.marketplace.json) and [integration/hudiy/applications_menu.marketplace.json](integration/hudiy/applications_menu.marketplace.json).

### 8.4 Restart Hudiy

After validating the JSON, use the normal Hudiy restart flow or reboot:

~~~bash
sudo reboot
~~~

Open Hudiy Marketplace through the normal Hudiy settings. Hudiy must continue to own the surrounding frame, navigation, and back action.

## Chapter 9: Configuration files and registration

### 9.1 applications.json

The official Hudiy configuration uses:

~~~text
$HOME/.hudiy/share/config/applications.json
~~~

Add this object to the existing applications array:

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

The file URL is the actual integration path inspected on the supplied USB. If the Hudiy user home differs from /home/pi, use the path expected by that installation and verify it before restart.

### 9.2 applications_menu.json

The official Hudiy menu configuration uses:

~~~text
$HOME/.hudiy/share/config/applications_menu.json
~~~

It contains categories and items arrays. Add this object to the existing items array:

~~~json
{
  "categories": ["Hudiy"],
  "label": "Hudiy Marketplace",
  "iconFontFamily": "Material Symbols Rounded",
  "iconName": "storefront",
  "action": "hudiy_marketplace"
}
~~~

The supplied USB uses the same schema. Preserve existing categories and items. The Marketplace item is not a complete replacement for applications_menu.json.

### 9.3 Validate before restart

Use a JSON parser on the device:

~~~bash
node -e "const fs=require('fs'); for (const f of process.argv.slice(1)) JSON.parse(fs.readFileSync(f,'utf8')); console.log('JSON valid')" "$HOME/.hudiy/share/config/applications.json" "$HOME/.hudiy/share/config/applications_menu.json"
~~~

If Node.js is not available on the target, use the JSON validation method already provided by the Hudiy image or validate the files on a trusted development machine before copying them.

## Chapter 10: WebView bridge and theming

### 10.1 Official bridge behaviour

The official Hudiy documentation defines these relevant WebView bridge members:

~~~javascript
window.hudiy.colorScheme
window.hudiy.onColorSchemeChanged
window.hudiy.onGoBack
window.hudiy.onInputFocusChanged
window.hudiy.onActivatedChanged
window.hudiy.onMoveToNextControl
window.hudiy.onMoveToPreviousControl
window.hudiy.onTriggered
~~~

The official colour-scheme callback is invoked when the scheme changes and does not require a colour-scheme argument. The Marketplace therefore reads window.hudiy.colorScheme again inside the callback.

The official onGoBack callback returns a Boolean:

- true means the WebView handled the back action
- false lets Hudiy perform its normal back navigation

The Marketplace returns true when it closes an open dialog and false when Hudiy should handle navigation.

### 10.2 Theme tokens

The Marketplace supports these tokens:

~~~text
background
surface
surfaceContainer
surfaceContainerHigh
onBackground
onSurface
onSurfaceVariant
primary
onPrimary
outline
outlineVariant
error
tertiary
~~~

The local fallback is:

~~~text
hudiy-theme.json
~~~

The fallback is used only when the bridge is unavailable in local preview. When Hudiy supplies a colour scheme, the bridge takes precedence. Both light and dark themes are supported.

### 10.3 Touch and responsive behaviour

The UI uses Material 3-style surfaces, typography, states, and colour roles. Touch targets are at least 44 CSS pixels. The layout is designed for:

- narrow mobile preview widths
- tablet widths
- wide Hudiy touchscreens

The page must not create horizontal overflow. The Hudiy frame and navigation remain outside the Marketplace page.

## Chapter 11: Catalogue, upload, and installation boundaries

### 11.1 Community uploads

The intended upload flow is:

1. Sign in with Google through the selected backend.
2. Upload a package and manifest.
3. Validate the manifest and package before publication.
4. Store the package in private Storage.
5. Review or approve the record.
6. Publish only the validated version.
7. Expose only published metadata to the public catalogue.

The current local interface does not simulate a login, upload, or installation. The upload panel explicitly reports when no upload backend is connected.

### 11.2 Required manifest fields

An upload must provide:

~~~text
id
name
description
author
version
type
supportedHudiyVersion
permissions
entrypoints
files
checksum
~~~

The server must also validate:

- stable identifiers and version format
- allowed plugin type
- allowed file extensions
- allowed relative paths
- entrypoints contained in files
- checksum matching the stored package
- package size limits
- no path traversal
- no executable shell or system payloads
- no automatic systemd units
- no package-manager instructions
- no arbitrary absolute filesystem paths

### 11.3 Explicit installation boundary

The Marketplace does not install files by itself.

After a user explicitly chooses installation, the page may pass only the validated plugin id, version, and checksum to a future safe Hudiy installation interface such as:

~~~javascript
window.hudiy.installMarketplacePlugin({
  id,
  version,
  checksum
});
~~~

If that interface is missing, the UI refuses installation and explains that the safe Hudiy installation interface is not connected. No community file is executed automatically.

## Chapter 12: Security model

All community entries must remain visibly labelled:

~~~text
Community-made
Unverified
~~~

This is a warning, not a safety approval.

The security rules are:

- never promise security, virus-free operation, or functional correctness
- escape external data before displaying it
- use DOM text nodes for untrusted catalogue values
- allow only http:// and https:// external URLs
- reject javascript:, data:, file:, and other unsafe URL schemes
- never automatically execute downloaded files
- require an explicit user action before installation
- show requested permissions before installation
- keep plugin Storage private
- do not expose Supabase service or secret keys to the WebView
- use Supabase Row Level Security for catalogue visibility, uploads, versions, downloads, and ratings
- validate package paths, extensions, hashes, versions, and size limits server-side
- keep the installation operation inside a restricted Hudiy installation interface

A published catalogue record is not a security review. “Published” means only that it passed the configured publication workflow.

## Chapter 13: Verification and troubleshooting

### 13.1 Required repository checks

Run:

~~~bash
node --check app.js
node --check server.mjs
npm run test:integration
git diff --check
~~~

The integration test checks the actual registration fragments, relative WebView paths, required bridge names, safe URL handling, empty-catalog behaviour, and known demo-name absence.

### 13.2 Functional checks

Verify all of the following:

- zero cards appear without a real catalogue
- no demo names appear in the DOM
- search matches name, type, author, and description
- type filters work for all four supported types
- sorting works for popularity, recency, and name
- the detail dialog shows permissions and compatibility
- the explicit install action refuses when no safe Hudiy installer is connected
- a light Hudiy theme is applied
- a dark Hudiy theme is applied
- the back callback closes dialogs and otherwise returns control to Hudiy
- the visible URL remains http://localhost:4174/
- narrow and wide layouts do not overflow horizontally

### 13.3 The catalogue is empty

An empty catalogue is expected when no published records are available.

Check:

~~~bash
curl http://localhost:4174/api/catalog
~~~

Then check the Supabase project, table permissions, RLS policy, public key, DNS, TLS, and device internet access. Do not add temporary cards to diagnose an empty catalogue.

### 13.4 The WebView is blank

Check the installed files:

~~~bash
ls -la "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/index.html"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/app.js"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/styles.css"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/hudiy-theme.json"
test -f "$HOME/.hudiy/share/marketplace/hudiy-marketplace/assets/MaterialSymbolsRounded.ttf"
~~~

Then confirm that applications.json points to:

~~~text
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

The relative asset paths are required for the local file WebView.

### 13.5 The menu item is missing

Confirm:

- applications_menu.json contains the Marketplace object inside items
- applications.json contains the matching application object
- both use exactly hudiy_marketplace
- the JSON files are valid
- the Hudiy process has been restarted
- the label is Hudiy Marketplace
- the icon font is available

Hudiy WebView browsing data is documented under:

~~~text
$HOME/.hudiy/cache/web
$HOME/.hudiy/storage/web
~~~

Clear or inspect those locations only when the normal Hudiy troubleshooting process calls for it.

## Chapter 14: Backup, rollback, and release checklist

### 14.1 Rollback

Use the backup created before installation:

~~~bash
set -eu
BACKUP=$HOME/.hudiy/share/config/marketplace-backup-YYYYMMDD-HHMMSS
case "$BACKUP" in
  "$HOME/.hudiy/share/config/"*) ;;
  *) echo 'Refusing unsafe backup path'; exit 1 ;;
esac
cp -f "$BACKUP/applications.json" "$HOME/.hudiy/share/config/applications.json"
cp -f "$BACKUP/applications_menu.json" "$HOME/.hudiy/share/config/applications_menu.json"
rm -rf "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
if [ -d "$BACKUP/hudiy-marketplace" ]; then
  cp -a "$BACKUP/hudiy-marketplace" "$HOME/.hudiy/share/marketplace/hudiy-marketplace"
fi
sudo reboot
~~~

Replace the timestamp only after checking that the directory is the intended backup inside the Hudiy configuration directory.

### 14.2 Release checklist

Before distributing a release:

- run both Node syntax checks
- run the integration test
- run git diff --check
- confirm index.html is the only visible HTML page
- confirm the repository contains no demo data or fake catalogue entries
- confirm no .env, password, service key, secret key, or private token is staged
- confirm the catalogue exposes only validated published manifests
- confirm the application URL is a local file URL for Hudiy
- confirm relative assets load from a file WebView
- test light and dark Hudiy themes
- test search, filters, sorting, dialogs, empty state, and explicit installation
- test narrow, tablet, and wide touch layouts
- inspect the exact target Hudiy version before deployment

## Chapter 15: License and sources

See [LICENSE](LICENSE).

Primary references:

- [Official Hudiy repository and documentation](https://github.com/wiboma/hudiy)
- [Official Hudiy README](https://github.com/wiboma/hudiy/blob/main/README.md)
- [Official Hudiy overview](https://hudiy.eu/overview/)
- [Official Hudiy product requirements](https://hudiy.eu/product/hudiy/)

The supplied USB installation and INSTALL.pdf were used as local compatibility evidence. They were inspected read-only; the repository does not assume that a future Hudiy release has the same version or filesystem layout.
