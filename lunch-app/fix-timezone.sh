#!/bin/bash

# Get the current local timezone
LOCAL_TZ=$(date +%Z)
TZ_PATH=$(readlink /etc/localtime | sed 's/\/usr\/share\/zoneinfo\///')

echo "Detected local timezone: $TZ_PATH ($LOCAL_TZ)"
echo ""
echo "Available common timezones:"
echo "1) America/New_York (Eastern Time)"
echo "2) America/Chicago (Central Time)"
echo "3) America/Denver (Mountain Time)"
echo "4) America/Los_Angeles (Pacific Time)"
echo "5) Europe/London (GMT/BST)"
echo "6) Europe/Paris (Central European Time)" 
echo "7) Asia/Tokyo (Japan)"
echo "8) Australia/Sydney (Eastern Australia)"
echo "9) Use system timezone: $TZ_PATH"
echo "10) Enter custom timezone"
echo ""

read -p "Select timezone [9]: " CHOICE

case $CHOICE in
  1) TZ="America/New_York" ;;
  2) TZ="America/Chicago" ;;
  3) TZ="America/Denver" ;;
  4) TZ="America/Los_Angeles" ;;
  5) TZ="Europe/London" ;;
  6) TZ="Europe/Paris" ;;
  7) TZ="Asia/Tokyo" ;;
  8) TZ="Australia/Sydney" ;;
  9) TZ="$TZ_PATH" ;;
  10) 
    read -p "Enter custom timezone (e.g. Europe/Berlin): " CUSTOM_TZ
    TZ="$CUSTOM_TZ" 
    ;;
  *) TZ="$TZ_PATH" ;;
esac

echo "Setting timezone to: $TZ"

# Update docker-compose.yml to include the TZ environment variable
sed -i.bak "s|- TZ=.*||g" docker-compose.yml
sed -i.bak "/JWT_SECRET/a\\      - TZ=$TZ" docker-compose.yml

echo "Docker Compose file updated. Restarting container..."

# Restart the container
docker-compose down
docker-compose up -d

echo "Container restarted with new timezone: $TZ"
echo ""
echo "The lunch notifications should now work correctly." 