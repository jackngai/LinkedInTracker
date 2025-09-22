# LinkedIn Private Notes Browser Extension

A Chromium browser extension that adds a private notes section to LinkedIn profile pages. Notes are saved per profile and stored locally using the File System Access API with fallback to browser storage.

## Features

- 📝 Add private notes to any LinkedIn profile
- 💾 Local file storage using File System Access API
- 🔄 Auto-save functionality with manual save option
- 🎨 Styled to match LinkedIn's design
- 📱 Responsive design for mobile and desktop
- 🌙 Dark mode support
- 🔒 Notes are stored locally and never sent to external servers

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

### Method 2: Pack and Install

1. In the extensions page, click "Pack extension"
2. Select the extension folder
3. This will create a `.crx` file that can be installed

## Usage

1. Navigate to any LinkedIn profile page (e.g., `https://www.linkedin.com/in/username`)
2. You'll see a "Your Private Notes" section above the About section
3. Type your notes in the textarea
4. Notes are automatically saved after 2 seconds of inactivity
5. Use the "Save" button to manually save immediately
6. Use the "Clear" button to remove all notes for the current profile

## Data Storage

The extension uses a two-tier storage approach:

1. **Primary**: File System Access API - Saves data to a local JSON file (`linkedin-notes.json`)
2. **Fallback**: Chrome Storage API - If File System Access is not available

### File System Access API

- On first use, you'll be prompted to choose a location for the notes file
- The file handle is saved for future use
- Data is stored in JSON format with profile IDs as keys

### Chrome Storage Fallback

- If File System Access API is not supported or fails
- Data is stored in the browser's local storage
- Accessible via `chrome.storage.local`

## File Structure

```
LinkedInBrowserExtension/
├── manifest.json          # Extension manifest
├── content.js             # Main content script
├── styles.css             # Styling for the notes section
└── README.md              # This file
```

## Permissions

- `activeTab`: Access to the current tab
- `storage`: Store notes data locally
- `host_permissions`: Access to LinkedIn.com

## Browser Compatibility

- Chrome 86+ (File System Access API support)
- Edge 86+ (File System Access API support)
- Other Chromium-based browsers with File System Access API support

## Privacy

- All data is stored locally on your device
- No data is sent to external servers
- Notes are only accessible through this extension
- You have full control over your data

## Troubleshooting

### Notes Section Not Appearing

1. Make sure you're on a LinkedIn profile page (`/in/username`)
2. Refresh the page
3. Check the browser console for any errors
4. Ensure the extension is enabled

### Data Not Saving

1. Check if File System Access API is supported in your browser
2. Ensure you have permission to save files in the chosen location
3. Check browser console for error messages

### Styling Issues

1. Clear browser cache and reload
2. Check if other extensions are interfering
3. Try disabling and re-enabling the extension

## Development

To modify or extend the extension:

1. Edit the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on LinkedIn

## License

This project is open source and available under the MIT License.
