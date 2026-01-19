#!/bin/bash
# Generate pronunciation audio using macOS built-in TTS (quick test)

echo "🔊 Generating pronunciation audio..."
echo ""
echo "Corrected sentence: 'Salut, je regarde la porte de ma chambre'"
echo ""

# Use macOS say command with French voice
say -v "Thomas" -o /Users/Aireinfinity/.gemini/antigravity/brain/f0bac817-00e1-47d6-9ae8-0f44eee85479/pronunciation_corrected.aiff "Salut, je regarde la porte de ma chambre"

echo "✅ Audio saved to: pronunciation_corrected.aiff"
echo ""
echo "🎧 Playing audio now..."
afplay /Users/Aireinfinity/.gemini/antigravity/brain/f0bac817-00e1-47d6-9ae8-0f44eee85479/pronunciation_corrected.aiff

echo ""
echo "📝 Note: This uses macOS built-in French voice (Thomas)"
echo "   In production, we'll use Edge TTS for better quality"
