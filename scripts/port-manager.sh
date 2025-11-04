#!/bin/bash

# QA Bot - Port Management Script
# Provides functions to start/stop services on specific ports

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        echo -e "${YELLOW}🔄 Stopping $service_name on port $port...${NC}"
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo $pids | xargs kill -9 2>/dev/null
            sleep 1
            if check_port $port; then
                echo -e "${RED}❌ Failed to stop $service_name on port $port${NC}"
                return 1
            else
                echo -e "${GREEN}✅ Successfully stopped $service_name${NC}"
                return 0
            fi
        fi
    else
        echo -e "${BLUE}ℹ️  $service_name is not running on port $port${NC}"
        return 0
    fi
}

# Function to show port status
show_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    
    if check_port 8787; then
        echo -e "   Backend (8787): ${GREEN}RUNNING${NC}"
    else
        echo -e "   Backend (8787): ${RED}STOPPED${NC}"
    fi
    
    if check_port 3000; then
        echo -e "   Frontend (3000): ${GREEN}RUNNING${NC}"
    else
        echo -e "   Frontend (3000): ${RED}STOPPED${NC}"
    fi
}

# Main script logic
case "$1" in
    "stop-backend")
        kill_port 8787 "Backend API"
        ;;
    "stop-frontend")
        kill_port 3000 "Frontend UI"
        ;;
    "stop-app")
        echo -e "${YELLOW}🛑 Stopping QA Bot Application...${NC}"
        kill_port 8787 "Backend API"
        kill_port 3000 "Frontend UI"
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    "status")
        show_status
        ;;
    "check-backend")
        if check_port 8787; then
            echo "RUNNING"
            exit 0
        else
            echo "STOPPED"
            exit 1
        fi
        ;;
    "check-frontend")
        if check_port 3000; then
            echo "RUNNING"
            exit 0
        else
            echo "STOPPED"
            exit 1
        fi
        ;;
    *)
        echo -e "${BLUE}QA Bot Port Management Script${NC}"
        echo ""
        echo "Usage: $0 {stop-backend|stop-frontend|stop-app|status|check-backend|check-frontend}"
        echo ""
        echo "Commands:"
        echo "  stop-backend   - Stop backend API (port 8787)"
        echo "  stop-frontend  - Stop frontend UI (port 3000)"
        echo "  stop-app       - Stop both services"
        echo "  status         - Show current service status"
        echo "  check-backend  - Check if backend is running (for scripts)"
        echo "  check-frontend - Check if frontend is running (for scripts)"
        exit 1
        ;;
esac
