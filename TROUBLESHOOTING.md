# Troubleshooting Guide

## "No reviews found on any page" Error

If you're getting this error, here are the steps to resolve it:

### **Step 1: Check the URL**
Make sure you're on a product page with reviews:
- **Amazon**: URL should contain `/dp/` or `/gp/product/`
- **Flipkart**: URL should contain `/p/` or product ID
- **Examples**:
  - ✅ `https://www.amazon.in/dp/B08N5WRWNW`
  - ✅ `https://www.flipkart.com/product-name/p/itm123456`

### **Step 2: Navigate to Reviews Section**
If you're on a product page but not the reviews section:

1. **Look for "Reviews" link** on the page
2. **Click on "Customer Reviews"** or "Ratings & Reviews"
3. **Wait for the reviews to load**
4. **Try the scraper again**

### **Step 3: Use the "Go to Reviews" Button**
The extension now has a "Go to Reviews Section" button that will:
- Automatically navigate to the reviews section
- Open the page in a new tab
- Help you get to the right page

### **Step 4: Check Browser Console**
Open Developer Tools (F12) and check the Console tab for:
- Debug messages from the scraper
- Any error messages
- Information about what selectors were tried

### **Step 5: Manual Navigation**
If automatic navigation doesn't work:

**For Amazon:**
1. Scroll down to "Customer Reviews" section
2. Click "See all reviews"
3. Wait for the reviews page to load
4. Try scraping again

**For Flipkart:**
1. Look for "Reviews" or "Ratings & Reviews" section
2. Click on the reviews tab/link
3. Wait for reviews to load
4. Try scraping again

### **Step 6: Common Issues**

#### **Page Not Fully Loaded**
- Wait a few seconds for the page to fully load
- Refresh the page and try again
- Check your internet connection

#### **Dynamic Content**
- Some reviews load dynamically
- Try scrolling down the page
- Wait for "Load More" buttons to appear

#### **Different Page Structure**
- Amazon/Flipkart may have updated their website
- Try a different product page
- Check if the extension needs an update

### **Step 7: Debug Information**
The scraper now provides detailed debug information in the browser console:
- Platform detection (Amazon/Flipkart)
- Current URL
- Product title found
- Selectors tried
- Number of elements found
- Potential reviews detected

### **Step 8: Still Having Issues?**
If none of the above works:
1. Try a different product page
2. Check if the product has any reviews
3. Try a different browser
4. Reload the extension
5. Check for extension updates

### **Example Debug Output**
```
=== REVIEW EXTRACTION DEBUG ===
Platform: Amazon
Current URL: https://www.amazon.in/dp/B08N5WRWNW
Product Title: Product Name
Trying review selectors...
Selector "[data-hook="review"]": Found 0 elements
Selector ".review": Found 0 elements
Selector ".a-section.review": Found 0 elements
No reviews found with specific selectors, trying broader approach...
Total elements on page: 1500
Broad approach found 0 potential review elements
```

This helps identify exactly what the scraper is finding (or not finding) on the page.
