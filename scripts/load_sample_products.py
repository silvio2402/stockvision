#!/usr/bin/env python3
"""
Load sample products into MongoDB for testing with new barcodes.

Usage:
    python load_sample_products.py

This script loads products that are not in the ERP system, allowing you to
test detection with your new barcodes.
"""

from pymongo import MongoClient


# Default MongoDB connection settings
MONGODB_URI = "mongodb://mongo:27017"
DATABASE_NAME = "stockvision"


# Sample products - modify these values
SAMPLE_PRODUCTS = [
    {
        "item_code": "TONY001",
        "barcode_value": "TONY001",
        "name": "El Tony Mate",
        "description": "El Tony Mate Eistee Dose",
        "running_out_condition": "Less than 3 cans visible on the shelf",
        "order_amount": 24,
        "needs_review": False,
        "current_status": "in_stock",
    },
    {
        "item_code": "BOST001",
        "barcode_value": "BOST001",
        "name": "Bostich Refill",
        "description": "Bostich Heftklammern Nachfuellpackung",
        "running_out_condition": "Less than 2 packs visible",
        "order_amount": 10,
        "needs_review": False,
        "current_status": "in_stock",
    },
    {
        "item_code": "SCHK001",
        "barcode_value": "SCHK001",
        "name": "Schokolade",
        "description": "Schokoladentafel gross",
        "running_out_condition": "Less than 3 bars visible on the shelf",
        "order_amount": 12,
        "needs_review": False,
        "current_status": "in_stock",
    },
    {
        "item_code": "DYMO001",
        "barcode_value": "DYMO001",
        "name": "Dymo Papier",
        "description": "Dymo Etikettenpapier Rollen",
        "running_out_condition": "Less than 2 rolls visible",
        "order_amount": 6,
        "needs_review": False,
        "current_status": "in_stock",
    },
    {
        "item_code": "KSCH001",
        "barcode_value": "KSCH001",
        "name": "Kleine Schokolade",
        "description": "Kleine Schokoladenriegel",
        "running_out_condition": "Less than 5 pieces visible on the shelf",
        "order_amount": 30,
        "needs_review": False,
        "current_status": "in_stock",
    },
    {
        "item_code": "PFEF001",
        "barcode_value": "PFEF001",
        "name": "Pfefferminz Bonbons",
        "description": "Pfefferminz Bonbons Packung",
        "running_out_condition": "Less than 3 packs visible",
        "order_amount": 15,
        "needs_review": False,
        "current_status": "in_stock",
    },
]


def load_products_sync(products):
    """Synchronous version for simplicity."""
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    products_collection = db.products

    loaded = []
    skipped = []
    updated = []

    for product in products:
        item_code = product["item_code"]

        existing = products_collection.find_one({"item_code": item_code})
        if existing:
            if "--force" in __import__("sys").argv:
                products_collection.update_one(
                    {"item_code": item_code},
                    {"$set": product}
                )
                print(f"  🔄 Updated {item_code}")
                updated.append(item_code)
            else:
                print(f"  ⚠️  Skipping {item_code} - already exists (use --force to update)")
                skipped.append(item_code)
        else:
            products_collection.insert_one(product)
            print(f"  ✅ Loaded {item_code}")
            loaded.append(item_code)

    client.close()
    return loaded, skipped, updated


def print_summary(loaded, skipped, updated):
    """Print summary of operations."""
    total = loaded + skipped + updated
    if total:
        print(f"\n📊 Summary:")
        print(f"  ✅ Loaded: {len(loaded)}")
        print(f"  ⚠️  Skipped: {len(skipped)}")
        print(f"  🔄 Updated: {len(updated)}")
        print(f"  📦 Total: {len(total)}")
    else:
        print("\n⚡ No products loaded")


def main():
    """Main function."""
    print("🚀 Loading sample products into MongoDB...")
    print(f"📍 MongoDB URI: {MONGODB_URI}")
    print(f"📍 Database: {DATABASE_NAME}")

    try:
        loaded, skipped, updated = load_products_sync(SAMPLE_PRODUCTS)
        print_summary(loaded, skipped, updated)
        print("\n✨ Done! Your sample products are ready for testing.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Make sure MongoDB is running on port 27018")
        exit(1)


if __name__ == "__main__":
    main()