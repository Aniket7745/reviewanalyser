// content script for review analyzer extension
// scrapes amazon product reviews from the current page

function extractReviews() {
  const reviews = [];
  const seenReviews = new Set();
  const productTitle = extractProductTitle();

  console.log('=== review extraction debug ===');
  console.log('platform: amazon');
  console.log('current url:', window.location.href);
  console.log('product title:', productTitle);

  // amazon review selectors
  const reviewSelectors = [
    '[data-hook="review"]',
    '.review',
    '.a-section.review',
    '[data-csa-c-type="review"]',
    '.a-section[data-hook="review"]'
  ];

  let reviewElements = [];

  console.log('trying review selectors...');
  for (const selector of reviewSelectors) {
    reviewElements = document.querySelectorAll(selector);
    console.log(`selector "${selector}": found ${reviewElements.length} elements`);
    if (reviewElements.length > 0) {
      console.log(`✅ found ${reviewElements.length} reviews using selector: ${selector}`);
      break;
    }
  }

  if (reviewElements.length === 0) {
    console.log('no reviews found with specific selectors, trying broader approach...');
    const allElements = document.querySelectorAll('*');
    console.log(`total elements on page: ${allElements.length}`);

    reviewElements = Array.from(allElements).filter(element => {
      const text = element.textContent || '';
      const isReview =
        text.includes('stars') ||
        text.includes('rating') ||
        (text.length > 50 &&
          text.length < 1000 &&
          (text.includes('good') || text.includes('bad') || text.includes('great') || text.includes('terrible')));

      if (isReview) {
        console.log(`potential review found: "${text.substring(0, 100)}..."`);
      }

      return isReview;
    });

    console.log(`broad approach found ${reviewElements.length} potential review elements`);
  }

  console.log(`found ${reviewElements.length} potential review elements`);

  reviewElements.forEach((element, index) => {
    if (index >= 10) return;

    if (element.tagName === 'SCRIPT' || element.getAttribute('type') === 'text/javascript') return;

    const reviewText = extractReviewText(element);
    const rating = extractRating(element);

    if (reviewText && reviewText.length > 10 && !isJavaScriptCode(reviewText)) {
      const reviewHash = reviewText.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 100);
      if (seenReviews.has(reviewHash)) {
        console.log(`skipping duplicate review: ${reviewText.substring(0, 50)}...`);
        return;
      }
      seenReviews.add(reviewHash);

      console.log(`review ${reviews.length + 1}:`, {
        text: reviewText.substring(0, 100) + '...',
        rating: rating || 0
      });

      reviews.push({
        text: reviewText,
        rating: rating || 0
      });
    }
  });

  return { reviews, productTitle };
}

function extractProductTitle() {
  const titleSelectors = [
    '#productTitle',
    '.product-title',
    'h1[data-automation-id="product-title"]',
    '.a-size-large.product-title-word-break'
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }

  return 'unknown product';
}

function extractReviewText(element) {
  const textSelectors = [
    '[data-hook="review-body"]',
    '.review-text',
    '.a-expander-content',
    '.a-size-base.review-text',
    'span[data-hook="review-body"]',
    '.a-expander-content span',
    '.review-text-content'
  ];

  for (const selector of textSelectors) {
    const textElement = element.querySelector(selector);
    if (textElement) {
      let text = cleanReviewText(textElement.textContent.trim());
      if (text && text.length > 10) return text;
    }
  }

  let text = cleanReviewText(element.textContent || '');
  if (text.length > 500) {
    const sentences = text.split(/[.!?]+/);
    text = sentences.slice(0, 3).join('. ') + '.';
  }
  return text;
}

function cleanReviewText(text) {
  if (!text) return '';

  text = text.replace(/read more|read less/gi, '');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

function isJavaScriptCode(text) {
  const jsPatterns = [
    /function\s*\(/,
    /p\.when\(/,
    /\.execute\(/,
    /toggleexpanderarialabel/,
    /typeof\s+/,
    /chrome\.runtime/,
    /addeventlistener/,
    /queryselector/,
    /innerhtml/,
    /textcontent/
  ];

  return jsPatterns.filter(p => p.test(text)).length >= 2;
}

function extractRating(element) {
  const ratingSelectors = [
    '[data-hook="review-star-rating"]',
    '.a-icon-alt',
    '.review-rating',
    'i[class*="star"]'
  ];

  for (const selector of ratingSelectors) {
    const ratingElement = element.querySelector(selector);
    if (ratingElement) {
      const text = ratingElement.textContent || '';
      let match = text.match(/(\d+(?:\.\d+)?)\s*out\s*of\s*5/);
      if (match) return parseFloat(match[1]);

      match = text.match(/(\d+(\.\d+)?)/);
      if (match) {
        const rating = parseFloat(match[1]);
        if (rating >= 1 && rating <= 5) return rating;
      }
    }
  }
  return 0;
}

// listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('content script received message:', request);

  if (request.action === "extractReviews") {
    try {
      const data = extractReviews();
      sendResponse({ success: true, data });
    } catch (error) {
      console.error('error extracting reviews:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.action === "navigateToNextPage") {
    try {
      const success = navigateToNextPage();
      sendResponse({ success });
    } catch (error) {
      console.error('error navigating to next page:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.action === "navigateToReviewsSection") {
    try {
      const success = navigateToReviewsSection();
      sendResponse({ success });
    } catch (error) {
      console.error('error navigating to reviews section:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else {
    sendResponse({ success: false, error: 'unknown action' });
  }
  return true;
});

function navigateToReviewsSection() {
  const reviewSectionSelectors = [
    'a[href*="reviews"]',
    'a[href*="review"]',
    '[data-hook="reviews-medley"] a',
    '.reviews-medley a'
  ];

  for (const selector of reviewSectionSelectors) {
    const reviewLink = document.querySelector(selector);
    if (reviewLink && reviewLink.offsetWidth > 0 && reviewLink.offsetHeight > 0) {
      reviewLink.click();
      return true;
    }
  }

  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    const text = link.textContent || '';
    const href = link.getAttribute('href') || '';
    if ((text.toLowerCase().includes('review') || href.includes('review')) &&
      link.offsetWidth > 0 && link.offsetHeight > 0) {
      link.click();
      return true;
    }
  }

  return false;
}

function navigateToNextPage() {
  const nextPageSelectors = [
    'a[aria-label*="next"]',
    '.a-pagination .a-last a',
    '[data-hook="pagination-next"]'
  ];

  for (const selector of nextPageSelectors) {
    const nextButton = document.querySelector(selector);
    if (nextButton && nextButton.offsetWidth > 0 && nextButton.offsetHeight > 0) {
      nextButton.click();
      return true;
    }
  }

  const paginationLinks = document.querySelectorAll('.a-pagination a');
  for (const link of paginationLinks) {
    const text = link.textContent || '';
    const href = link.getAttribute('href') || '';
    if ((text.toLowerCase().includes('next') || text.match(/\d+/)) && href.includes('reviews')) {
      link.click();
      return true;
    }
  }

  return false;
}

console.log('review analyzer content script loaded - amazon only');
