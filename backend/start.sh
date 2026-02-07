#!/bin/bash

# install playwright
echo "installing playwright browser..."
playwright install chromium

# start the application
echo "Starting application..."
uvicorn main:app --host 0.0.0.0 --port $PORT
