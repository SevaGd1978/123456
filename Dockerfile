# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve static frontend
FROM python:3.12-slim

WORKDIR /app

# Ensure curl / basic utilities
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure persistence data directory exists for SQLite
RUN mkdir -p /data

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=80 \
    FRONTEND_DIST=/app/frontend/dist \
    DATABASE_URL=sqlite:////data/family_budget.db

EXPOSE 80

WORKDIR /app/backend
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
