#!/usr/bin/env python3
"""Generate Android app icons from source image."""

from PIL import Image
import os

def resize_and_save(source_path, output_dir, name, size):
    """Resize image to specific size and save."""
    if not os.path.exists(source_path):
        print(f"[ERROR] Source image not found: {source_path}")
        return False
    
    img = Image.open(source_path).convert('RGBA')
    
    # Resize
    img_resized = img.resize((size, size), Image.Resampling.LANCZOS)
    
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, name)
    img_resized.save(output_path, 'PNG')
    print(f"[✓] {size}x{size} -> {output_path}")
    return True

# Source image
source = r"f:\Git floder(Project)\AuthorCompanion\frontend\public\lextro-source.png"

# Android density mappings
densities = {
    'mipmap-ldpi': 36,
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

base_path = r"f:\Git floder(Project)\AuthorCompanion\frontend\android\app\src\main\res"

print("[*] Generating Android icons from source image...\n")

# Generate ic_launcher and ic_launcher_foreground for each density
for density, size in densities.items():
    output_dir = os.path.join(base_path, density)
    
    # Both launcher and foreground are the same
    resize_and_save(source, output_dir, 'ic_launcher.png', size)
    resize_and_save(source, output_dir, 'ic_launcher_foreground.png', size)
    resize_and_save(source, output_dir, 'ic_launcher_round.png', size)

print("\n[✓] Done!")
