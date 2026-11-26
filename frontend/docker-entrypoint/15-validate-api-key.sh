#!/bin/sh
set -eu

if [ -n "${ATIE_API_KEY:-}" ]; then
  case "$ATIE_API_KEY" in
    *[!A-Za-z0-9._-]*)
      echo "ERROR: ATIE_API_KEY contains unsupported characters for Nginx proxy injection." >&2
      exit 1
      ;;
  esac
fi
