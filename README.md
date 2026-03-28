# StockVision

StockVision is a stationary automated stock-taking system for small warehouses. It replaces manual stock counting with intelligent camera clients, AI-generated bounding boxes, natural-language low-stock rules, and automated order workflows—all powered by Google Gemini AI.

👉 **[View the Features Showcase](SHOWCASE.md)** for a comprehensive overview of the application's capabilities, screenshots, and UI details.

---

## 🚀 Quick Start (Local Development)

The easiest way to get the application running locally is using the provided `Makefile`, which handles Python virtual environments, Node.js dependencies, and spinning up a local MongoDB container.

### 1. Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Python** 3.11, 3.12, or 3.13 (3.14+ is not supported yet)
- **Node.js** (v18+) and **npm**
- **Docker** and **Docker Compose** (for the local MongoDB database)
- **zbar library** (Required for the `pyzbar` barcode decoding package):
  - **Debian/Ubuntu**: `sudo apt install libzbar0`
  - **macOS**: `brew install zbar`
  - **Windows**: Included in the Windows wheel for pyzbar, or requires manual zbar installation.

### 2. Environment Variables

Create a `.env` file in the `server/` directory by copying the provided example:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and add your **Google Gemini API Key**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Optional: You can also configure SMTP settings in this file if you wish to test email order dispatches.)*

### 3. Run the Application

Start the entire development stack with a single command:

```bash
make dev
```

This command will:
1. Install Python backend dependencies in `server/.venv`.
2. Install frontend React dependencies in `web/node_modules`.
3. Start a local MongoDB container via Docker on port `27018`.
4. Boot the FastAPI backend server on `http://localhost:8000` (with auto-reload).
5. Boot the Vite React frontend on `http://localhost:5173` (with HMR, proxying API calls to the backend).

Once running, open your browser and navigate to **`http://localhost:5173`**. The default password to log in is `stockvision` (configurable via `APP_PASSWORD` in your `.env`).

---

## 📷 Setting up the Camera Client

StockVision is designed with a flexible camera architecture. You can use your mobile device or tablet as a wireless camera client pointing at your shelves:

1. Start the application (`make dev` or production via Docker).
2. Log in to the web dashboard and navigate to the **Settings** page.
3. Under the **Camera Access** section, you will see a QR code.
4. **Scan the QR code** with the smartphone or tablet you want to use as a camera.
5. The device will open the camera client interface. Grant it browser camera permissions.
6. The client will stream the environment-facing camera and periodically capture and send high-resolution frames to the AI pipeline.

*Note: For the QR code to work seamlessly across devices on your local network, ensure you access the dashboard via your machine's local IP address (e.g., `http://192.168.1.X:5173`) rather than `localhost`.*

---

## 🐳 Docker / Production Setup

If you want to run the application in a production-like environment (or avoid local Python/Node installations entirely), you can use the fully containerized Docker workflow:

```bash
# Build and start all services in the background
make prod

# To stop the production environment
make prod-down
```

This will build both the FastAPI server and the React frontend (served via Nginx) and boot them alongside MongoDB. 
- The web app will be accessible at `http://localhost:3000`.
- The backend API will be accessible at `http://localhost:8000`.

---

## 🧪 Running Tests

StockVision includes an end-to-end test suite for the detection pipeline. You can run the tests using the provided `Makefile` command:

```bash
make test-e2e
```

This will:
1. Ensure the Python virtual environment is set up.
2. Run the `pytest` suite located in `tests/test_pipeline_e2e.py`.
3. Test the core AI logic, pipeline execution, and mock database repositories without requiring a live MongoDB connection.

---

## 🧹 Lifecycle Commands

Here are some helpful Makefile commands to manage your environment:

- `make stop` — Stops the development servers and tears down the Docker MongoDB container.
- `make clean` — Fully resets your environment by deleting the Python `.venv`, `node_modules`, and local image storage data.