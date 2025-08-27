# Public Assets

This directory contains all public assets for the Source Cooperative application.

## Favicon Structure

The favicon system is designed to be simple and elegant with no redundancy:

### Files
- `favicon.ico` - Main favicon (light theme)
- `favicon-dark.ico` - Dark theme favicon
- `icon.svg` - Main SVG icon (light theme)
- `icon-dark.svg` - Dark theme SVG icon
- `icon-192.png` - PWA icon (192x192)
- `icon-512.png` - PWA icon (512x512)
- `apple-touch-icon.png` - iOS home screen icon

### Theme Support
- The application automatically switches favicons based on the user's theme preference
- Light theme uses `favicon.ico` and `icon.svg`
- Dark theme uses `favicon-dark.ico` and `icon-dark.svg`
- Theme switching is handled by JavaScript in the layout

### Usage
- Standard favicon: `favicon.ico` (automatically switches based on theme)
- PWA manifest: Uses `icon.svg` as primary, with PNG fallbacks
- iOS: Uses `apple-touch-icon.png`

## Logo Files
- `logotype-light.svg` - Light theme logo
- `logotype-dark.svg` - Dark theme logo

## Fonts
- Custom fonts are stored in the `fonts/` directory
