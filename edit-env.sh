#!/bin/bash
# Helper script to edit .env.local
echo "Opening .env.local for editing..."
echo ""
echo "Current content:"
cat .env.local 2>/dev/null || echo "File doesn't exist yet"
echo ""
echo "To edit, run one of these:"
echo "  nano .env.local"
echo "  vim .env.local"
echo "  code .env.local --no-ignore"
echo ""
echo "Or paste this command with your API key:"
echo "echo 'GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE' > .env.local"
