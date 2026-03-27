# Scripts

This directory contains utility scripts for StockVision.

## load_sample_products.py

Load sample products into MongoDB for testing with new barcodes that are not in the ERP system.

### Usage

```bash
# Load products into server container
docker cp scripts/load_sample_products.py stockvision-server-1:/app/load_sample_products.py
docker exec stockvision-server-1 python /app/load_sample_products.py

# Force update existing products
docker exec stockvision-server-1 python /app/load_sample_products.py --force
```

### Customizing Products

Edit the `SAMPLE_PRODUCTS` list in `load_sample_products.py` to add your specific products.

### Requirements

- MongoDB running
- Products must be loaded before generating barcodes

## generate_barcodes.py

Generate printable PDF with Code128 barcodes for products in MongoDB.

### Usage

```bash
# Generate barcodes PDF
docker cp scripts/generate_barcodes.py stockvision-server-1:/app/generate_barcodes.py
docker exec stockvision-server-1 python /app/generate_barcodes.py /app/data/barcodes.pdf

# Copy PDF to host
docker cp stockvision-server-1:/app/data/barcodes.pdf ./barcodes.pdf
```

### PDF Layout

- 3 barcodes per row
- 8 rows per A4 page
- Each label includes: barcode, item code, product name

### Requirements

- Products loaded in MongoDB (run load_sample_products.py first)
- reportlab for PDF generation