#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY="https://github.com/EpicNori/Hudiy-Marketplace"
REF="main"
SOURCE_ROOT=""
ASSUME_YES=0
RESTART=0

usage() {
  cat <<'EOF'
Hudiy Marketplace Linux installer

Usage:
  ./install-hudiy-marketplace.sh [--yes] [--restart] [--ref BRANCH] [--source PATH]

Options:
  --yes          Skip the confirmation prompt.
  --restart      Reboot after a successful installation.
  --ref BRANCH   Download a Git branch. Default: main.
  --source PATH  Use an existing local repository instead of downloading it.
  --help         Show this help.

This installs only the Hudiy Marketplace WebView source and its Hudiy
application/menu registration. It never installs or executes community
plugins.
EOF
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes) ASSUME_YES=1; shift ;;
    --restart) RESTART=1; shift ;;
    --ref)
      [ "$#" -ge 2 ] || fail "--ref requires a branch."
      REF="$2"
      shift 2
      ;;
    --source)
      [ "$#" -ge 2 ] || fail "--source requires a local repository path."
      SOURCE_ROOT="$2"
      shift 2
      ;;
    --help) usage; exit 0 ;;
    *) fail "Unknown option: $1. Use --help." ;;
  esac
done

[ "$(uname -s)" = "Linux" ] || fail "Run this installer on the Hudiy Linux device."
[ "$EUID" -ne 0 ] || fail "Run as the Linux user that starts Hudiy, not as root."
[ -n "$HOME" ] || fail "HOME is not set."
[ -d "$HOME/.hudiy/share/config" ] || fail "Hudiy was not found at $HOME/.hudiy/share/config."

for command_name in python3 install; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command not found: $command_name"
done

if [ -z "$SOURCE_ROOT" ] && [ -f "$BASH_SOURCE" ]; then
  SCRIPT_DIRECTORY="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
  if [ -f "$SCRIPT_DIRECTORY/../index.html" ] && [ -f "$SCRIPT_DIRECTORY/../app.js" ]; then
    SOURCE_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"
  fi
fi

TEMP_ROOT=""
cleanup() {
  if [ -n "$TEMP_ROOT" ] && [ -d "$TEMP_ROOT" ]; then
    rm -rf -- "$TEMP_ROOT"
  fi
}
trap cleanup EXIT

if [ -z "$SOURCE_ROOT" ]; then
  command -v curl >/dev/null 2>&1 || fail "Required command not found: curl"
  command -v tar >/dev/null 2>&1 || fail "Required command not found: tar"
  case "$REF" in
    *[!A-Za-z0-9._/-]*) fail "The branch contains unsupported characters." ;;
  esac
  TEMP_ROOT="$(mktemp -d)"
  ARCHIVE="$TEMP_ROOT/marketplace.tar.gz"
  printf 'Downloading Hudiy Marketplace source from %s at %s...\n' "$REPOSITORY" "$REF"
  curl --fail --location --silent --show-error --retry 2 \
    "$REPOSITORY/archive/refs/heads/$REF.tar.gz" \
    --output "$ARCHIVE"
  tar --extract --gzip --file "$ARCHIVE" --directory "$TEMP_ROOT"
  SOURCE_ROOT="$(find "$TEMP_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'Hudiy-Marketplace-*' -print -quit)"
fi

[ -n "$SOURCE_ROOT" ] && [ -d "$SOURCE_ROOT" ] || fail "Marketplace source directory was not found."
SOURCE_ROOT="$(cd "$SOURCE_ROOT" && pwd)"

for required_file in index.html app.js styles.css hudiy-theme.json assets/MaterialSymbolsRounded.ttf; do
  [ -f "$SOURCE_ROOT/$required_file" ] || fail "Missing Marketplace source file: $required_file"
done

if [ "$ASSUME_YES" -eq 0 ]; then
  [ -r /dev/tty ] || fail "Interactive confirmation is unavailable. Re-run with --yes after reviewing the source."
  printf 'Install Hudiy Marketplace into %s? [y/N] ' "$HOME/.hudiy"
  read -r answer < /dev/tty
  [[ "$answer" =~ ^[Yy]$ ]] || { printf 'Installation cancelled.\n'; exit 0; }
fi

CONFIG_ROOT="$HOME/.hudiy/share/config"
TARGET_ROOT="$HOME/.hudiy/share/marketplace/hudiy-marketplace"
APPLICATIONS_FILE="$CONFIG_ROOT/applications.json"
MENU_FILE="$CONFIG_ROOT/applications_menu.json"
BACKUP_ROOT="$CONFIG_ROOT/marketplace-backup-$(date +%Y%m%d-%H%M%S)"

[ -f "$APPLICATIONS_FILE" ] || fail "Missing $APPLICATIONS_FILE"
[ -f "$MENU_FILE" ] || fail "Missing $MENU_FILE"

mkdir -p "$BACKUP_ROOT"
cp -a "$APPLICATIONS_FILE" "$BACKUP_ROOT/applications.json"
cp -a "$MENU_FILE" "$BACKUP_ROOT/applications_menu.json"
if [ -d "$TARGET_ROOT" ]; then
  cp -a "$TARGET_ROOT" "$BACKUP_ROOT/hudiy-marketplace"
fi

install -d "$TARGET_ROOT/assets"
install -m 0644 "$SOURCE_ROOT/index.html" "$SOURCE_ROOT/app.js" "$SOURCE_ROOT/styles.css" "$SOURCE_ROOT/hudiy-theme.json" "$TARGET_ROOT/"
install -m 0644 "$SOURCE_ROOT/assets/MaterialSymbolsRounded.ttf" "$TARGET_ROOT/assets/"

python3 - "$APPLICATIONS_FILE" "$MENU_FILE" "$TARGET_ROOT/index.html" <<'PY'
import json
import os
import stat
import sys
import tempfile
from pathlib import Path

applications_path = Path(sys.argv[1])
menu_path = Path(sys.argv[2])
entrypoint = Path(sys.argv[3]).resolve()

def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)

def write_json_atomically(path, value):
    mode = stat.S_IMODE(path.stat().st_mode)
    descriptor, temporary_name = tempfile.mkstemp(prefix="." + path.name + ".", suffix=".tmp", dir=path.parent, text=True)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, indent=4, ensure_ascii=False)
            handle.write("\n")
        os.chmod(temporary_name, mode)
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise

applications = read_json(applications_path)
menu = read_json(menu_path)

if not isinstance(applications, dict) or not isinstance(applications.get("applications"), list):
    raise SystemExit(f"{applications_path} does not contain an applications array")
if not isinstance(menu, dict) or not isinstance(menu.get("items"), list):
    raise SystemExit(f"{menu_path} does not contain an items array")

applications["applications"] = [item for item in applications["applications"] if not isinstance(item, dict) or item.get("action") != "hudiy_marketplace"]
applications["applications"].append({
    "action": "hudiy_marketplace",
    "url": entrypoint.as_uri(),
    "allowBackground": False,
    "controlAudioFocus": False,
    "audioStreamCategory": "NONE",
    "zoomFactor": 1,
})

menu["items"] = [item for item in menu["items"] if not isinstance(item, dict) or item.get("action") != "hudiy_marketplace"]
menu["items"].append({
    "categories": ["Hudiy"],
    "label": "Hudiy Marketplace",
    "iconFontFamily": "Material Symbols Rounded",
    "iconName": "storefront",
    "action": "hudiy_marketplace",
})

write_json_atomically(applications_path, applications)
write_json_atomically(menu_path, menu)
PY

for installed_file in index.html app.js styles.css hudiy-theme.json assets/MaterialSymbolsRounded.ttf; do
  [ -f "$TARGET_ROOT/$installed_file" ] || fail "Installed file is missing: $installed_file"
done

printf '\nHudiy Marketplace installed successfully.\n'
printf 'WebView source: %s\n' "$TARGET_ROOT"
printf 'Backup: %s\n' "$BACKUP_ROOT"
printf 'Open Hudiy settings, choose Hudiy, then choose Hudiy Marketplace.\n'

if [ "$RESTART" -eq 1 ]; then
  command -v sudo >/dev/null 2>&1 || fail "sudo is required for --restart."
  printf 'Restarting Hudiy device...\n'
  sudo reboot
else
  printf 'Restart Hudiy through its normal flow before first use.\n'
fi
