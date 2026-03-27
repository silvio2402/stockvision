# Scripts

This directory contains utility scripts for StockVision.

## load_sample_products.py

Load sample products into MongoDB for testing with new barcodes that are not in the ERP system.

### Usage

```bash
# Load new products (skips existing ones)
python scripts/load_sample_products.py

# Force update existing products
python scripts/load_sample_products.py --force
```

### Customizing Products

Edit the `SAMPLE_PRODUCTS` list in `load_sample_products.py` to add your specific products:

```python
SAMPLE_PRODUCTS = [
    {
        "item_code": "YOUR_BARCODE_HERE",
        "barcode_value": "YOUR_BARCODE_HERE",
        "name": "Product Name",
        "description": "Product description",
        "running_out_condition": "Condition when product is running out",
        "order_amount": 20,  # Amount to order when running out
        "needs_review": False,
        "current_status": "in_stock"
    },
    # Add more products...
]
```

### Required Fields

- `item_code`: The barcode value (e.g., "1234567890123")
- `barcode_value`: Same as item_code
- `name`: Product name
- `description`: Product description

### Optional Fields

- `running_out_condition`: When should this product trigger a reorder?
- `order_amount`: How many to order when running out
- `needs_review`: Flag for products that need manual review
- `current_status`: Initial stock status ("in_stock", "running_out", "unknown")

### How It Works

1. Connects to MongoDB at `mongodb://localhost:27018`
2. Checks if products already exist in the database
3. Inserts new products (or updates with `--force` flag)
4. Prints summary of loaded/skipped/updated products

## Requirements

- MongoDB running on port 27018
- pymongo (install with: `pip install pymongo`)