#!/bin/bash
# Alias for production Docker deploy — see deploy.sh
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" "$@"
