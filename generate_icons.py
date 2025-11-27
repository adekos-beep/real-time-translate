"""
Simple script to create multiple icon sizes from the 512x512 source icon.
Run this script to generate all required PWA icon sizes.
"""
from PIL import Image
import os

# Icon sizes needed for PWA
SIZES = [72, 96, 128, 144, 152, 180, 192, 512]

def create_icons():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    source_icon = os.path.join(icons_dir, 'icon-512.png')
    
    if not os.path.exists(source_icon):
        print(f"❌ Source icon not found: {source_icon}")
        print("Please make sure icon-512.png exists in the icons/ directory")
        return
    
    # Load source image
    img = Image.open(source_icon)
    print(f"✅ Loaded source icon: {img.size}")
    
    # Create each size
    for size in SIZES:
        output_path = os.path.join(icons_dir, f'icon-{size}.png')
        
        # Skip if already exists (512 is our source)
        if size == 512:
            print(f"✓ icon-{size}.png (source)")
            continue
        
        # Resize
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_path, 'PNG', optimize=True)
        print(f"✓ Created icon-{size}.png")
    
    print(f"\n✅ All icons created successfully in {icons_dir}")

if __name__ == '__main__':
    try:
        create_icons()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure Pillow is installed: pip install Pillow")
