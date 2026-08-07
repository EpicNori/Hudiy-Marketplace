# Hudiy Marketplace — style and integration contract

## Integration model

Hudiy Marketplace is the source of one Hudiy custom application. It is loaded by Hudiy's embedded Chromium WebView and communicates with Hudiy through the official `window.hudiy` bridge.

Hudiy owns:

- the settings frame
- the surrounding navigation
- the native Back action
- the WebView lifecycle
- the native Material 3 colour scheme
- native actions and APIs

This project owns only the Marketplace content inside that WebView. It must not add a product sidebar, kiosk shell, duplicate Hudiy header, second navigation system, or second HTML page.

The local preview server exists only for development and the optional catalogue proxy. The Hudiy application itself loads `index.html` directly from:

~~~text
file:///home/pi/.hudiy/share/marketplace/hudiy-marketplace/index.html
~~~

The source uses relative asset paths so the same WebView source can run from the local preview and from the Hudiy file URL.

The following technical names are fixed:

~~~text
window.hudiy
hudiy_marketplace
~/.hudiy
hudiy-theme.json
~~~

## Visual system

- Material 3 surfaces, typography, states, and colour roles.
- Touch targets are at least 44 CSS pixels.
- No horizontal page overflow.
- Responsive layouts for narrow phones, tablets, and wide Hudiy touchscreens.
- One-column layout at narrow widths, two columns at medium widths, and three columns at wide widths.
- Light and dark Hudiy colour schemes are supported.
- All community entries visibly use the labels Community-made and unverified.
- Community data is rendered through DOM text nodes, never as untrusted HTML.

The Marketplace page contains:

- a compact Hudiy context label
- catalogue status
- search
- type filters
- sort control
- safety warning
- catalogue cards
- detail and upload dialogs

It does not contain a second Hudiy navigation or a separate settings rail.

## Hudiy WebView bridge

The official Hudiy bridge is an object exposed to the page as `window.hudiy`.

The integration reads:

~~~javascript
window.hudiy.colorScheme
window.hudiy.marketplaceCatalog
window.hudiy.inputFocus
window.hudiy.activated
~~~

The integration assigns these official callbacks:

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

Hudiy invokes the colour, input-focus, activation, trigger, and attachment callbacks without requiring arguments. The page reads the current state again from the bridge.

`onGoBack` returns:

- `true` when the page closes an open Marketplace dialog
- `false` when Hudiy must perform its native Back navigation

The page does not call a missing native installation function. If `window.hudiy.installMarketplacePlugin` is not provided by the future safe Hudiy installation layer, installation is refused with an explanatory message.

## Theme contract

The page first reads:

~~~javascript
window.hudiy.colorScheme
~~~

It then listens for:

~~~javascript
window.hudiy.onColorSchemeChanged = function () {
  // Read window.hudiy.colorScheme again.
};
~~~

The supported Material 3 roles are:

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

When the Hudiy bridge is unavailable during local preview, `hudiy-theme.json` is loaded as the fallback. The fallback is not a second theme system and must never override a live Hudiy colour scheme.

Only validated hexadecimal and RGB/RGBA colour strings are written to CSS variables.

## Catalogue contract

The default local endpoint is:

~~~text
/api/catalog
~~~

The response may be either an array or an object containing a `plugins` array:

~~~json
{
  "plugins": []
}
~~~

A catalogue response with no published entries is valid. It must produce the empty state and zero cards.

A published manifest must contain:

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

Allowed type values:

~~~text
app
widget
overlay
configuration
~~~

Optional display fields include downloads, rating, updatedAt, and links. Links are accepted only when their URL uses `http://` or `https://`.

The frontend rejects:

- missing required fields
- unsupported types
- invalid checksums
- path traversal
- absolute paths
- disallowed file extensions
- entrypoints outside the allowed package paths
- unsafe external URL schemes

## Backend boundary

The frontend remains backend-agnostic.

It can receive a real catalogue from:

1. `window.hudiy.marketplaceCatalog`
2. a configured HTTP or HTTPS catalogue endpoint
3. the local `/api/catalog` proxy
4. a controlled local JSON file during development

Supabase is the current backend implementation. The local preview uses the public publishable key and never exposes a service or secret key to the page.

Google OAuth is part of the planned authenticated upload flow. The OAuth redirect must be restricted to approved Hudiy WebView and development origins.

Recommended Supabase resources:

- `plugins`
- `plugin_versions`
- `plugin_uploads`
- `plugin_downloads`
- `plugin_ratings`
- private `plugin-packages` Storage bucket

Row Level Security (RLS) must limit public reads to published records and limit writes to authenticated, validated workflows.

Firebase can provide the same contract using Google Sign-In, Firestore, Cloud Storage, and Security Rules.

## Upload boundary

The upload dialog describes the intended workflow but does not simulate a login or upload.

The production workflow is:

1. authenticate through the selected backend
2. upload a package and manifest
3. validate the package server-side
4. verify paths, extensions, size, version, and checksum
5. store the package privately
6. review and publish the validated version
7. expose only published metadata to the public catalogue

No package may contain or request:

- shell commands
- Python execution
- systemd units
- package-manager commands
- arbitrary absolute filesystem paths
- automatic startup hooks
- silent installation

## Installation boundary

The Marketplace does not execute or install community files.

After explicit user confirmation, the page may pass only:

~~~javascript
{
  id,
  version,
  checksum
}
~~~

to the safe Hudiy installation interface:

~~~javascript
window.hudiy.installMarketplacePlugin
~~~

The native Hudiy installation layer must perform the final validation, permission review, package retrieval, checksum verification, and restricted installation. The WebView must not make direct system changes.

## URL and cache rules

The normal visible URL is:

~~~text
http://localhost:4174/
~~~

Technical cache keys such as `rev`, `fresh`, and `cache` are removed with `history.replaceState`. They must never re-enable demo data or appear in the normal visible URL.

External URLs are accepted only when their protocol is `http:` or `https:`. The schemes `javascript:`, `data:`, `file:`, and all other schemes are rejected.

## Hudiy registration

The application registration object is stored in:

~~~text
integration/hudiy/applications.marketplace.json
~~~

The menu item fragment is stored in:

~~~text
integration/hudiy/applications_menu.marketplace.json
~~~

The runtime Hudiy files use:

~~~text
$HOME/.hudiy/share/config/applications.json
$HOME/.hudiy/share/config/applications_menu.json
$HOME/.hudiy/share/marketplace/hudiy-marketplace/
~~~

The two JSON fragments must be merged into the existing Hudiy arrays. They are not replacements for the complete Hudiy configuration files.

The action name must remain unique:

~~~text
hudiy_marketplace
~~~

## Local preview

Run:

~~~bash
npm start
~~~

The preview is:

~~~text
http://localhost:4174/
~~~

The preview must show zero cards when no real catalogue is connected. It must not contain demo fixtures, fake uploads, simulated installations, or placeholder plugin names.

## Verification

Run:

~~~bash
node --check app.js
node --check server.mjs
npm run test:integration
git diff --check
~~~

Also verify manually:

- the page loads from a Hudiy `file://` URL
- all CSS, JavaScript, font, and theme paths remain relative
- Hudiy Back closes dialogs and otherwise leaves the page
- light and dark colour changes are applied
- keyboard callbacks can move focus and trigger controls
- search, filters, sorting, and detail dialogs work
- no cards appear without a real catalogue
- no unsafe URL is accepted
- no horizontal overflow occurs
