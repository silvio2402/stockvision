#!/usr/bin/env python3
"""
Generate PDF with barcodes for sample products.

Usage:
    python generate_barcodes.py [output_file]

Default output: barcodes.pdf
"""

from pymongo import MongoClient
import barcode
from barcode.writer import ImageWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.graphics import renderPDF
from PIL import Image
import io
import sys


MONGODB_URI = "mongodb://mongo:27017"
DATABASE_NAME = "stockvision"
DEFAULT_OUTPUT = "barcodes.pdf"


def get_products():
    """Fetch products from MongoDB that need barcodes."""
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    products_collection = db.products

    products = list(products_collection.find(
        {"item_code": {"$regex": "^(TONY|BOST|SCHK|DYMO|KSCH|PFEF).*"}},
        {"item_code": 1, "name": 1, "description": 1, "_id": 0}
    ).sort("item_code", 1))

    client.close()
    return products


def generate_barcode_image(item_code):
    """Generate barcode image as bytes."""
    Code128 = barcode.get_barcode_class("code128")
    writer = ImageWriter()
    barcode_obj = Code128(item_code, writer=writer)

    # Store image in memory
    img_io = io.BytesIO()
    barcode_obj.write(img_io)
    img_io.seek(0)

    return Image.open(img_io)


def create_pdf(products, output_file):
    """Create PDF with barcodes."""
    c = canvas.Canvas(output_file, pagesize=A4)
    width, height = A4

    # Layout settings
    margin = 15 * mm
    label_width = (width - 2 * margin) / 3
    label_height = 35 * mm
    barcode_height = 20 * mm
    text_height = 10 * mm

    row = 0
    col = 0

    c.setFont("Helvetica-Bold", 10)

    for i, product in enumerate(products):
        item_code = product["item_code"]
        name = product["name"]
        description = product.get("description", "")

        # Calculate position
        x = margin + col * label_width
        y = height - margin - (row + 1) * label_height

        # Draw border
        c.rect(x, y, label_width - 2*mm, label_height - 2*mm, stroke=1)

        # Generate and draw barcode
        try:
            barcode_img = generate_barcode_image(item_code)
            barcode_bytes = io.BytesIO()
            barcode_img.save(barcode_bytes, format="PNG")
            barcode_bytes.seek(0)

            barcode_x = x + (label_width - barcode_img.width) / 2 - mm
            barcode_y = y + label_height - barcode_height - 10*mm

            c.drawImage(
                io.BytesIO(barcode_bytes.getvalue()),
                barcode_x, barcode_y,
                width=barcode_img.width,
                height=barcode_img.height,
                mask="auto"
            )
        except Exception as e:
            print(f"Warning: Failed to generate barcode for {item_code}: {e}")
            c.setFillColorRGB(0.8, 0.8, 0.8)
            c.rect(x + 5*mm, y + label_height - barcode_height - 10*mm, label_width - 25*mm, barcode_height, fill=1, stroke=0)
            c.setFillColorRGB(0, 0, 0)

        # Draw text labels
        c.setFillColorRGB(0, 0, 0)

        # Item code (bold)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + label_width / 2, y + 8*mm, f"Barcode: {item_code}")

        # Product name
        c.setFont("Helvetica", 8)
        name_y = y + 3*mm
        if len(name) > 25:
            name = name[:25] + "..."
        c.drawCentredString(x + label_width / 2, name_y, name)

        col += 1
        if col >= 3:
            col = 0
            row += 1

            # New page if needed
            if row >= 8:
                c.showPage()
                row = 0

    c.save()
    return output_file


def main():
    """Main function."""
    output_file = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUTPUT

    print("🏷️  Generating barcode PDF...")
    print(f"📍 Output file: {output_file}")

    try:
        products = get_products()
        if not products:
            print("❌ No products found in database")
            print("💡 Run load_sample_products.py first")
            sys.exit(1)

        print(f"📦 Found {len(products)} products")

        output_path = create_pdf(products, output_file)
        print(f"\n✅ Barcode PDF created: {output_path}")
        print("\n📄 Layout: 3 barcodes per row, 8 rows per A4 page")
        print("✨ Ready to print!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Make sure MongoDB is running and products are loaded")
        sys.exit(1)


if __name__ == "__main__":
    main()