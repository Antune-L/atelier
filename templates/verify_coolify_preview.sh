#!/bin/sh
if [ "$#" -ne 0 ]; then
  printf '%s\n' 'This verifier accepts no arguments.' >&2
  exit 1
fi
tool_base="$(dirname "$0")/../scripts/verifyCoolifyPreview"
if [ -f "$tool_base.js" ]; then
  exec bun "$tool_base.js"
fi
exec bun "$tool_base.ts"
