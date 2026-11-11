#!/usr/bin/env bash
# Renames the app everywhere users see its name: launcher label and texts (5 languages), Play listing titles,
# privacy policy and the pair-link pages. The package, the repository and the Firebase project keep their names.
#   tools/rename-app.sh Questborn Qore
set -euo pipefail
old="$1"; new="$2"
cd "$(dirname "$0")/.."
files=(
  app/src/main/res/values*/strings.xml
  fastlane/metadata/android/*/title.txt
  fastlane/metadata/android/*/short_description.txt
  fastlane/metadata/android/*/full_description.txt
  PRIVACY.md
  firebase/hosting/index.html
  firebase/hosting/p/index.html
)
for f in "${files[@]}"; do
  [ -f "$f" ] && sed -i "s/\b${old}\b/${new}/g" "$f"
done
grep -rl "\b${old}\b" "${files[@]}" 2>/dev/null && { echo "still mentions ${old} (check by hand)"; exit 1; } || true
echo "renamed ${old} -> ${new}; the Play title must stay within 30 characters:"
cat fastlane/metadata/android/en-US/title.txt
