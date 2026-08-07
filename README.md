# Hudiy Marketplace

Hudiy Marketplace is the source of a Hudiy custom WebView application. It is designed to be loaded by Hudiy's existing embedded Chromium view and connected to Hudiy through the official `window.hudiy` bridge.

This is the supported Hudiy integration model for custom HTML/JavaScript applications. Hudiy remains responsible for the native settings frame, navigation, actions, WebView lifecycle, input routing, and theme. The Marketplace supplies only its page and its Marketplace functionality.

Every catalogue entry is visibly marked as community-made and unverified. No community package is guaranteed to be safe, virus-free, compatible, or error-free.

## Contents

- [Quick installation and first use](#quick-installation-and-first-use)
- [1. Integration model](#1-integration-model)
- [2. What is in the source tree](#2-what-is-in-the-source-tree)
- [3. Hudiy compatibility](#3-hudiy-compatibility)
- [4. Local preview](#4-local-preview)
- [5. Hudiy WebView integration](#5-hudiy-webview-integration)
- [6. Registration fragments](#6-registration-fragments)
- [7. Theme integration](#7-theme-integration)
- [8. Catalogue and Supabase](#8-catalogue-and-supabase)
- [9. Upload and installation boundaries](#9-upload-and-installation-boundaries)
- [10. Security rules](#10-security-rules)
- [11. Device deployment](#11-device-deployment)
- [12. Verification](#12-verification)
- [13. Troubleshooting](#13-troubleshooting)
- [14. Sources and license](#14-sources-and-license)

## Quick installation and first use

### Local preview

From the repository directory:

~~~bash
npm start
~~~

Open [http://localhost:4174/](http://localhost:4174/). The page intentionally shows no cards until a real catalogue is reachable.

### One-liner: easiest Linux installation for normal users

On an already installed Hudiy Linux device, run this single command:

~~~bash
curl -fsSL https://raw.githubusercontent.com/EpicNori/Hudiy-Marketplace/main/scripts/install-hudiy-marketplace.sh | bash -s -- --yes --restart
~~~

This downloads the trusted installer and matching Marketplace source, creates a backup, copies the WebView files, updates only the Marketplace entries in Hudiy's two JSON files, validates the result, and reboots the device. It does not install community plugins or execute any community package.

Use the one-liner only when you trust this repository and have reviewed the intended target. Remove `--yes` to keep the confirmation prompt. Remove `--restart` to finish without an immediate reboot.

The device needs Linux, internet access, `curl`, `tar`, `python3`, and GNU `install`. Node.js is not required on the Hudiy device for the Marketplace WebView itself.

### Run the installer from a local checkout

~~~bash
chmod +x scripts/install-hudiy-marketplace.sh
./scripts/install-hudiy-marketplace.sh --restart
~~~

### Advanced one-liner: install source only

Run this as one command on the prepared Hudiy device. It downloads the repository into a temporary directory, copies only the five static WebView files, and removes the temporary checkout. It does not overwrite Hudiy configuration and does not install a community plugin:

~~~bash
bash -c 'set -euo pipefail; tmp=$(mktemp -d); trap "rm -rf \"$tmp\"" EXIT; git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git "$tmp/repo"; target="$HOME/.hudiy/share/marketplace/hudiy-marketplace"; install -d "$target/assets"; install -m 0644 "$tmp/repo/index.html" "$tmp/repo/app.js" "$tmp/repo/styles.css" "$tmp/repo/hudiy-theme.json" "$target/"; install -m 0644 "$tmp/repo/assets/MaterialSymbolsRounded.ttf" "$target/assets/"; printf "WebView source installed. Merge the two Hudiy JSON fragments, validate them, and restart Hudiy.\\n"'
~~~

Prerequisites for this one-liner are a working internet connection, `git`, GNU `install`, and permission to write to `$HOME/.hudiy`. If the device has no `git`, copy the repository to the device first and use the file-copy procedure below.

### Advanced one-liner: register the application and menu safely

After the WebView files are present, this command backs up both Hudiy JSON files and replaces only an existing `hudiy_marketplace` entry. It preserves every other application and menu item. It requires `python3`:

~~~bash
python3 -c 'import datetime,json,pathlib,shutil; c=pathlib.Path.home()/".hudiy/share/config"; names=("applications.json","applications_menu.json"); stamp=datetime.datetime.now().strftime("%Y%m%d-%H%M%S"); b=c/("marketplace-backup-"+stamp); b.mkdir(); [shutil.copy2(c/n,b/n) for n in names]; a=c/"applications.json"; d=json.loads(a.read_text()); d.setdefault("applications",[]); d["applications"]=[x for x in d["applications"] if x.get("action")!="hudiy_marketplace"]+[{"action":"hudiy_marketplace","url":(pathlib.Path.home()/".hudiy/share/marketplace/hudiy-marketplace/index.html").as_uri(),"allowBackground":False,"controlAudioFocus":False,"audioStreamCategory":"NONE","zoomFactor":1}]; a.write_text(json.dumps(d,indent=4)+"\\n"); m=c/"applications_menu.json"; d=json.loads(m.read_text()); d.setdefault("categories",[]); d.setdefault("items",[]); d["items"]=[x for x in d["items"] if x.get("action")!="hudiy_marketplace"]+[{"categories":["Hudiy"],"label":"Hudiy Marketplace","iconFontFamily":"Material Symbols Rounded","iconName":"storefront","action":"hudiy_marketplace"}]; m.write_text(json.dumps(d,indent=4)+"\\n"); print("Backup:",b)'
~~~

Review the printed backup path before restarting. The command changes only the two Hudiy configuration files named above. It does not modify the native Hudiy binary, package-manager state, systemd, or any community package.

### Install the WebView source into an existing Hudiy installation

Run these commands in a Linux shell on the Hudiy device:

~~~bash
TARGET="$HOME/.hudiy/share/marketplace/hudiy-marketplace"
mkdir -p "$TARGET/assets"
cp index.html app.js styles.css hudiy-theme.json "$TARGET/"
cp assets/MaterialSymbolsRounded.ttf "$TARGET/assets/"
~~~

Then merge the two registration fragments from `integration/hudiy/` into the existing Hudiy configuration files:

~~~text
$HOME/.hudiy/share/config/applications.json
$HOME/.hudiy/share/config/applications_menu.json
~~~

Do not replace the complete Hudiy configuration files. The application object belongs in `applications`, and the menu object belongs in `applications_menu.json` under `items`. Validate both JSON files and restart Hudiy through its normal restart flow.

### Open and use it in Hudiy

1. Open the normal Hudiy settings menu.
2. Open the Hudiy category.
3. Select Hudiy Marketplace.
4. Search by name, type, author, or description.
5. Use the Apps, Widgets, Overlays, or Configurations filters.
6. Sort by popularity, recency, or name.
7. Open a result to inspect its permissions, checksum, version, and supported Hudiy version.
8. Install only after an explicit confirmation and only when the safe Hudiy installation interface is available.

If no real catalogue is connected, the correct result is an empty state with zero cards.

## 1. Integration model

Hudiy Marketplace is not a second launcher, kiosk, or settings application.

The actual integration is:

~~~text
Hudiy native application
└── existing Hudiy WebView
    └── this source tree's index.html
        ├── app.js
        ├── styles.css
        ├── hudiy-theme.json
        └── assets/MaterialSymbolsRounded.ttf
~~~

Hudiy owns the outer application. The Marketplace page must not create:

- a second Hudiy header
- a second sidebar
- a second navigation system
- a kiosk mode
- a separate startup process
- a permanent Node.js service on the device

The local Node server is only for development preview and an optional catalogue proxy. Hudiy loads the static WebView source directly.

The fixed technical names are:

~~~text
window.hudiy
hudiy_marketplace
~/.hudiy
hudiy-theme.json
~~~

The fixed application action is:

~~~text
hudiy_marketplace
~~~

The source entry point used by the existing Hudiy installation is:

~~~text
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

## 2. What is in the source tree

~~~text
index.html
    The only visible page. It contains the Marketplace content and dialogs.

app.js
    Catalogue loading and validation, search, filters, sorting, dialogs,
    safe links, theme handling, and official Hudiy callbacks.

styles.css
    Material 3-style responsive WebView presentation.

hudiy-theme.json
    Local-preview theme fallback.

server.mjs
    Development HTTP server and optional catalogue proxy. Not a device runtime dependency.

package.json
    Node scripts. The server uses Node built-ins.

style.md
    Visual rules, bridge contract, catalogue contract, backend boundary,
    upload rules, installation boundary, and security rules.

assets/MaterialSymbolsRounded.ttf
    Material Symbols Rounded font used by the page.

integration/hudiy/applications.marketplace.json
    Application registration fragment.

integration/hudiy/applications_menu.marketplace.json
    Menu item registration fragment.

scripts/verify-hudiy-integration.mjs
    Integration and empty-catalogue checks.

scripts/install-hudiy-marketplace.sh
    Linux end-user installer with backup, JSON merge, validation, and optional reboot.

LICENSE
    Project license.
~~~

There are no demo cards, fixture objects, fake uploads, simulated installations, or additional HTML pages.

## 3. Hudiy compatibility

### 3.1 Linux support target

Hudiy is a Linux application. The official support documentation currently lists Raspberry Pi OS Desktop 64-bit and Debian Trixie 64-bit on supported hardware. It does not document an official Windows runtime. This repository therefore treats Linux as the only Hudiy device target.

Windows is not required for Marketplace device installation. All device commands in this guide use a POSIX shell and Linux paths. A separate desktop operating system may be used only to prepare or transfer files; it is not a supported Hudiy runtime target.

The official Hudiy documentation supports custom HTML/JavaScript applications, widgets, and overlays through an embedded Chromium WebView. The page can communicate with Hudiy through the `window.hudiy` object and the Hudiy API.

The supplied USB installation reports:

~~~text
Hudiy version: 1.24
Marketplace source directory: .hudiy/share/marketplace/hudiy-marketplace/
Application configuration: .hudiy/share/config/applications.json
Menu configuration: .hudiy/share/config/applications_menu.json
~~~

The USB contains the installed Hudiy binary and the existing Marketplace WebView source. The installer archive contains architecture-specific installer binaries, not the native Hudiy core source. This repository therefore integrates with the existing Hudiy WebView/API contract; it does not pretend to rebuild the proprietary Hudiy binary.

The official Hudiy platform documentation lists these Linux targets:

~~~text
Raspberry Pi Zero 2, 3B, 3B+, 4B, 5: Raspberry Pi OS Desktop 64-bit Trixie
Raspberry Pi 4B, 5:                 Raspberry Pi OS Desktop 64-bit Bookworm
x86_64:                             Debian Trixie 64-bit with Desktop
~~~

Always verify the target Hudiy release and operating system before deployment.

## 4. Local preview

### 4.1 Start

The recommended one-liner is:

~~~bash
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git && cd Hudiy-Marketplace && npm start
~~~

Open the clean preview URL:

~~~text
http://localhost:4174/
~~~

The server listens only on 127.0.0.1. Port 4174 is intentional.

### 4.2 Linux workstation or SSH session

~~~bash
git clone --depth 1 https://github.com/EpicNori/Hudiy-Marketplace.git
cd Hudiy-Marketplace
npm start
~~~

### 4.3 Empty catalogue behaviour

The preview is deliberately empty when no real catalogue is connected. It must never render placeholder data.

A safe catalogue response is:

~~~json
{
  "plugins": []
}
~~~

The page must show zero cards in this state.

### 4.4 Local environment

Create a local environment file when using the proxy:

~~~bash
cp .env.example .env
~~~

Example:

~~~dotenv
PORT=4174
SUPABASE_URL=https://mdzsxuxqrhnadmkroalq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_replace_with_project_publishable_key
~~~

Never put a service key, secret key, password, or OAuth secret in the page, repository, or device WebView.

## 5. Hudiy WebView integration

### 5.1 Official bridge

The page reads:

~~~javascript
window.hudiy.colorScheme
window.hudiy.marketplaceCatalog
window.hudiy.inputFocus
window.hudiy.activated
~~~

The page assigns:

~~~javascript
window.hudiy.onAttached
window.hudiy.onColorSchemeChanged
window.hudiy.onInputFocusChanged
window.hudiy.onActivatedChanged
window.hudiy.onMoveToNextControl
window.hudiy.onMoveToPreviousControl
window.hudiy.onTriggered
window.hudiy.onGoBack
~~~

The official Hudiy callbacks are invoked without requiring arguments. The page reads the current state from `window.hudiy`.

The Back contract is:

- `true`: the Marketplace handled the event, for example by closing a dialog
- `false`: Hudiy performs its native Back navigation

The page also implements focus movement for Hudiy key input. Touch input remains handled by Chromium.

### 5.2 Catalogue sources

The page checks catalogue sources in this order:

1. `window.hudiy.marketplaceCatalog`
2. configured HTTP or HTTPS catalogue endpoint
3. local `/api/catalog` during preview
4. no catalogue, resulting in the empty state

The page never falls back to demo data.

### 5.3 File URL compatibility

All local assets use relative paths:

~~~text
styles.css
app.js
hudiy-theme.json
assets/MaterialSymbolsRounded.ttf
~~~

The page uses a normal deferred script rather than relying on a module loader. This keeps the source compatible with Hudiy's local `file://` WebView and with the HTTP preview.

## 6. Registration fragments

The official Hudiy application configuration is:

~~~text
$HOME/.hudiy/share/config/applications.json
~~~

Add the object from `integration/hudiy/applications.marketplace.json` to the existing applications array:

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

The official menu configuration is:

~~~text
$HOME/.hudiy/share/config/applications_menu.json
~~~

Add the object from `integration/hudiy/applications_menu.marketplace.json` to the existing `items` array:

~~~json
{
  "categories": ["Hudiy"],
  "label": "Hudiy Marketplace",
  "iconFontFamily": "Material Symbols Rounded",
  "iconName": "storefront",
  "action": "hudiy_marketplace"
}
~~~

These files are fragments. They must not replace the complete Hudiy configuration files.

## 7. Theme integration

The page reads the live Hudiy colour scheme from:

~~~javascript
window.hudiy.colorScheme
~~~

It reacts to:

~~~javascript
window.hudiy.onColorSchemeChanged = function () {
  // app.js reads window.hudiy.colorScheme again.
};
~~~

Supported roles:

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

When the bridge is absent in local preview, `hudiy-theme.json` is loaded as the fallback. A live Hudiy theme always takes precedence.

## 8. Catalogue and Supabase

### 8.1 Current backend

The current project is connected to the Supabase project:

~~~text
Project: hudiy-marketplace
Reference: mdzsxuxqrhnadmkroalq
Region: eu-central-1
~~~

The intended resources are:

~~~text
plugins
plugin_versions
plugin_uploads
plugin_downloads
plugin_ratings
private Storage bucket: plugin-packages
~~~

Row Level Security must expose only published catalogue metadata to public readers.

The frontend remains backend-agnostic. Firebase can provide the same contract using Google Sign-In, Firestore, Cloud Storage, and Security Rules.

### 8.2 Manifest

A published entry must contain:

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
  "entrypoints": {
    "webview": "dist/index.js"
  },
  "files": [
    "dist/index.js"
  ],
  "checksum": "sha256:..."
}
~~~

Allowed types:

~~~text
app
widget
overlay
configuration
~~~

The detail dialog can display downloads, rating, updated date, permissions, checksum, and supported Hudiy version when supplied.

Invalid entries are rejected before rendering.

## 9. Upload and installation boundaries

### 9.1 Upload

The upload dialog describes the production workflow but does not simulate it.

A production backend must:

1. authenticate the community member with Google OAuth
2. receive the package and manifest
3. validate every manifest field
4. validate package paths, extensions, size, and checksum
5. store the package privately
6. review and publish the validated version
7. expose only published metadata

### 9.2 Installation

The WebView never executes a package and never changes the operating system directly.

After explicit user confirmation, it may pass only:

~~~javascript
{
  id,
  version,
  checksum
}
~~~

to:

~~~javascript
window.hudiy.installMarketplacePlugin
~~~

If that safe native Hudiy installation interface is unavailable, installation is refused. The Marketplace does not silently install files.

## 10. Security rules

Every community entry is visibly labelled community-made and unverified. This is a warning, not a safety approval.

The implementation must:

- never guarantee safety, virus-free operation, or functional correctness
- render untrusted catalogue values with DOM text nodes
- allow only `http://` and `https://` external URLs
- reject `javascript:`, `data:`, `file:`, and other schemes
- require explicit user action before installation
- show permissions before installation
- validate hashes and versions
- reject path traversal and absolute paths
- reject shell, Python, systemd, package-manager, and arbitrary filesystem actions
- keep package Storage private
- keep Supabase service and secret keys out of the WebView
- enforce Supabase RLS or Firebase Security Rules server-side

## 11. Device deployment

### 11.1 Understand the two Linux paths

The mounted USB path is not the Hudiy runtime path. For example:

~~~text
USB mount:       /media/pi/HUDIY/.hudiy/share/marketplace/hudiy-marketplace/
Hudiy runtime:   /home/pi/.hudiy/share/marketplace/hudiy-marketplace/
~~~

The `file:///home/pi/...` URL in the Hudiy registration is resolved on the Raspberry Pi or Linux device. A USB copy becomes active only after its files are transferred to the Hudiy device's `$HOME/.hudiy` tree.

### 11.2 Preflight checklist

Before changing a device, confirm:

- Hudiy is already installed and starts normally.
- The target user is the same user that runs Hudiy, normally `pi`.
- The device has enough free storage for the WebView source.
- The device has internet access if the catalogue is remote.
- You can access a terminal locally or over SSH.
- The repository revision you intend to install is trusted.
- You have a rollback copy of both Hudiy JSON configuration files.

Do not install the Marketplace by replacing the entire `.hudiy` directory. Run every command from a Linux shell on the target device.

### 11.3 Back up before deployment

Run on the Hudiy device:

~~~bash
set -eu
CONFIG="$HOME/.hudiy/share/config"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$CONFIG/marketplace-backup-$STAMP"
mkdir -p "$BACKUP"
cp -a "$CONFIG/applications.json" "$BACKUP/applications.json"
cp -a "$CONFIG/applications_menu.json" "$BACKUP/applications_menu.json"
if [ -d "$HOME/.hudiy/share/marketplace/hudiy-marketplace" ]; then
  cp -a "$HOME/.hudiy/share/marketplace/hudiy-marketplace" "$BACKUP/hudiy-marketplace"
fi
printf 'Backup created at %s\n' "$BACKUP"
~~~

Keep the printed backup path. Do not continue if either configuration file cannot be backed up.

### 11.4 Copy from a repository checkout on the device

~~~bash
set -eu
SOURCE="${1:-$PWD}"
TARGET="$HOME/.hudiy/share/marketplace/hudiy-marketplace"
test -f "$SOURCE/index.html"
test -f "$SOURCE/app.js"
test -f "$SOURCE/styles.css"
test -f "$SOURCE/hudiy-theme.json"
test -f "$SOURCE/assets/MaterialSymbolsRounded.ttf"
install -d "$TARGET/assets"
install -m 0644 "$SOURCE/index.html" "$SOURCE/app.js" "$SOURCE/styles.css" "$SOURCE/hudiy-theme.json" "$TARGET/"
install -m 0644 "$SOURCE/assets/MaterialSymbolsRounded.ttf" "$TARGET/assets/"
~~~

This copies the Marketplace WebView source only. It does not start a second server and does not install a plugin package.

### 11.5 Copy from a Linux workstation or mounted USB drive

The USB is a Linux-readable transfer medium. On the Hudiy device, identify its mount point:

~~~bash
lsblk -f
findmnt -t vfat,exfat,ext4,ntfs
~~~

Copy the repository to the device with `scp` from another Linux machine:

~~~bash
scp -r ./Hudiy-Marketplace pi@hudiy:/home/pi/hudiy-marketplace-source
~~~

Or copy it from the mounted USB path. Then run on the Hudiy device:

~~~bash
cd "$HOME/hudiy-marketplace-source"
TARGET="$HOME/.hudiy/share/marketplace/hudiy-marketplace"
install -d "$TARGET/assets"
install -m 0644 index.html app.js styles.css hudiy-theme.json "$TARGET/"
install -m 0644 assets/MaterialSymbolsRounded.ttf "$TARGET/assets/"
~~~

Replace `pi@hudiy` with the actual Hudiy username and host. Verify the destination before running the command.

### 11.6 Merge and validate registration

Add the application fragment to the `applications` array in:

~~~text
$HOME/.hudiy/share/config/applications.json
~~~

Add the menu fragment to the `items` array in:

~~~text
$HOME/.hudiy/share/config/applications_menu.json
~~~

The action must be identical in both places:

~~~text
hudiy_marketplace
~~~

Validate the files before restarting Hudiy:

~~~bash
node -e "const fs=require('fs'); for (const f of process.argv.slice(1)) JSON.parse(fs.readFileSync(f,'utf8')); console.log('Hudiy JSON valid')" "$HOME/.hudiy/share/config/applications.json" "$HOME/.hudiy/share/config/applications_menu.json"
~~~

If the files do not parse, restore the backup. Do not restart Hudiy with invalid JSON.

### 11.7 Restart and first launch

Use the normal Hudiy restart flow. If a full reboot is required by the installed Hudiy release:

~~~bash
sudo reboot
~~~

After Hudiy starts:

1. Open the normal Hudiy settings or applications menu.
2. Select the Hudiy category.
3. Select Hudiy Marketplace.
4. Confirm that the page opens inside Hudiy's existing frame.
5. Confirm that the surrounding Hudiy Back action remains native.
6. Confirm that the page shows an empty state when no catalogue is published.

### 11.8 Update an existing installation

For an update, repeat the backup, source-copy, JSON-validation, and restart sequence. The source update replaces only the Marketplace WebView files. The registration action remains `hudiy_marketplace`.

Do not mix files from different Marketplace revisions. Update `index.html`, `app.js`, `styles.css`, `hudiy-theme.json`, and the font together.

### 11.9 Roll back

Use the backup path created before deployment:

~~~bash
set -eu
BACKUP="$HOME/.hudiy/share/config/marketplace-backup-YYYYMMDD-HHMMSS"
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

Replace the timestamp only after confirming it is the intended directory inside `$HOME/.hudiy/share/config/`.

Development happens in this repository. Hudiy loads the resulting static WebView source from its existing Marketplace application directory:

~~~text
$HOME/.hudiy/share/marketplace/hudiy-marketplace/
~~~

The deployment output is:

~~~text
index.html
app.js
styles.css
hudiy-theme.json
assets/MaterialSymbolsRounded.ttf
~~~

Deployment does not start a second application. It updates the source files used by the existing Hudiy WebView registration.

Before deployment:

- validate the target Hudiy version
- preserve the existing Hudiy configuration files
- merge the two registration fragments into the existing arrays
- validate JSON
- restart Hudiy through its normal lifecycle

The USB drive is a deployment source for the existing Hudiy installation, not a native Hudiy build tree.

## 12. Verification

Run:

~~~bash
node --check app.js
node --check server.mjs
npm run test:integration
git diff --check
~~~

The integration test verifies:

- one HTML page
- relative WebView paths
- required Hudiy bridge names
- safe URL validation
- the empty-catalogue boundary
- no demo names
- application and menu registration fragments
- local preview availability

Manually verify:

- the page loads from the Hudiy `file://` URL
- the page has no second navigation
- the live theme changes with Hudiy
- dialogs close through Hudiy Back
- keyboard focus callbacks work
- search, filters, sorting, and detail dialogs work
- zero cards appear without a real catalogue
- the page has no horizontal overflow
- the visible preview URL remains `http://localhost:4174/`

## 13. Troubleshooting

### The menu entry is missing

Check that the Marketplace item is inside the existing `items` array, both registration objects use `hudiy_marketplace`, and Hudiy has been restarted.

### The WebView is blank

Check that all five deployment outputs exist under:

~~~text
$HOME/.hudiy/share/marketplace/hudiy-marketplace/
~~~

Also verify the file URL in `applications.json` and that every HTML asset path is relative.

### The catalogue is empty

An empty catalogue is expected when there are no published records or no reachable backend. Check:

~~~bash
curl http://localhost:4174/api/catalog
~~~

Do not add test cards to diagnose this state.

### Back does not return to Hudiy

The page must return `false` from `window.hudiy.onGoBack` when no Marketplace dialog is open.

### The theme does not update

Confirm that the page is running inside Hudiy, that `window.hudiy.colorScheme` exists, and that `onColorSchemeChanged` is assigned after the page loads.

## 14. Sources and license

Primary references:

- [Official Hudiy documentation](https://github.com/wiboma/hudiy/blob/main/README.md)
- [Official Hudiy overview](https://hudiy.eu/overview/)
- [Official Hudiy FAQ](https://hudiy.eu/faq/)
- [Official Hudiy product page](https://hudiy.eu/product/hudiy/)

See [LICENSE](LICENSE).
