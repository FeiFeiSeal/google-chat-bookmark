#!/usr/bin/env bash

set -Eeuo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

for command_name in node npm zip unzip shasum awk; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '缺少必要指令：%s\n' "$command_name" >&2
    exit 1
  fi
done

printf '建立 production build...\n'
npm run build

manifest_path="$project_root/dist/manifest.json"
if [[ ! -f "$manifest_path" ]]; then
  printf '找不到 %s\n' "$manifest_path" >&2
  exit 1
fi

version="$(node -p "JSON.parse(require('node:fs').readFileSync('dist/manifest.json', 'utf8')).version")"
package_version="$(node -p "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')).version")"
release_date="${RELEASE_DATE:-$(date +%F)}"
if [[ "$version" != "$package_version" ]]; then
  printf '版本不一致：manifest=%s，package=%s\n' "$version" "$package_version" >&2
  exit 1
fi
if [[ ! "$version" =~ ^[0-9A-Za-z._-]+$ || ! "$release_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  printf '版本或日期格式無效：version=%s，date=%s\n' "$version" "$release_date" >&2
  exit 1
fi
archive_name="google-chat-bookmark-v${version}-test-${release_date}.zip"
release_dir="$project_root/releases"
archive_path="$release_dir/$archive_name"

mkdir -p "$release_dir"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/google-chat-bookmark-release.XXXXXX")"
cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

stage_dir="$temp_dir/package"
temp_archive="$temp_dir/$archive_name"
mkdir -p "$stage_dir"
cp -R "$project_root/dist/." "$stage_dir/"

(
  cd "$stage_dir"
  zip -qr "$temp_archive" .
)

unzip -tq "$temp_archive" >/dev/null
unzip -p "$temp_archive" manifest.json >/dev/null
mv -f "$temp_archive" "$archive_path"

checksum="$(shasum -a 256 "$archive_path" | awk '{print $1}')"

printf '\n測試 ZIP 已完成：\n%s\n\nSHA-256：\n%s\n' "$archive_path" "$checksum"
