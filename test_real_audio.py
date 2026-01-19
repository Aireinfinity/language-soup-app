#!/usr/bin/env python3
"""
Manual test of free AI models with Noah's real voice memo
"""

import requests
import json
import os

# Audio file path
AUDIO_FILE = "/tmp/noah_french_voice.m4a"

print("🎤 Testing Voice Feedback with Noah's Real Audio\n")
print("=" * 60)

# ============================================
# STEP 1: Transcribe with Hugging Face Whisper
# ============================================

print("\n📝 STEP 1: Transcribing with Hugging Face Whisper API...")
print("(Using free tier - 300 requests/hour)\n")

# You'll need to provide your Hugging Face API token
# Get it from: https://huggingface.co/settings/tokens
HF_API_TOKEN = input("Enter your Hugging Face API token (or press Enter to skip): ").strip()

if HF_API_TOKEN:
    print("\nCalling Whisper API...")
    
    API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    
    with open(AUDIO_FILE, "rb") as f:
        data = f.read()
    
    response = requests.post(API_URL, headers=headers, data=data)
    result = response.json()
    
    if "text" in result:
        transcription = result["text"]
        print(f"\n✅ Transcription: \"{transcription}\"")
        print(f"   Confidence: High (Whisper doesn't return confidence scores)")
        
        # ============================================
        # STEP 2: Get corrections with Groq Llama 3
        # ============================================
        
        print("\n" + "=" * 60)
        print("\n💡 STEP 2: Getting corrections with Groq Llama 3...")
        print("(Using free tier - 1000 requests/day)\n")
        
        GROQ_API_KEY = input("Enter your Groq API key (or press Enter to skip): ").strip()
        
        if GROQ_API_KEY:
            print("\nCalling Groq API...")
            
            GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            
            prompt = f"""You are a French language teacher. A student said: "{transcription}"

Analyze this French sentence and provide:
1. Is it grammatically correct? (yes/no)
2. If not, what is the corrected version?
3. Brief explanation of any corrections

Respond in JSON format:
{{
  "is_correct": true/false,
  "corrected": "corrected sentence here",
  "explanation": "brief explanation"
}}"""
            
            payload = {
                "model": "llama-3.1-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
            
            response = requests.post(GROQ_URL, headers=headers, json=payload)
            result = response.json()
            
            if "choices" in result:
                correction_text = result["choices"][0]["message"]["content"]
                print(f"\n✅ Correction result:")
                print(correction_text)
        else:
            print("\n⏭️  Skipping corrections (no API key provided)")
    else:
        print(f"\n❌ Error: {result}")
else:
    print("\n⏭️  Skipping transcription (no API key provided)")
    print("\n💡 To test this manually:")
    print("1. Get HuggingFace token: https://huggingface.co/settings/tokens")
    print("2. Get Groq API key: https://console.groq.com/keys")
    print("3. Run this script again with the keys")

print("\n" + "=" * 60)
print("\n🎯 DEMO SUMMARY")
print("\nWhat we're testing:")
print("✅ Hugging Face Whisper - FREE transcription")
print("✅ Groq Llama 3.1 70B - FREE corrections")
print("✅ Your actual voice memo from French beginner group")
print("\nIf this works well, we build the full feature!")
