# Quick Installation Guide

## Step-by-Step Installation

### 1. Download the Extension
- Download or clone this repository to your computer
- Make sure all files are in the same folder

### 2. Open Firefox Developer Tools
- Open Firefox browser
- Type `about:debugging` in the address bar
- Press Enter

### 3. Load the Extension
- Click **"This Firefox"** in the left sidebar
- Click **"Load Temporary Add-on..."**
- Navigate to the folder containing this extension
- Select the `manifest.json` file
- Click **"Open"**

### 4. Verify Installation
- You should see "Review Analyzer" in the list of loaded add-ons
- The extension icon should appear in your toolbar
- If you don't see the icon, click the puzzle piece icon in the toolbar to find it

### 5. Set Up Your API Key
- Click the Review Analyzer extension icon
- Click **"Settings"**
- Enter your OpenAI API key
- Click **"Save Settings"**
- Optionally click **"Test API Key"** to verify it works

### 6. Start Using
- Go to any Amazon product page with reviews
- Click the extension icon
- Click **"Analyze Reviews"**
- Read the AI's recommendation!

## Troubleshooting

**Extension not appearing in toolbar:**
- Check if it's in the puzzle piece menu
- Try reloading the extension in `about:debugging`

**"Load Temporary Add-on" not working:**
- Make sure you're on the "This Firefox" tab
- Verify the manifest.json file is in the project folder
- Try refreshing the debugging page

**API key issues:**
- Make sure your key starts with "sk-"
- Test the key in the settings page
- Check your OpenAI account has credits

## Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify all files are present in the project folder
3. Make sure you're using Firefox 109 or later
4. Check the main README.md for more detailed troubleshooting

---

**Note**: This is a temporary installation. The extension will be removed when you restart Firefox. For permanent installation, you'll need to package it and submit to the Firefox Add-ons store.
