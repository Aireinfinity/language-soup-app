#!/usr/bin/env python3
"""
Generate pronunciation sample with ElevenLabs (free tier)
Requires: pip install elevenlabs
"""

import os

print("🎧 ElevenLabs TTS Sample Generator\n")
print("To test this, you need an ElevenLabs API key (free):")
print("1. Sign up at: https://elevenlabs.io")
print("2. Get your API key from: https://elevenlabs.io/app/settings/api-keys")
print("3. Free tier: 10,000 characters/month\n")

api_key = input("Enter your ElevenLabs API key (or press Enter to skip): ").strip()

if api_key:
    try:
        from elevenlabs import generate, save, set_api_key
        
        set_api_key(api_key)
        
        text = "Salut, je regarde la porte de ma chambre"
        
        print(f"\n🔊 Generating audio for: '{text}'")
        print("Using voice: Rachel (French)")
        
        audio = generate(
            text=text,
            voice="Rachel",  # Natural female voice
            model="eleven_multilingual_v2"  # Best quality
        )
        
        output_path = "/Users/Aireinfinity/.gemini/antigravity/brain/f0bac817-00e1-47d6-9ae8-0f44eee85479/elevenlabs_sample.mp3"
        save(audio, output_path)
        
        print(f"\n✅ Audio saved to: {output_path}")
        print("\n🎧 Playing now...")
        os.system(f"afplay {output_path}")
        
        print("\n📊 Quality comparison:")
        print("macOS voice:    ⭐⭐ (robotic)")
        print("Edge TTS:       ⭐⭐⭐ (decent)")
        print("ElevenLabs:     ⭐⭐⭐⭐⭐ (human-like)")
        
    except ImportError:
        print("\n❌ elevenlabs package not installed")
        print("Run: pip install elevenlabs")
    except Exception as e:
        print(f"\n❌ Error: {e}")
else:
    print("\n⏭️  Skipped - No API key provided")
    print("\n💡 You can also test online:")
    print("   https://elevenlabs.io/text-to-speech")
    print("   Just paste: 'Salut, je regarde la porte de ma chambre'")
    print("   Select French voice and listen!")
