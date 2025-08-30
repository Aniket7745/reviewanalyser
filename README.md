# Review Analyzer - Firefox WebExtension

A Firefox extension that analyzes Amazon and Flipkart product reviews using the ChatGPT API and provides clear recommendations on whether a product is worth buying.

## Features

- 🔍 **Smart Review Extraction**: Automatically scrapes reviews from Amazon and Flipkart product pages
- 🤖 **AI-Powered Analysis**: Uses OpenAI's GPT-3.5-turbo to analyze review sentiment and provide recommendations
- 💰 **Cost-Effective**: Each analysis costs less than $0.01 using GPT-3.5-turbo
- 🔒 **Secure**: API keys are stored locally and never shared
- 🎨 **Modern UI**: Clean, responsive interface with loading states and error handling
- ⚡ **Fast**: Analyzes up to 10 reviews per product for quick results

## Installation

### Prerequisites

1. **Firefox Browser**: Make sure you have Firefox installed
2. **OpenAI API Key**: You'll need an OpenAI API key to use the extension

### Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated key (starts with "sk-")

### Loading the Extension

1. **Download/Clone** this repository to your local machine
2. **Open Firefox** and navigate to `about:debugging`
3. Click **"This Firefox"** in the left sidebar
4. Click **"Load Temporary Add-on..."**
5. Select the `manifest.json` file from this project
6. The extension should now appear in your toolbar

### Setting Up Your API Key

1. Click the **Review Analyzer** extension icon in your toolbar
2. Click the **"Settings"** button
3. Enter your OpenAI API key in the input field
4. Click **"Save Settings"** and optionally **"Test API Key"** to verify it works

## Usage

### Analyzing Product Reviews

1. **Navigate** to any Amazon or Flipkart product page with reviews
2. **Click** the Review Analyzer extension icon in your toolbar
3. **Click** "Analyze Reviews" button
4. **Wait** for the AI analysis to complete
5. **Read** the AI's recommendation about whether to buy the product

### What the Extension Analyzes

The extension extracts and analyzes:
- Review text content
- Star ratings (when available)
- Overall sentiment patterns
- Common pros and cons
- Product reliability indicators

### Understanding the Results

The AI provides:
- **Clear recommendation**: Buy, Don't Buy, or Mixed
- **Key insights**: Common themes from reviews
- **Pros and cons**: What customers liked/disliked
- **Confidence level**: How clear the recommendation is

## File Structure

```
review-analyzer/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for scraping
├── popup.html            # Popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── settings.html         # Settings page
├── settings.js           # Settings functionality
├── settings.css          # Settings styling
├── icons/                # Extension icons
└── README.md             # This file
```

## Technical Details

### Permissions Used

- `activeTab`: Access to the current tab
- `scripting`: Inject content scripts
- `storage`: Store API key locally
- `https://www.amazon.com/*`: Access to Amazon.com
- `https://www.flipkart.com/*`: Access to Flipkart.com

### API Usage

- **Model**: GPT-3.5-turbo
- **Cost**: ~$0.002 per 1K tokens
- **Typical cost per analysis**: <$0.01
- **Token limit**: 300 tokens per response

### Security

- API keys are stored in `chrome.storage.local`
- No data is sent to external servers except OpenAI
- All communication is encrypted via HTTPS
- No personal data is collected or stored

## Troubleshooting

### Common Issues

**"No reviews found"**
- Make sure you're on an Amazon or Flipkart product page
- Ensure the page has customer reviews
- Try refreshing the page and trying again

**"API key not found"**
- Go to Settings and enter your OpenAI API key
- Make sure the key starts with "sk-"
- Test the API key to verify it works

**"API key test failed"**
- Check your internet connection
- Verify your API key is correct
- Ensure you have credits in your OpenAI account

**Extension not working**
- Reload the extension in `about:debugging`
- Check the browser console for errors
- Make sure you're on an Amazon.com or Flipkart.com page

### Debug Mode

To enable debug logging:
1. Open Firefox Developer Tools
2. Go to Console tab
3. Look for messages starting with "Review Analyzer"

## Development

### Local Development

1. Clone the repository
2. Make your changes
3. Reload the extension in `about:debugging`
4. Test your changes

### Building for Production

For production deployment, you'll need to:
1. Create proper icons (48x48 and 96x96 PNG files)
2. Package the extension
3. Submit to Firefox Add-ons store

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Look for error messages in the browser console
3. Verify your API key is working
4. Make sure you're on a supported Amazon or Flipkart page

## Privacy Policy

This extension:
- Does not collect personal information
- Does not track your browsing history
- Only sends review data to OpenAI for analysis
- Stores your API key locally on your device
- Does not share data with third parties

---

**Note**: This extension is for educational and personal use. Please respect Amazon's and Flipkart's terms of service and use responsibly.
