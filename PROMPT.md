# StockVision — Implementation Prompt

## Project Overview

StockVision is a stationary automated stock-taking system for small warehouses. Cameras pointed at shelves capture images, an AI pipeline (Google Gemini) detects products via barcodes, evaluates stock levels using natural-language conditions, and automatically triggers reorder emails when products run low.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web App (React/TS)                     │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │Dashboard │ │ Camera   │ │Products│ │ Orders │ │ Settings│ │
│  │(img+data)│ │ Client   │ │ Config │ │Approval│ │      │ │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └──┬───┘ │
│       │WebSocket    │REST POST  │REST      │REST     │REST  │
└───────┼─────────────┼───────────┼──────────┼─────────┼──────┘
        │             │           │          │         │
┌───────┴─────────────┴───────────┴──────────┴─────────┴──────┐
│                   Server (Python/FastAPI)                     │
│  ┌────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │ Detection   │  │ Data Layer    │  │ Ordering Service    │ │
│  │ Pipeline    │  │ (Repository   │  │ (email, lifecycle)  │ │
│  │ (Gemini +   │  │  abstraction) │  │                     │ │
│  │  pyzbar)    │  │               │  │                     │ │
│  └──────┬──────┘  └──┬────────┬──┘  └──────────┬──────────┘ │
│         │            │        │                 │            │
│  ┌──────┴──────┐  ┌──┴──┐ ┌──┴────────────┐  ┌─┴──────┐    │
│  │ Gemini API  │  │Mongo│ │SAP ERP (Make) │  │ SMTP   │    │
│  └─────────────┘  └─────┘ └───────────────┘  └────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Server (`/server`)
- **Framework**: Python 3.12+, FastAPI, uvicorn
- **AI**: `google-genai` (Google Gemini SDK)
- **Barcode**: `pyzbar`, `Pillow` (crop barcode regions from image, decode with pyzbar)
- **Database**: `motor` (async MongoDB driver), `beanie` or raw motor
- **HTTP Client**: `httpx` (for Make.com webhook calls)
- **Email**: `aiosmtplib` (async SMTP)
- **Auth**: Simple password auth with JWT tokens (`python-jose`)
- **Scheduling**: `apscheduler` (periodic scan triggers, order checks)
- **WebSocket**: Built-in FastAPI WebSocket support
- **Image Processing**: `Pillow` (crop, resize, encode)

### Web App (`/web`)
- **Framework**: React 18+, TypeScript, Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data Fetching**: TanStack Query (React Query)
- **WebSocket**: Native WebSocket API (custom hook)
- **Camera**: `navigator.mediaDevices.getUserMedia()` API
- **Image Overlay**: HTML Canvas or absolutely-positioned SVG/div overlays for bounding boxes

### Infrastructure
- **Docker Compose**: server + web + MongoDB
- **MongoDB**: 7.x (via Docker)

---

## Project Structure

```
stockvision/
├── server/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, lifespan, middleware, CORS
│   │   ├── config.py                # Settings from environment variables
│   │   ├── dependencies.py          # Shared FastAPI dependencies (DB, auth)
│   │   │
│   │   ├── models/                  # Pydantic models (request/response + DB)
│   │   │   ├── product.py
│   │   │   ├── detection.py
│   │   │   ├── order.py
│   │   │   └── settings.py
│   │   │
│   │   ├── routers/                 # API route handlers
│   │   │   ├── auth.py              # POST /api/auth/login
│   │   │   ├── camera.py            # POST /api/camera/capture, POST /api/camera/scan
│   │   │   ├── products.py          # CRUD /api/products
│   │   │   ├── detections.py        # GET /api/detections
│   │   │   ├── orders.py            # CRUD + approve/decline /api/orders
│   │   │   ├── settings.py          # GET/PUT /api/settings
│   │   │   └── ws.py                # WebSocket /ws
│   │   │
│   │   ├── services/
│   │   │   ├── detection/
│   │   │   │   ├── pipeline.py      # Main detection pipeline orchestration
│   │   │   │   ├── barcode.py       # pyzbar barcode decoding from image crops
│   │   │   │   ├── gemini.py        # Gemini API wrapper (all 3 prompt types)
│   │   │   │   └── image.py         # Image crop, resize, encode utilities
│   │   │   │
│   │   │   ├── data/
│   │   │   │   ├── repository.py    # Abstract ProductRepository protocol
│   │   │   │   ├── composite.py     # Merges MongoDB + ERP data
│   │   │   │   ├── mongodb.py       # MongoDB operations
│   │   │   │   └── erp.py           # SAP ERP via Make.com webhooks
│   │   │   │
│   │   │   ├── ordering/
│   │   │   │   ├── service.py       # Order creation, approval, lifecycle
│   │   │   │   └── email.py         # SMTP email sending
│   │   │   │
│   │   │   └── scheduler.py         # APScheduler: periodic scans + order checks
│   │   │
│   │   └── websocket/
│   │       └── manager.py           # WebSocket connection manager, broadcast
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── web/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── api/                     # API client (fetch wrapper, typed endpoints)
│   │   │   ├── client.ts
│   │   │   ├── products.ts
│   │   │   ├── detections.ts
│   │   │   ├── orders.ts
│   │   │   └── settings.ts
│   │   │
│   │   ├── components/
│   │   │   ├── layout/              # AppShell, Header, Sidebar, Navigation
│   │   │   ├── detection/           # ImageViewer with bounding box overlays
│   │   │   ├── products/            # ProductCard, ProductTable, ConfigForm
│   │   │   ├── orders/              # OrderList, ApprovalCard
│   │   │   └── camera/              # CameraPreview, CaptureButton
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CameraPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts      # WebSocket connection + auto-reconnect
│   │   │   ├── useAuth.ts           # Auth state + token management
│   │   │   └── useCamera.ts         # getUserMedia + frame capture
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── WebSocketContext.tsx
│   │   │
│   │   ├── types/                   # Shared TypeScript types (mirror server models)
│   │   │   └── index.ts
│   │   │
│   │   └── lib/
│   │       └── utils.ts
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
├── .env.example                     # Root env template
├── .gitignore
└── README.md
```

---

## MongoDB Schema

### `products` collection
```json
{
  "_id": "ObjectId",
  "item_code": "string (unique index)",       // From barcode / ERP
  "name": "string",                           // From ERP
  "description": "string | null",             // From ERP
  "barcode_value": "string",                  // Raw barcode string
  
  // User-configured fields (stored in MongoDB):
  "running_out_condition": "string | null",   // Natural language, e.g. "ran out when container floor is visible (red color)"
  "order_amount": "number | null",            // How many to order when running out
  
  // Detection state:
  "current_status": "in_stock | running_out | unknown | not_detected",
  "last_detected_at": "datetime | null",
  "last_bounding_box": "{ x: int, y: int, width: int, height: int } | null",
  "last_ai_reasoning": "string | null",       // Gemini's explanation for status
  
  // Review flag:
  "needs_review": "boolean",                  // True for unrecognized products
  
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### `detections` collection
```json
{
  "_id": "ObjectId",
  "timestamp": "datetime",
  "camera_id": "string",                      // Default "camera-1" for single camera
  "image_path": "string",                     // Filesystem path to stored full image
  
  "products": [
    {
      "item_code": "string",
      "barcode_bounding_box": "{ x: int, y: int, width: int, height: int }",
      "product_area_bounding_box": "{ x: int, y: int, width: int, height: int }",
      "status": "in_stock | running_out",
      "ai_reasoning": "string",               // Gemini's explanation
      "running_out_condition": "string"        // The condition that was evaluated
    }
  ],
  
  "unknown_items": [                          // Detected but unrecognized
    {
      "bounding_box": "{ x: int, y: int, width: int, height: int }",
      "description": "string"                 // What Gemini sees there
    }
  ],
  
  "processing_time_ms": "number",
  "created_at": "datetime"
}
```

### `orders` collection
```json
{
  "_id": "ObjectId",
  "created_at": "datetime",
  
  "items": [
    {
      "item_code": "string",
      "name": "string",
      "order_amount": "number"
    }
  ],
  
  "status": "pending_approval | approved | declined | ordered",
  "status_updated_at": "datetime | null",
  
  "email_sent_to": "string | null",
  "email_sent_at": "datetime | null",
  
  "notes": "string | null"
}
```

### `settings` collection (singleton document)
```json
{
  "_id": "app_settings",
  "scan_interval_minutes": 10,
  "approval_required": false,
  "order_email": "string",
  
  "smtp_host": "string",
  "smtp_port": 587,
  "smtp_user": "string",
  "smtp_password": "string",
  
  "password_hash": "string",                  // bcrypt hash of dashboard password
  
  "gemini_models": {
    "barcode_detection": "gemini-2.0-flash",
    "product_area_detection": "gemini-2.5-flash",
    "stock_evaluation": "gemini-2.5-flash"
  }
}
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Body: `{ password: string }`. Returns `{ token: string }`. Simple JWT. |

All other endpoints require `Authorization: Bearer <token>` header.

### Camera
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/camera/capture` | Upload image. Body: multipart form with `image` file + optional `camera_id`. Stores image, triggers detection pipeline. Returns detection ID. |
| `POST` | `/api/camera/scan` | Trigger manual scan (re-process latest image or request new capture). |

### Products
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List all products. Query params: `?status=running_out&needs_review=true` |
| `GET` | `/api/products/{item_code}` | Get single product with full details. |
| `PUT` | `/api/products/{item_code}` | Update product config. Body: `{ running_out_condition?: string, order_amount?: number }` |
| `DELETE` | `/api/products/{item_code}` | Remove product (stops tracking). |

### Detections
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/detections` | List detection history. Query: `?limit=20&offset=0` |
| `GET` | `/api/detections/latest` | Get most recent detection result. |
| `GET` | `/api/detections/{id}` | Get specific detection with all product results. |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders` | List orders. Query: `?status=pending_approval` |
| `GET` | `/api/orders/{id}` | Get order details. |
| `POST` | `/api/orders/{id}/approve` | Approve pending order → triggers email send. |
| `POST` | `/api/orders/{id}/decline` | Decline pending order. |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get current settings (excluding sensitive fields). |
| `PUT` | `/api/settings` | Update settings. Body: partial settings object. |

### Static Files
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/images/{path}` | Serve stored detection images. |

### WebSocket
| Path | Description |
|------|-------------|
| `WS /ws` | Real-time updates. Auth via query param: `/ws?token=<jwt>` |

**WebSocket message types (server → client):**
```json
{ "type": "scan_started", "data": { "camera_id": "string" } }
{ "type": "scan_progress", "data": { "step": "barcode_detection | product_area_detection | stock_evaluation", "detail": "string" } }
{ "type": "scan_completed", "data": { "detection_id": "string", "summary": { "total": 5, "running_out": 2 } } }
{ "type": "order_created", "data": { "order_id": "string", "item_count": 3, "needs_approval": true } }
{ "type": "product_updated", "data": { "item_code": "string", "status": "string" } }
```

---

## Detection Pipeline — Detailed

### Step 1: Barcode Bounding Box Detection (Gemini)

**Model**: `gemini-2.0-flash` (fast, cheap — bounding boxes are a simple task)

**Gemini prompt**:
```
Analyze this image of a warehouse shelf. Detect ALL visible barcodes in the image.

For each barcode found, return its bounding box as pixel coordinates relative to the full image.

Return ONLY valid JSON in this exact format:
{
  "barcodes": [
    {
      "bounding_box": { "x": <left>, "y": <top>, "width": <w>, "height": <h> }
    }
  ]
}

If no barcodes are found, return: {"barcodes": []}
```

**Input**: Full shelf image
**Output**: List of barcode bounding boxes

### Step 2: Barcode Decoding + Product Info Fetch

For each barcode bounding box from Step 1:
1. **Crop** the barcode region from the image using Pillow
2. **Decode** using `pyzbar.decode()` → get the barcode value (item code)
3. **Fetch product info** from the data repository (merges ERP + MongoDB):
   - ERP (via Make.com): `GET https://hook.eu1.make.celonis.com/79j69cp1aesv98zwozwgpduz86hk71rr?ItemCode={item_code}` → name, description, supplier info
   - MongoDB: running_out_condition, order_amount, current_status
4. If barcode cannot be decoded by pyzbar, **flag as unknown** with bounding box
5. If item_code not found in ERP, **flag for manual review** in the products collection

### Step 3: Product Area Detection (Gemini)

**Model**: `gemini-2.5-flash` (needs spatial reasoning — slightly more capable model)

**Gemini prompt**:
```
You are analyzing an image of a warehouse shelf. The following products have been identified at these barcode locations:

{for each product:}
- Product: "{name}" (Item Code: {item_code})
  Description: {description}
  Barcode location: x={x}, y={y}, width={w}, height={h}

For each product, identify the FULL AREA on the shelf where that product type is stored/displayed. 
This area should encompass ALL units of that product visible on the shelf, not just the barcode.
If a product appears to be completely out of stock, estimate where it would be based on its barcode position and neighboring products.

Also identify any areas with products that don't match any of the listed products above. Mark these as "unknown".

Return ONLY valid JSON:
{
  "product_areas": [
    {
      "item_code": "string",
      "bounding_box": { "x": <left>, "y": <top>, "width": <w>, "height": <h> }
    }
  ],
  "unknown_areas": [
    {
      "bounding_box": { "x": <left>, "y": <top>, "width": <w>, "height": <h> },
      "description": "brief description of what's there"
    }
  ]
}
```

**Input**: Full shelf image + product list with barcode positions
**Output**: Bounding box for each product's area + unknown areas

### Step 4: Stock Level Evaluation (Gemini, per product)

**Model**: `gemini-2.5-flash` (needs nuanced visual understanding)

For EACH product, crop its area from the full image and evaluate individually (prevents context rot between products).

**Gemini prompt** (per product):
```
You are evaluating the stock level of a product on a warehouse shelf.

Product: "{name}"
Description: {description}
Running out condition: "{running_out_condition}"

Based on the image of this product's area, determine whether the "running out" condition is met.

Analyze carefully:
- Look at the quantity of product visible
- Consider the specific condition described
- Be conservative — only mark as running out if the condition is clearly met

Return ONLY valid JSON:
{
  "is_running_out": true/false,
  "reasoning": "Brief explanation of what you see and why you made this determination",
  "confidence": 0.0-1.0
}
```

**Input**: Cropped product area image + product info + running out condition
**Output**: Boolean determination + reasoning + confidence

### Step 5: Write Results

- Write full detection result to `detections` collection
- Update each product's `current_status`, `last_detected_at`, `last_bounding_box`, `last_ai_reasoning` in `products` collection
- Add any unknown items to products as `needs_review: true`
- Broadcast `scan_completed` via WebSocket

### Post-Pipeline: Order Check (runs after each scan + on periodic schedule)

1. Query products where `current_status == "running_out"` AND `order_amount != null` AND `running_out_condition != null`
2. Check if there's already a pending/approved/ordered order containing each product (prevent duplicates)
3. For products needing orders:
   - If `settings.approval_required == true`: Create order with status `pending_approval`, broadcast `order_created` via WebSocket
   - If `settings.approval_required == false`: Create order with status `ordered`, send email immediately
4. Email format: List of products needing reorder with names, item codes, and order amounts

---

## Data Abstraction Layer

The data layer uses the **Repository pattern** to abstract data sources.

```python
class ProductRepository(Protocol):
    """Abstract product data access."""
    async def get_product(self, item_code: str) -> ProductData | None: ...
    async def get_all_products(self) -> list[ProductData]: ...
    async def update_product(self, item_code: str, data: ProductUpdate) -> None: ...

class ERPClient:
    """Fetches product master data from SAP via Make.com webhooks."""
    # GET https://hook.eu1.make.celonis.com/79j69cp1aesv98zwozwgpduz86hk71rr?ItemCode={code}
    # GET https://hook.eu1.make.celonis.com/2dkavnxbe1o4rns7k75r1ej9yqflfa7x (list all)

class MongoDBRepository:
    """Stores application-specific product data (conditions, amounts, status)."""

class CompositeProductRepository:
    """Merges ERP + MongoDB. ERP provides master data (name, description, supplier).
    MongoDB provides app-specific data (running_out_condition, order_amount, status).
    MongoDB fields take priority when both sources have data for the same field."""
```

This abstraction allows:
- Swapping MongoDB for another DB without changing pipeline code
- Moving fields between ERP and MongoDB by changing which repository provides them
- Adding new data sources (e.g., another ERP) by implementing the protocol

---

## Frontend Pages — Detailed

### Login Page (`/login`)
- Simple password input field + submit button
- Stores JWT in localStorage
- Redirects to dashboard on success

### Dashboard Page (`/` — main page)
- **Top section**: Last captured shelf image with bounding box overlays
  - Green boxes = in stock products (label with product name)
  - Red boxes = running out products (label with product name)  
  - Yellow boxes = unknown / needs review
  - Timestamp: "Last scan: 3 minutes ago"
  - "Scan Now" button (triggers POST /api/camera/scan)
- **Bottom section**: Product status table/cards
  - Columns: Product Name, Item Code, Status (color-coded badge), Last Detected, Running Out Condition
  - Filterable by status
  - Click row → navigate to product detail
- **Banner** (if applicable): "3 orders pending approval" — click to go to Orders page
- **Real-time updates**: WebSocket connection updates the view when new scan results arrive

### Camera Page (`/camera`)
- Live camera preview using `getUserMedia()`
- Camera device selector dropdown (if multiple cameras available)
- Manual "Capture & Send" button
- Auto-capture toggle with interval display (reads from settings)
- Connection status indicator
- Last capture timestamp

### Products Page (`/products`)
- Table of all products
- For each product: inline-edit or modal for:
  - **Running out condition** (text input/textarea): Natural language condition
  - **Order amount** (number input): How many to reorder
- Filter: "Needs Review" toggle to show flagged products
- Products flagged for review have a yellow indicator and can be:
  - Identified (assign an item code)
  - Dismissed (remove from tracking)

### Orders Page (`/orders`)  
- List of all orders, newest first
- Status badge: Pending (yellow), Approved (blue), Declined (gray), Ordered/Sent (green)
- For pending orders: **Approve** and **Decline** buttons
- Order detail: list of items with quantities
- Filter by status

### Settings Page (`/settings`)
- **Scan interval** (number input, minutes)
- **Order approval toggle** (switch): "Require approval before sending orders"
- **Order email recipient** (email input)
- **SMTP Configuration**: host, port, user, password (password field)
- **Change access password** (password fields with confirmation)
- **Gemini models** (dropdowns for each pipeline step): barcode detection, product area detection, stock evaluation

---

## Docker Setup

### `docker-compose.yml`
```yaml
services:
  server:
    build: ./server
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017
      - MONGODB_DATABASE=stockvision
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ERP_PRODUCT_URL=https://hook.eu1.make.celonis.com/79j69cp1aesv98zwozwgpduz86hk71rr
      - ERP_PRODUCTS_LIST_URL=https://hook.eu1.make.celonis.com/2dkavnxbe1o4rns7k75r1ej9yqflfa7x
      - IMAGE_STORAGE_PATH=/app/data/images
      - APP_PASSWORD=${APP_PASSWORD:-stockvision}
      - JWT_SECRET=${JWT_SECRET:-change-me-in-production}
    volumes:
      - image_data:/app/data/images
    depends_on:
      - mongo

  web:
    build: ./web
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_WS_URL=ws://localhost:8000
    depends_on:
      - server

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
  image_data:
```

### Server Dockerfile
- Base: `python:3.12-slim`
- Install system deps: `libzbar0` (required by pyzbar)
- Copy requirements.txt, install
- Copy app code
- CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Web Dockerfile
- Build stage: `node:20-alpine`, npm install, npm run build
- Serve stage: `nginx:alpine`, copy build output, nginx config proxying `/api` and `/ws` to server

---

## Environment Variables

```env
# Gemini API
GEMINI_API_KEY=                          # Required

# MongoDB
MONGODB_URI=mongodb://mongo:27017        # Docker default
MONGODB_DATABASE=stockvision

# SAP ERP (Make.com webhooks)
ERP_PRODUCT_URL=https://hook.eu1.make.celonis.com/79j69cp1aesv98zwozwgpduz86hk71rr
ERP_PRODUCTS_LIST_URL=https://hook.eu1.make.celonis.com/2dkavnxbe1o4rns7k75r1ej9yqflfa7x

# Email/SMTP (configurable via settings UI too)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
ORDER_EMAIL=

# Auth
APP_PASSWORD=stockvision                 # Initial dashboard password
JWT_SECRET=change-me-in-production

# Storage
IMAGE_STORAGE_PATH=/app/data/images      # Inside container
```

---

## Implementation Priority (suggested order)

### Phase 1: Foundation
1. Docker Compose + MongoDB + server skeleton (FastAPI with CORS, health check)
2. Web app skeleton (Vite + React + Router + Tailwind + shadcn/ui)
3. Simple auth (password login, JWT)
4. MongoDB connection + settings singleton

### Phase 2: Core Pipeline
5. Image upload endpoint (store image to filesystem)
6. Gemini service wrapper (barcode detection prompt)
7. pyzbar barcode decoding service  
8. ERP client (Make.com webhook calls)
9. Product data repository (composite: ERP + MongoDB)
10. Gemini product area detection
11. Gemini stock evaluation (per-product crop)
12. Full pipeline orchestration

### Phase 3: Data & API
13. Products CRUD API + MongoDB operations
14. Detection history storage + API
15. Order creation + lifecycle management
16. Email sending service
17. WebSocket manager + broadcast events

### Phase 4: Frontend
18. Login page
19. Dashboard: image viewer with bounding box overlays
20. Dashboard: product status table
21. Camera page (getUserMedia + capture + upload)
22. Products page (config editing)
23. Orders page (list + approval)
24. Settings page

### Phase 5: Integration
25. Periodic scan scheduler (APScheduler)
26. Automatic order check after each scan
27. WebSocket real-time updates on dashboard
28. End-to-end testing with real camera + shelf

---

## Key Design Decisions

1. **Bounding boxes**: All bounding boxes use `{ x, y, width, height }` in pixel coordinates relative to the original image. Frontend scales them proportionally when displaying over the image.

2. **Gemini responses**: Always request JSON output. Parse with error handling — if Gemini returns invalid JSON, retry once, then log error and skip that step.

3. **Image storage**: Filesystem (Docker volume), not MongoDB GridFS. Simpler, faster. Store path in detection document.

4. **WebSocket auth**: Token passed as query parameter on connection (`/ws?token=xxx`). Validated on connect.

5. **Settings**: Stored in MongoDB as a singleton document. Loaded at startup, cached in memory, refreshed on update. SMTP and password settings are ALSO configurable via UI (Settings page), not just env vars. Env vars serve as initial defaults only.

6. **Error handling in pipeline**: If any Gemini call fails, log it, skip that step, and continue with what we have. Never crash the whole pipeline for one failed product.

7. **Camera ID**: Default to `"camera-1"`. The capture endpoint accepts an optional `camera_id` parameter. This future-proofs for multi-camera without adding complexity now.

8. **Frontend image overlay**: Use a container with `position: relative`, the image as background, and absolutely-positioned colored div overlays for bounding boxes. Scale factor = displayed image size / original image size. Apply scale to all bounding box coordinates.
