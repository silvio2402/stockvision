VENV := server/.venv
PIP  := $(VENV)/bin/pip

# Find a compatible Python (3.14 is too new for pinned deps)
PYTHON := $(shell command -v python3.12 2>/dev/null || command -v python3.13 2>/dev/null || command -v python3.11 2>/dev/null || echo python3)

.PHONY: setup dev dev-db dev-server dev-web stop clean prod prod-down

## ── First-time setup (also runs automatically via make dev) ──────

setup: $(VENV)/.installed web/node_modules/.installed
	@echo ""
	@echo "Setup complete! Run 'make dev' to start development."
	@echo ""
	@echo "NOTE: pyzbar requires libzbar0 on your system:"
	@echo "  Debian/Ubuntu:  sudo apt install libzbar0"
	@echo "  macOS:          brew install zbar"

$(VENV)/.installed: server/requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -r server/requirements.txt
	@test -f server/.env || cp server/.env.example server/.env
	@mkdir -p server/data/images
	@touch $@

web/node_modules/.installed: web/package.json
	cd web && npm install
	@touch $@

## ── Development ──────────────────────────────────────────────────

# Start everything: MongoDB + FastAPI (auto-reload) + Vite (HMR)
dev: $(VENV)/.installed web/node_modules/.installed dev-db
	@trap 'kill 0' INT TERM; \
	$(MAKE) -s dev-server & \
	$(MAKE) -s dev-web & \
	wait

# MongoDB via Docker (the only service that stays containerized)
dev-db:
	@docker compose stop server web 2>/dev/null || true
	@docker compose up -d mongo
	@echo "MongoDB running on localhost:27018"

# FastAPI with auto-reload on file changes
dev-server: $(VENV)/.installed
	cd server && .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Vite dev server with HMR — proxies /api and /ws to localhost:8000
dev-web: web/node_modules/.installed
	cd web && npm run dev

## ── Lifecycle ────────────────────────────────────────────────────

stop:
	@docker compose down
	@-pkill -f "uvicorn app.main:app" 2>/dev/null || true

clean: stop
	rm -rf $(VENV) web/node_modules server/data

## ── Production (existing Docker workflow) ────────────────────────

prod:
	docker compose up --build -d

prod-down:
	docker compose down
