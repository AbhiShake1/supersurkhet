#!/bin/bash

# Script to replace all existing page components with enhanced versions

echo "Starting enhancement replacement process..."

# Define the pages directory
PAGES_DIR="/Users/abhi/proj/personal/supersurkhet/apps/site/src/components/pages"

# List of pages to enhance
PAGES=("cinema" "restaurant" "cooperative" "hotel")

# Backup original files
echo "Creating backups of original files..."
for page in "${PAGES[@]}"; do
  if [ -f "$PAGES_DIR/$page/${page}-client-page.tsx" ]; then
    cp "$PAGES_DIR/$page/${page}-client-page.tsx" "$PAGES_DIR/$page/${page}-client-page-original.tsx"
    echo "Backed up $page page"
  fi
done

# Replace with enhanced versions
echo "Replacing with enhanced versions..."
if [ -f "$PAGES_DIR/cinema/cinema-client-page-enhanced.tsx" ]; then
  cp "$PAGES_DIR/cinema/cinema-client-page-enhanced.tsx" "$PAGES_DIR/cinema/cinema-client-page.tsx"
  echo "Enhanced cinema page installed"
fi

if [ -f "$PAGES_DIR/restaurant/restaurant-client-page-enhanced.tsx" ]; then
  cp "$PAGES_DIR/restaurant/restaurant-client-page-enhanced.tsx" "$PAGES_DIR/restaurant/restaurant-client-page.tsx"
  echo "Enhanced restaurant page installed"
fi

if [ -f "$PAGES_DIR/cooperative/cooperative-client-page-enhanced.tsx" ]; then
  cp "$PAGES_DIR/cooperative/cooperative-client-page-enhanced.tsx" "$PAGES_DIR/cooperative/cooperative-client-page.tsx"
  echo "Enhanced cooperative page installed"
fi

if [ -f "$PAGES_DIR/hotel/hotel-client-page-enhanced.tsx" ]; then
  cp "$PAGES_DIR/hotel/hotel-client-page-enhanced.tsx" "$PAGES_DIR/hotel/hotel-client-page.tsx"
  echo "Enhanced hotel page installed"
fi

echo "Enhancement replacement process completed!"
echo "Original files have been backed up with '-original' suffix"
echo ""
echo "Note: Gym and Generic pages have been updated separately with modern versions."
echo "They no longer use the older enhancement system."

# Clean up the enhanced files since we're keeping the modern versions
echo "Cleaning up intermediate enhanced files for gym and generic..."
rm -f "$PAGES_DIR/gym/gym-client-page-enhanced.tsx"
rm -f "$PAGES_DIR/generic/generic-client-page-enhanced.tsx"
echo "Cleanup completed!"