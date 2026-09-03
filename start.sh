#!/bin/bash
set -e

echo "Starting Family Budget Application..."

# Start backend
echo "Starting Backend API on port 8000..."
cd /workspace/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "Starting Frontend Vite server on port 5173..."
cd /workspace/frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

wait $BACKEND_PID $FRONTEND_PID
