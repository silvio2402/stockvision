#!/usr/bin/env python3
"""
Generate PDF with barcodes for sample products.

Usage:
    python generate_barcodes.py [output_file]

Default output: barcodes.pdf
"""

from pymongo import MongoClient
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.graphics.barcode import code128
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


def create_pdf(products, output_file):
    """Create PDF with barcodes."""
    c = canvas.Canvas(output_file, pagesize=A4)
    width, height = A4

    margin = 15 * mm
    label_width = (width - 2 * margin) / 3
    label_height = 35 * mm

    row = 0
    col = 0

    c.setFont("Helvetica-Bold", 10)

    for product in products:
        item_code = product["item_code"]
        name = product["name"]

        x = margin + col * label_width
        y = height - margin - (row + 1) * label_height

        c.rect(x, y, label_width - 2*mm, label_height - 2*mm, stroke=1)

        barcode = code128.Code128(item_code, barWidth=1.0, barHeight=10*mm)
        barcode_width = barcode.width
        barcode_height = barcode.height

        barcode_x = x + (label_width - barcode_width) / 2
        barcode_y = y + label_height - barcode_height - 8*mm

        barcode.drawOn(c, barcode_x, barcode_y)

        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + label_width / 2, y + 8*mm, item_code)

        c.setFont("Helvetica", 8)
        name_y = y + 3*mm
        if len(name) > 25:
            name = name[:25] + "..."
        c.drawCentredString(x + label_width / 2, name_y, name)

        col += 1
        if col >= 3:
            col = 0
            row += 1

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