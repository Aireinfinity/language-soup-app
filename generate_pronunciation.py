#!/usr/bin/env python3
# Generate pronunciation audio using Edge TTS (FREE!)

import asyncio
import edge_tts
import os

async def generate_pronunciation():
    print("🔊 Generating pronunciation audio with Edge TTS...\n")
    
    # Text to pronounce (corrected version)
    text = "Je regarde mon ordinateur en ce moment"
    
    # French neural voice (natural sounding)
    voice = "fr-FR-DeniseNeural"  # Female voice
    # Alternative: "fr-FR-HenriNeural" for male voice
    
    output_file = "/Users/Aireinfinity/.gemini/antigravity/brain/f0bac817-00e1-47d6-9ae8-0f44eee85479/pronunciation_demo.mp3"
    
    print(f"Text: \"{text}\"")
    print(f"Voice: {voice}")
    print(f"Output: {output_file}\n")
    
    # Generate audio
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    
    print(f"✅ Audio generated successfully!")
    print(f"📁 Saved to: {output_file}")
    print(f"\n🎧 You can play this file to hear the pronunciation!\n")
    
    # Also generate sample phrases
    print("─" * 60)
    print("\n🎯 Generating sample phrase pronunciations...\n")
    
    phrases = [
        ("beginner", "Je regarde mon téléphone"),
        ("intermediate", "Je suis en train de regarder une vidéo sur YouTube"),
        ("advanced", "En ce moment, j'observe les nuages par la fenêtre")
    ]
    
    for level, phrase in phrases:
        output = f"/Users/Aireinfinity/.gemini/antigravity/brain/f0bac817-00e1-47d6-9ae8-0f44eee85479/sample_phrase_{level}.mp3"
        communicate = edge_tts.Communicate(phrase, voice)
        await communicate.save(output)
        print(f"✅ {level.upper()}: \"{phrase}\"")
        print(f"   Saved to: sample_phrase_{level}.mp3\n")
    
    print("🎉 All pronunciation audio generated!")
    print("   Quality: Natural neural voice (Microsoft Edge TTS)")
    print("   Cost: $0 (100% FREE!)\n")

if __name__ == "__main__":
    asyncio.run(generate_pronunciation())
