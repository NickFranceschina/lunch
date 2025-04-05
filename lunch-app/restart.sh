#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restarting LUNCH application with Socket.IO${NC}"

# Stop any running processes
echo -e "${YELLOW}Stopping any running servers...${NC}"
pkill -f "node.*server" || true
pkill -f "npm.*start" || true

# Navigate to the server directory and install dependencies
echo -e "${YELLOW}Starting server with Socket.IO...${NC}"
cd "$(dirname "$0")/lunch-app/server" || exit 1
npm install
echo -e "${GREEN}Starting server...${NC}"
npm start &
SERVER_PID=$!

# Give the server time to start
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 5

# Navigate to the client directory and start the client
echo -e "${YELLOW}Starting client...${NC}"
cd ../client || exit 1
npm install
echo -e "${GREEN}Starting client...${NC}"
npm start &
CLIENT_PID=$!

echo -e "${GREEN}Both server and client are now running!${NC}"
echo -e "${YELLOW}Server PID: ${SERVER_PID}${NC}"
echo -e "${YELLOW}Client PID: ${CLIENT_PID}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both processes${NC}"

# Wait for Ctrl+C
trap 'kill $SERVER_PID $CLIENT_PID; echo -e "${GREEN}Stopped server and client${NC}"; exit 0' INT
wait 