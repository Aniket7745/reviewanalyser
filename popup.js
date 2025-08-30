// Popup script for Review Analyzer extension
// Handles user interactions and communicates with content/background scripts

document.addEventListener('DOMContentLoaded', function () {
  // Get DOM elements
  const analyzeBtn = document.getElementById('analyzeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const chatgptBtn = document.getElementById('chatgptBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const goToReviewsBtn = document.getElementById('goToReviewsBtn');
  const urlInput = document.getElementById('urlInput');
  const pageCountSelect = document.getElementById('pageCount');
  const statusText = document.getElementById('statusText');
  const resultSection = document.getElementById('resultSection');
  const errorSection = document.getElementById('errorSection');
  const result = document.getElementById('result');
  const error = document.getElementById('error');
  const spinner = document.getElementById('spinner');

  // Event listeners
  analyzeBtn.addEventListener('click', handleAnalyzeClick);
  downloadBtn.addEventListener('click', downloadReviews);
  chatgptBtn.addEventListener('click', openInChatGPT);
  copyUrlBtn.addEventListener('click', copyProductUrl);
  goToReviewsBtn.addEventListener('click', handleGoToReviews);

  // Global variable to store scraped data
  let scrapedData = null;

  // Initialize status and get current tab URL
  updateStatus('Ready to scrape reviews', 'ready');
  getCurrentTabUrl();

  // Function to handle scrape button click
  async function handleAnalyzeClick() {
    try {
      // Get URL from input
      const url = urlInput.value.trim();

      if (!url) {
        throw new Error('Please enter an Amazon product URL.');
      }

      if (!url.includes('amazon.com') && !url.includes('amazon.in') && !url.includes('flipkart.com')) {
        throw new Error('Please enter a valid Amazon or Flipkart product URL.');
      }

      // Update UI to loading state
      setLoadingState(true);
      updateStatus('Scraping reviews...', 'loading');
      hideResults();

      // Create a new tab with the URL
      const newTab = await new Promise((resolve, reject) => {
        chrome.tabs.create({ url: url, active: false }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      });

      // Wait a bit for the tab to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for the page to load
      await new Promise((resolve) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      // Inject content script
      await new Promise((resolve, reject) => {
        chrome.tabs.executeScript(newTab.id, { file: 'content.js' }, (result) => {
          if (chrome.runtime.lastError) {
            console.error('Content script injection error:', chrome.runtime.lastError);
            reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
          } else {
            console.log('Content script injected successfully');
            resolve(result);
          }
        });
      });

      // Get the number of pages to scrape
      const pageCount = parseInt(pageCountSelect.value);

      // Extract reviews from multiple pages
      const allReviews = [];
      let productTitle = '';

      for (let page = 1; page <= pageCount; page++) {
        updateStatus(`Scraping page ${page} of ${pageCount}... (${allReviews.length} reviews so far)`, 'loading');

        // Extract reviews from the current page with timeout
        const extractResponse = await Promise.race([
          new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(newTab.id, {
              action: 'extractReviews',
              page: page,
              totalPages: pageCount
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Message sending error:', chrome.runtime.lastError);
                reject(new Error(`Failed to communicate with content script: ${chrome.runtime.lastError.message}`));
              } else {
                console.log('Message sent successfully, response:', response);
                resolve(response);
              }
            });
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Content script timeout - page may not be fully loaded')), 15000)
          )
        ]);

        if (!extractResponse || !extractResponse.success) {
          throw new Error(extractResponse?.error || `Failed to extract reviews from page ${page}`);
        }

        const { reviews, title } = extractResponse.data;

        if (page === 1) {
          productTitle = title;
        }

        if (reviews && reviews.length > 0) {
          allReviews.push(...reviews);
          console.log(`Page ${page}: Found ${reviews.length} reviews`);
        } else if (page === 1) {
          // If no reviews found on first page, try to navigate to reviews section
          console.log('No reviews found, attempting to navigate to reviews section...');
          updateStatus('No reviews found. Trying to navigate to reviews section...', 'loading');

          const reviewSectionResponse = await Promise.race([
            new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(newTab.id, {
                action: 'navigateToReviewsSection'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(`Failed to navigate to reviews section: ${chrome.runtime.lastError.message}`));
                } else {
                  resolve(response);
                }
              });
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Navigation timeout')), 10000)
            )
          ]);

          if (reviewSectionResponse && reviewSectionResponse.success) {
            // Wait for the page to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Try extracting reviews again
            const retryResponse = await Promise.race([
              new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(newTab.id, {
                  action: 'extractReviews',
                  page: page,
                  totalPages: pageCount
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(`Failed to communicate with content script: ${chrome.runtime.lastError.message}`));
                  } else {
                    resolve(response);
                  }
                });
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Content script timeout - page may not be fully loaded')), 15000)
              )
            ]);

            if (retryResponse && retryResponse.success) {
              const { reviews: retryReviews } = retryResponse.data;
              if (retryReviews && retryReviews.length > 0) {
                allReviews.push(...retryReviews);
                console.log(`After navigation: Found ${retryReviews.length} reviews`);
              }
            }
          }
        }

        // If this is not the last page, navigate to the next page
        if (page < pageCount) {
          const nextPageResponse = await Promise.race([
            new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(newTab.id, {
                action: 'navigateToNextPage'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(`Failed to navigate to next page: ${chrome.runtime.lastError.message}`));
                } else {
                  resolve(response);
                }
              });
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Navigation timeout')), 10000)
            )
          ]);

          if (!nextPageResponse || !nextPageResponse.success) {
            console.warn(`Could not navigate to page ${page + 1}, stopping at page ${page}`);
            break;
          }

          // Wait for the page to load
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (allReviews.length === 0) {
        // Show the "Go to Reviews" button instead of throwing an error
        updateStatus('No reviews found. Try navigating to the reviews section first.', 'error');
        goToReviewsBtn.style.display = 'block';
        throw new Error('No reviews found on any page. Please make sure you are on a product page with reviews.');
      }

      // Store the scraped data
      scrapedData = { reviews: allReviews, productTitle };

      // Display results
      displayResult(allReviews, productTitle);
      updateStatus(`Scraped ${allReviews.length} reviews from ${pageCount} pages successfully!`, 'success');
      copyUrlBtn.style.display = 'block';
      downloadBtn.style.display = 'block';
      chatgptBtn.style.display = 'block';
      goToReviewsBtn.style.display = 'none'; // Hide the button when reviews are found

      // Close the tab we created
      chrome.tabs.remove(newTab.id);

    } catch (error) {
      console.error('Error during scraping:', error);
      displayError(error.message);
      updateStatus('Scraping failed', 'error');
    } finally {
      setLoadingState(false);
    }
  }

  // Function to set loading state
  function setLoadingState(loading) {
    if (loading) {
      analyzeBtn.classList.add('loading');
      analyzeBtn.disabled = true;
    } else {
      analyzeBtn.classList.remove('loading');
      analyzeBtn.disabled = false;
    }
  }

  // Function to update status
  function updateStatus(message, type) {
    statusText.textContent = message;

    // Remove all status classes
    document.querySelector('.status').classList.remove('ready', 'loading', 'success', 'error');

    // Add appropriate class
    if (type) {
      document.querySelector('.status').classList.add(type);
    }
  }

  // Function to display result
  function displayResult(reviews, productTitle) {
    const reviewsText = reviews.map((review, index) =>
      `Review ${index + 1} (${review.rating}/5 stars):\n${review.text}\n`
    ).join('\n---\n\n');

    result.innerHTML = `
            <div class="result-header">
                <strong>Product:</strong> ${productTitle}<br>
                <strong>Reviews scraped:</strong> ${reviews.length}
            </div>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #e9ecef;">
            <div class="result-content">
                <pre style="white-space: pre-wrap; font-size: 12px; max-height: 200px; overflow-y: auto;">${reviewsText}</pre>
            </div>
        `;

    resultSection.style.display = 'block';
    errorSection.style.display = 'none';
  }

  // Function to display error
  function displayError(errorMessage) {
    error.textContent = errorMessage;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
  }

  // Function to hide results
  function hideResults() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
  }

  // Function to download reviews as text file
  function downloadReviews() {
    if (!scrapedData) {
      displayError('No reviews to download. Please scrape reviews first.');
      return;
    }

    const { reviews, productTitle } = scrapedData;

    // Create text content
    const content = `Amazon Product Reviews\n` +
      `Product: ${productTitle}\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `Total Reviews: ${reviews.length}\n` +
      `\n${'='.repeat(50)}\n\n` +
      reviews.map((review, index) =>
        `Review ${index + 1}\n` +
        `Rating: ${review.rating}/5 stars\n` +
        `Text: ${review.text}\n` +
        `\n${'-'.repeat(30)}\n`
      ).join('\n');

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazon-reviews-${productTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatus('Reviews downloaded successfully!', 'success');
  }

  // Function to open ChatGPT with reviews
  function openInChatGPT() {
    if (!scrapedData) {
      displayError('No reviews to analyze. Please scrape reviews first.');
      return;
    }

    const { reviews, productTitle } = scrapedData;

    // Create the prompt for ChatGPT
    const prompt = `Please analyze these Amazon product reviews and provide insights:

Product: ${productTitle}
Total Reviews: ${reviews.length}

Reviews:
${reviews.map((review, index) =>
      `Review ${index + 1} (${review.rating}/5 stars): ${review.text}`
    ).join('\n\n')}

Please provide:
1. Overall sentiment analysis
2. Key pros and cons mentioned
3. Common themes
4. Whether this product is worth buying
5. Any quality concerns or red flags

Keep the analysis concise and actionable.`;

    // Check if ChatGPT is already open with more flexible matching
    chrome.tabs.query({}, (allTabs) => {
      const chatgptTabs = allTabs.filter(tab =>
        tab.url && (
          tab.url.includes('chat.openai.com') ||
          tab.url.includes('chatgpt.com') ||
          tab.url.startsWith('https://chat.openai.com')
        )
      );

      if (chatgptTabs && chatgptTabs.length > 0) {
        // ChatGPT is already open, switch to it and paste
        const existingTab = chatgptTabs[0];
        chrome.tabs.update(existingTab.id, { active: true }, () => {
          chrome.windows.update(existingTab.windowId, { focused: true }, () => {
            // Wait a bit for the tab to be active, then paste
            setTimeout(() => {
              pasteToChatGPT(existingTab.id, prompt);
            }, 1000);
          });
        });
      } else {
        // ChatGPT is not open, create new tab and paste
        chrome.tabs.create({ url: 'https://chat.openai.com/' }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('Error opening ChatGPT:', chrome.runtime.lastError);
            displayError('Failed to open ChatGPT. Please try again.');
          } else {
            // Wait for ChatGPT to load, then paste
            setTimeout(() => {
              pasteToChatGPT(tab.id, prompt);
            }, 5000);
          }
        });
      }

      // Function to paste text to ChatGPT
      function pasteToChatGPT(tabId, text) {
        // Create a content script to paste into ChatGPT
        const pasteScript = `
            (function() {
                console.log('Starting ChatGPT paste script...');
                
                // Wait a bit for ChatGPT to fully load
                setTimeout(() => {
                    // Try different selectors for ChatGPT textarea
                    const selectors = [
                        'textarea[data-id="root"]',
                        'textarea[placeholder*="Message"]',
                        'textarea[placeholder*="Send a message"]',
                        'textarea[placeholder*="Send"]',
                        'textarea[data-testid="chat-input"]',
                        'textarea[data-testid="send-button"]',
                        'textarea',
                        '[contenteditable="true"]',
                        '.markdown',
                        '[role="textbox"]',
                        '[data-testid="chat-input"]',
                        '.chat-input'
                    ];
                    
                    let textarea = null;
                    
                    // Find the textarea
                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        console.log('Selector:', selector, 'Found elements:', elements.length);
                        
                        for (const element of elements) {
                            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                                textarea = element;
                                console.log('Found visible textarea with selector:', selector);
                                break;
                            }
                        }
                        
                        if (textarea) break;
                    }
                    
                    if (textarea) {
                        // Focus the textarea
                        textarea.focus();
                        console.log('Focused textarea');
                        
                        // Clear any existing content
                        if (textarea.tagName === 'TEXTAREA') {
                            textarea.value = '';
                            textarea.value = \`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                            // Trigger multiple events
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                            textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
                        } else if (textarea.contentEditable === 'true') {
                            textarea.textContent = '';
                            textarea.textContent = \`${text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        
                        console.log('Text pasted to ChatGPT successfully');
                        return true;
                    } else {
                        console.log('No textarea found in ChatGPT');
                        console.log('Available textareas:', document.querySelectorAll('textarea'));
                        console.log('Available contenteditable:', document.querySelectorAll('[contenteditable="true"]'));
                        return false;
                    }
                }, 200); // Wait 2 seconds for ChatGPT to load
            })();
        `;

        // Execute the script in ChatGPT tab
        chrome.tabs.executeScript(tabId, { code: pasteScript }, (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error pasting to ChatGPT:', chrome.runtime.lastError);
            updateStatus('Failed to paste to ChatGPT. Please paste manually.', 'error');
          } else {
            console.log('Paste script result:', result);
            if (result && result[0]) {
              updateStatus('Reviews automatically pasted to ChatGPT!', 'success');
            } else {
              updateStatus('Could not find ChatGPT text box. Please paste manually.', 'error');
            }
          }
        });
      }
    });
  }

  // Function to copy product URL to clipboard
  function copyProductUrl() {
    const url = urlInput.value.trim();

    if (!url) {
      displayError('No URL to copy. Please enter an Amazon product URL first.');
      return;
    }

    navigator.clipboard.writeText(url).then(() => {
      updateStatus('Product URL copied to clipboard!', 'success');

      // Show temporary success message
      const originalText = copyUrlBtn.textContent;
      copyUrlBtn.textContent = 'URL Copied!';
      copyUrlBtn.style.background = '#28a745';

      setTimeout(() => {
        copyUrlBtn.textContent = originalText;
        copyUrlBtn.style.background = '#6c757d';
      }, 2000);

    }).catch((err) => {
      console.error('Failed to copy URL:', err);
      displayError('Failed to copy URL to clipboard. Please try again.');
    });
  }

  // Function to get current tab URL
  async function getCurrentTabUrl() {
    try {
      const tabs = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });

      if (tabs && tabs.length > 0) {
        const currentUrl = tabs[0].url;

        // Check if it's an Amazon or Flipkart product page
        if (currentUrl && (currentUrl.includes('amazon.com') || currentUrl.includes('amazon.in') || currentUrl.includes('flipkart.com'))) {
          urlInput.value = currentUrl;
          const platform = currentUrl.includes('flipkart.com') ? 'Flipkart' : 'Amazon';
          updateStatus(`Current ${platform} page detected!`, 'success');
        } else {
          updateStatus('Please navigate to an Amazon or Flipkart product page', 'error');
        }
      } else {
        updateStatus('No active tab found', 'error');
      }
    } catch (error) {
      console.error('Error getting current tab URL:', error);
      if (error.message.includes('Missing host permission')) {
        updateStatus('Permission denied. Please refresh the page and try again.', 'error');
      } else {
        updateStatus('Error detecting current page', 'error');
      }
    }
  }

  // Function to handle "Go to Reviews" button click
  async function handleGoToReviews() {
    try {
      const url = urlInput.value.trim();

      if (!url) {
        displayError('No URL to navigate. Please enter an Amazon or Flipkart product URL first.');
        return;
      }

      if (!url.includes('amazon.com') && !url.includes('amazon.in') && !url.includes('flipkart.com')) {
        displayError('Please enter a valid Amazon or Flipkart product URL.');
        return;
      }

      // Create a new tab with the URL
      const newTab = await new Promise((resolve, reject) => {
        chrome.tabs.create({ url: url, active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      });

      // Wait for the page to load
      await new Promise((resolve) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      // Inject content script
      await new Promise((resolve, reject) => {
        chrome.tabs.executeScript(newTab.id, { file: 'content.js' }, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result);
          }
        });
      });

      // Wait a bit for the script to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to reviews section
      const response = await Promise.race([
        new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(newTab.id, {
            action: 'navigateToReviewsSection'
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Failed to navigate: ${chrome.runtime.lastError.message}`));
            } else {
              resolve(response);
            }
          });
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        )
      ]);

      if (response && response.success) {
        updateStatus('Successfully navigated to reviews section!', 'success');
        // Keep the tab open for manual review
      } else {
        updateStatus('Could not automatically navigate to reviews section. Please navigate manually.', 'error');
      }

    } catch (error) {
      console.error('Error navigating to reviews:', error);
      displayError(error.message);
      updateStatus('Navigation failed', 'error');
    }
  }

  // Function to copy URL and automatically analyze
  async function copyAndAnalyze() {
    const url = urlInput.value.trim();

    if (!url) {
      displayError('No URL to copy. Please enter an Amazon product URL first.');
      return;
    }

    if (!url.includes('amazon.com') && !url.includes('amazon.in') && !url.includes('flipkart.com')) {
      displayError('Please enter a valid Amazon or Flipkart product URL.');
      return;
    }

    try {
      // Copy URL to clipboard
      await navigator.clipboard.writeText(url);

      // Show success feedback
      const originalText = copyAndAnalyzeBtn.textContent;
      copyAndAnalyzeBtn.textContent = '✅';
      copyAndAnalyzeBtn.style.background = '#28a745';

      updateStatus('URL copied! Starting analysis...', 'loading');

      // Automatically start the scraping process
      await handleAnalyzeClick();

      // Reset button after a delay
      setTimeout(() => {
        copyAndAnalyzeBtn.textContent = originalText;
        copyAndAnalyzeBtn.style.background = '#667eea';
      }, 3000);

    } catch (err) {
      console.error('Failed to copy URL:', err);
      displayError('Failed to copy URL. Please try again.');
    }
  }
});
