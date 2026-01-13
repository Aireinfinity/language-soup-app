#!/bin/bash

# Supabase Config
URL="https://uspegyneclgkscxwmomn.supabase.co"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew"
BUCKET="avatars"

# Directory
cd assets/images/avatars

# Files
soups=("cereal.png" "tomato_soup.png" "salad.png" "acai.png" "chicken_soup.png" "water_soup.png" "bathtub_soup.png")

for soup in "${soups[@]}"; do
    echo "Uploading $soup..."
    curl -X POST "$URL/storage/v1/object/$BUCKET/static/$soup" \
       -H "Authorization: Bearer $KEY" \
       -H "Content-Type: image/png" \
       -H "x-upsert: true" \
       --data-binary "@$soup"
    echo "Done."
done
