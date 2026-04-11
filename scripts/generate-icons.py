#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate PNG icons for web and mobile apps using PIL.
Creates gradient circle icons with book design.
Requires: pillow
Install: pip install pillow
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw

def generate_icons(output_dir, sizes=[192, 512]):
    """Generate PNG icons with gradient and book/pen design."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("[ERROR] Required packages not found!")
        print("Install with: pip install pillow")
        return False

    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Generating app icons")
    print("Output directory: " + str(output_dir) + "\n")

    # Colors from the design
    primary_color = (44, 122, 123)      # #2C7A7B - Teal
    secondary_color = (107, 70, 193)    # #6B46C1 - Violet
    accent_color = (49, 151, 149)       # #319795 - Darker teal
    white = (255, 255, 255)

    try:
        for size in sizes:
            print("[*] Generating " + str(size) + "x" + str(size) + "px...")
            
            # Create image with RGBA for transparency
            icon = Image.new('RGBA', (size, size), (255, 255, 255, 0))
            draw = ImageDraw.Draw(icon)
            
            # Draw gradient circle background
            # Create temporary image for gradient
            gradient = Image.new('RGB', (size, size), white)
            gradient_draw = ImageDraw.Draw(gradient)
            
            # Draw concentric circles to create gradient effect
            for i in range(size, 0, -1):
                ratio = i / size
                # Interpolate between primary and secondary colors
                r = int(primary_color[0] * (1 - ratio) + secondary_color[0] * ratio)
                g = int(primary_color[1] * (1 - ratio) + secondary_color[1] * ratio)
                b = int(primary_color[2] * (1 - ratio) + secondary_color[2] * ratio)
                color = (r, g, b)
                
                radius = int(i / 2)
                gradient_draw.ellipse(
                    [(size/2 - radius, size/2 - radius), (size/2 + radius, size/2 + radius)],
                    fill=color
                )
            
            # Paste gradient onto icon
            icon.paste(gradient, (0, 0))
            
            # Draw semi-transparent circle overlay
            overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.ellipse([(10, 10), (size-10, size-10)], fill=(255, 255, 255, 15))
            icon = Image.alpha_composite(icon, overlay)
            
            # Draw circle outline
            draw = ImageDraw.Draw(icon)
            draw.ellipse([(5, 5), (size-5, size-5)], outline=white, width=max(1, size//192))
            
            # Draw simple book icon (two rectangles)
            margin = int(size * 0.2)
            book_width = int(size * 0.25)
            book_height = int(size * 0.4)
            
            # Left page
            left_x = size//2 - book_width - 5
            top_y = size//2 - book_height//2
            
            draw.rectangle(
                [(left_x, top_y), (left_x + book_width, top_y + book_height)],
                fill=white,
                outline=white
            )
            
            # Right page
            right_x = size//2 + 5
            draw.rectangle(
                [(right_x, top_y), (right_x + book_width, top_y + book_height)],
                fill=white,
                outline=white
            )
            
            # Add text lines on pages
            line_height = int(book_height * 0.15)
            line_y = int(top_y + book_height * 0.1)
            line_width = int(book_width * 0.7)
            line_color = accent_color
            
            for i in range(2):
                # Left page lines
                draw.line(
                    [(left_x + 5, line_y + i*line_height), (left_x + 5 + line_width, line_y + i*line_height)],
                    fill=line_color,
                    width=1
                )
                # Right page lines
                draw.line(
                    [(right_x + 5, line_y + i*line_height), (right_x + 5 + line_width, line_y + i*line_height)],
                    fill=line_color,
                    width=1
                )
            
            # Save icon
            icon_path = output_dir / f"icon-{size}.png"
            icon.save(str(icon_path), 'PNG')
            print("   [OK] " + icon_path.name)
            
            # Create maskable icon (smaller with padding)
            maskable = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            small_size = int(size * 0.8)
            icon_resized = icon.resize((small_size, small_size), Image.Resampling.LANCZOS)
            
            # Paste in center
            x = (size - small_size) // 2
            y = (size - small_size) // 2
            maskable.paste(icon_resized, (x, y), icon_resized)
            
            maskable_path = output_dir / f"icon-maskable-{size}.png"
            maskable.save(str(maskable_path), 'PNG')
            print("   [OK] " + maskable_path.name)

        print("\nSuccessfully generated " + str(len(sizes) * 2) + " icons!")
        return True

    except Exception as e:
        print("\nError generating icons: " + str(e))
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / "frontend" / "public"

    success = generate_icons(
        str(output_dir),
        sizes=[192, 512]
    )

    sys.exit(0 if success else 1)
