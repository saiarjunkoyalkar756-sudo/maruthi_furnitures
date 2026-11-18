import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

brain_dir = r"C:\Users\suman\.gemini\antigravity\brain\cac0cfae-77e2-47cc-9a36-89bcc18b9647"
logo_path = r"C:\Users\suman\Downloads\Maruthi Logo Without Tagline.png"
if not os.path.exists(logo_path):
    logo_path = r"C:\Users\suman\Downloads\Maruthi Furnitures Logo.png"

print(f"Loading logo from: {logo_path}")
logo_img = Image.open(logo_path).convert("RGBA")

# Crop empty borders from logo
bbox = logo_img.getbbox()
if bbox:
    logo_img = logo_img.crop(bbox)

print(f"Cropped logo size: {logo_img.size}")

# Mapping of source generated files to destination targets
image_map = {
    "hero-suite.jpg": (
        os.path.join(brain_dir, "luxury_scandinavian_living_room_front_1794983980007.jpg"),
        "MARUTHI LIVING ARCHITECTURE"
    ),
    "teak-cot.jpg": (
        os.path.join(brain_dir, "luxury_cp_teak_floating_bed_1794983958099.jpg"),
        "SOLID CP TEAK KING BED"
    ),
    "eurotop-mattress.jpg": (
        os.path.join(brain_dir, "luxury_orthopedic_eurotop_mattress_1794983966204.jpg"),
        "ORTHOPEDIC EUROTOP SYSTEM"
    ),
    "steel-almirah.jpg": (
        os.path.join(brain_dir, "luxury_steel_wardrobe_hero_1794983977819.jpg"),
        "18-GAUGE STEEL ALMIRAH"
    ),
    "teak-vanity.jpg": (
        os.path.join(brain_dir, "luxury_teak_dressing_table_v2_1794983998399.jpg"),
        "DOUBLE DOOR TEAK VANITY"
    ),
    "tower-cooler.jpg": (
        os.path.join(brain_dir, "luxury_tower_air_cooler_1794983982309.jpg"),
        "COOL XPERT HEAVY TOWER"
    ),
    "modular-lounge.jpg": (
        os.path.join(brain_dir, "luxury_scandinavian_living_room_1794983955516.jpg"),
        "BESPOKE MODULAR LOUNGE"
    ),
    "showroom-branded.jpg": (
        os.path.join(r"c:\Users\suman\Downloads\maruthi\marketing-site\images", "showroom.jpg"),
        "SIDDIPET FLAGSHIP ATELIER"
    ),
}

target_dirs = [
    r"c:\Users\suman\Downloads\maruthi\marketing-site\images",
    r"c:\Users\suman\Downloads\maruthi\public\site\images"
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)

def apply_luxury_branding(source_path, series_title):
    base = Image.open(source_path).convert("RGBA")
    w, h = base.size

    # Create overlay
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # We want a subtle, ultra-luxury atelier badge in the top-left or bottom-right
    # Let's create an elegant corner pill badge with the logo and series mark
    # Target pill size: ~ 320px wide, ~ 70px high (scaled proportionally to image width)
    scale = w / 1600.0
    badge_w = int(340 * scale)
    badge_h = int(72 * scale)
    badge_x = int(36 * scale)
    badge_y = int(36 * scale)

    # Frosted pill background (subtle dark glass with 1px border)
    pill_box = [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h]
    radius = int(badge_h / 2)

    # Draw rounded pill with dark glass tint
    draw.rounded_rectangle(pill_box, radius=radius, fill=(18, 18, 16, 210), outline=(255, 255, 255, 70), width=max(1, int(1.5 * scale)))

    # Resize logo to fit inside pill
    logo_target_h = int(badge_h * 0.7)
    logo_aspect = logo_img.width / logo_img.height
    logo_target_w = int(logo_target_h * logo_aspect)
    
    # Restrict width if too wide
    if logo_target_w > int(badge_w * 0.35):
        logo_target_w = int(badge_w * 0.35)
        logo_target_h = int(logo_target_w / logo_aspect)

    resized_logo = logo_img.resize((logo_target_w, logo_target_h), Image.Resampling.LANCZOS)
    
    # Paste logo inside pill
    logo_pos_x = badge_x + int(16 * scale)
    logo_pos_y = badge_y + (badge_h - logo_target_h) // 2
    overlay.paste(resized_logo, (logo_pos_x, logo_pos_y), resized_logo)

    # Add divider line
    div_x = logo_pos_x + logo_target_w + int(12 * scale)
    div_y1 = badge_y + int(16 * scale)
    div_y2 = badge_y + badge_h - int(16 * scale)
    draw.line([(div_x, div_y1), (div_x, div_y2)], fill=(255, 255, 255, 60), width=max(1, int(1 * scale)))

    # Try loading clean font or default
    text_x = div_x + int(12 * scale)
    text_y_top = badge_y + int(17 * scale)
    text_y_bot = badge_y + int(36 * scale)

    try:
        font_main = ImageFont.truetype("arialbd.ttf", int(14 * scale))
        font_sub = ImageFont.truetype("arial.ttf", int(10 * scale))
    except:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((text_x, text_y_top), "MARUTHI ATELIER", fill=(255, 255, 255, 240), font=font_main)
    draw.text((text_x, text_y_bot), "SIDDIPET • SERIES 2026", fill=(200, 195, 185, 200), font=font_sub)

    # Composite together
    final_img = Image.alpha_composite(base, overlay).convert("RGB")
    return final_img

for filename, (src_path, label) in image_map.items():
    if not os.path.exists(src_path):
        print(f"WARNING: {src_path} not found!")
        continue

    print(f"Processing and branding: {filename} from {src_path}")
    branded = apply_luxury_branding(src_path, label)
    
    for t_dir in target_dirs:
        dest = os.path.join(t_dir, filename)
        branded.save(dest, "JPEG", quality=95)
        print(f"Saved: {dest}")

print("Branding complete for all images!")
