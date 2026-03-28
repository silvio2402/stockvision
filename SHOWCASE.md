# StockVision Showcase

**StockVision** is a stationary automated stock-taking system for small warehouses. 
Cameras capture shelf images → Google Gemini AI detects barcodes & product areas → Evaluates stock using natural language rules → Triggers reorder workflows automatically.

---

## 📊 Live Dashboard
Monitor warehouse health at a glance.
- **Real-Time KPIs**: Track total products, low stock, unconfigured items, and pending orders.
- **Live Viewer**: See the latest camera capture alongside a summary of detected products.
- **Stock Health**: Color-coded status chips highlight critical items (*Running Out*, *In Stock*).
- **Actionable Alerts**: 1-click banners for pending order approvals.

![alt text](image.png)

## 🧠 AI-Powered Intelligence
Eliminate manual stock counting with visual AI.
- **Visual Detection (Gemini)**: Maps `1000x1000` bounding boxes around barcodes and product areas on high-res images.
- **Insights Console**: Visual debug mode overlaying bounding boxes, known products, and unknown items directly on the shelf image.
- **Natural Language Rules**: Define low-stock triggers in plain English (e.g., *"Less than 5 boxes left"* or *"Only the bottom row is visible"*).
- **Contextual Evaluation**: AI compares the cropped product image against the language rule to determine stock status, returning a confidence score and reasoning.

![alt text](image-1.png)

![alt text](image-2.png)

## 📦 Stock & Reorder Workflows
Adaptable inventory management and supplier ordering.
- **Smart Filtering**: Filter inventory by status and toggle "Needs Review" to surface items requiring human attention.
- **Inline Editing**: Quickly update reorder conditions, quantities, or flag items.
- **Data Lineage**: Badges differentiate ERP-imported products from AI-discovered "unknown" items.
- **Manual vs. Auto Reordering**: 
  - *Manual (Default)*: AI flags low stock → Creates "Pending" order → Manager approves via UI.
  - *Fully Automated*: AI flags low stock → Auto-generates order → Dispatches SMTP email to supplier.

![alt text](image-5.png)

## 📷 Flexible Camera Setup
Zero proprietary hardware required. 
- **Browser-Based Client**: Turn any phone or tablet into a camera node using the built-in web client (`useCamera.ts`).
- **QR Pairing**: Scan the QR code in Settings to instantly link a mobile device as a remote camera.
- **Multi-Camera Scalability**: API-driven capture (`/api/camera/capture`) with `camera_id` support for infinite camera nodes.
- **Automated Scanning**: Schedulers trigger periodic image captures (e.g., every 10 min), syncing the UI instantly via WebSockets.

![alt text](image-3.png)

**Image of the camera setup pointing to the products:**
![alt text](image-6.png)

## 🛠️ Configuration & Core Features
Built for both warehouse floors and developer debugging.
- **Developer Tools**: Toggle dev mode to reveal raw AI reasoning, the Insights Console, and pipeline execution logs.
- **Mobile-Optimized**: Fully responsive, touch-friendly UI for scanning and managing inventory on the go.
- **Secure Access**: Password-protected login, secure session management, and environment-based secrets.

![alt text](image-4.png)

![alt text](image-7.png)

![alt text](image-8.png)
