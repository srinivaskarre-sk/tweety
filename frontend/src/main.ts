interface Tweet {
  id: string;
  content: string;
  characterCount: number;
  position: number;
  totalTweets: number;
}

interface ThreadResponse {
  tweets: Tweet[];
  topic: string;
  generatedAt: string;
}

interface IntentionAnalysis {
  intention: string;
  isDatabaseTopic: boolean;
  suggestedContext?: string;
  fallbackToOriginal?: boolean;
}

class ThreadGenerator {
  private apiUrl = 'http://localhost:3001';
  private currentThread: Tweet[] = [];
  private currentStep = 1;
  private currentAnalysis: IntentionAnalysis | null = null;

  constructor() {
    this.initializeEventListeners();
    this.showStep(1);
  }

  private initializeEventListeners() {
    // Step 1: Topic input form
    const form = document.getElementById('threadForm') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.analyzeTopic();
    });

    // Skip to original flow
    const skipBtn = document.getElementById('skipToOriginalBtn') as HTMLButtonElement;
    skipBtn.addEventListener('click', () => {
      this.generateOriginalThread();
    });

    // Step 2: Intention review
    const backBtn = document.getElementById('backToInputBtn') as HTMLButtonElement;
    backBtn.addEventListener('click', () => {
      this.showStep(1);
    });

    const generateWithContextBtn = document.getElementById('generateWithContextBtn') as HTMLButtonElement;
    generateWithContextBtn.addEventListener('click', () => {
      this.generateEnhancedThread();
    });

    // Results actions
    const copyAllBtn = document.getElementById('copyAllBtn') as HTMLButtonElement;
    copyAllBtn.addEventListener('click', () => {
      this.copyAllTweets();
    });

    const startOverBtn = document.getElementById('startOverBtn') as HTMLButtonElement;
    startOverBtn.addEventListener('click', () => {
      this.startOver();
    });
  }

  private showStep(step: number) {
    this.currentStep = step;
    
    // Hide all steps
    document.getElementById('inputStep')?.classList.add('hidden');
    document.getElementById('intentionStep')?.classList.add('hidden');
    document.getElementById('threadResults')?.classList.add('hidden');
    
    // Show progress indicator if not on step 1
    const progressIndicator = document.getElementById('progressIndicator');
    if (step > 1) {
      progressIndicator?.classList.remove('hidden');
    } else {
      progressIndicator?.classList.add('hidden');
    }
    
    // Update progress indicators
    this.updateProgressIndicator(step);
    
    // Show current step
    switch (step) {
      case 1:
        document.getElementById('inputStep')?.classList.remove('hidden');
        break;
      case 2:
        document.getElementById('intentionStep')?.classList.remove('hidden');
        break;
      case 3:
        document.getElementById('threadResults')?.classList.remove('hidden');
        break;
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateProgressIndicator(currentStep: number) {
    const indicators = ['step1Indicator', 'step2Indicator', 'step3Indicator'];
    const progressBars = ['progress1', 'progress2'];
    
    indicators.forEach((id, index) => {
      const indicator = document.getElementById(id);
      if (!indicator) return;
      
      const stepNum = index + 1;
      if (stepNum < currentStep) {
        // Completed step
        indicator.className = 'w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium';
        indicator.innerHTML = '✓';
      } else if (stepNum === currentStep) {
        // Current step
        indicator.className = 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium';
        indicator.innerHTML = stepNum.toString();
      } else {
        // Future step
        indicator.className = 'w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium';
        indicator.innerHTML = stepNum.toString();
      }
    });
    
    // Update progress bars
    progressBars.forEach((id, index) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      
      const barStep = index + 1;
      if (currentStep > barStep) {
        bar.style.width = '100%';
      } else {
        bar.style.width = '0%';
      }
    });
  }

  private async analyzeTopic() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;
    const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();

    if (!topic) {
      alert('Please enter a topic');
      return;
    }

    // Show loading state
    this.setButtonLoading(analyzeBtn, true, 'Analyzing... 🔍');
    this.hideError();

    try {
      const response = await fetch(`${this.apiUrl}/api/analyze-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: context || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysis: IntentionAnalysis = await response.json();
      this.currentAnalysis = analysis;
      
      // Check if should fallback to original
      if (analysis.fallbackToOriginal) {
        await this.generateOriginalThread();
        return;
      }
      
      this.displayIntentionAnalysis(analysis);
      this.showStep(2);
      
    } catch (error) {
      console.error('Error analyzing topic:', error);
      this.showError(`Failed to analyze topic: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to original flow.`);
      // Fallback to original flow
      setTimeout(() => {
        this.generateOriginalThread();
      }, 2000);
    } finally {
      this.setButtonLoading(analyzeBtn, false, 'Analyze Topic 🔍');
    }
  }

  private displayIntentionAnalysis(analysis: IntentionAnalysis) {
    const intentionText = document.getElementById('intentionText');
    const nonDatabaseWarning = document.getElementById('nonDatabaseWarning');
    
    if (intentionText) {
      intentionText.textContent = analysis.intention;
    }
    
    // Show warning if not a database topic
    if (!analysis.isDatabaseTopic && nonDatabaseWarning) {
      nonDatabaseWarning.classList.remove('hidden');
    } else if (nonDatabaseWarning) {
      nonDatabaseWarning.classList.add('hidden');
    }
    
    // Pre-fill suggested context if available
    if (analysis.suggestedContext) {
      const refinedIntention = document.getElementById('refinedIntention') as HTMLTextAreaElement;
      if (refinedIntention) {
        refinedIntention.placeholder = `Suggestion: ${analysis.suggestedContext}`;
      }
    }
  }

  private async generateEnhancedThread() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;
    const refinedIntentionInput = document.getElementById('refinedIntention') as HTMLTextAreaElement;
    const generateBtn = document.getElementById('generateWithContextBtn') as HTMLButtonElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();
    const refinedIntention = refinedIntentionInput.value.trim();

    // Show loading state
    this.setButtonLoading(generateBtn, true, 'Generating... ⚡');
    this.hideError();

    try {
      const response = await fetch(`${this.apiUrl}/api/generate-with-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: context || undefined,
          refinedIntention: refinedIntention || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { thread: ThreadResponse } = await response.json();
      this.currentThread = data.thread.tweets;
      this.displayThread(data.thread);
      this.showStep(3);
      
    } catch (error) {
      console.error('Error generating enhanced thread:', error);
      this.showError(`Failed to generate enhanced thread: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use the original flow.`);
    } finally {
      this.setButtonLoading(generateBtn, false, 'Generate Enhanced Thread 🚀');
    }
  }

  private async generateOriginalThread() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();

    if (!topic) {
      alert('Please enter a topic');
      return;
    }

    // Show loading state
    this.hideError();

    try {
      const response = await fetch(`${this.apiUrl}/api/generate-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: context || undefined,
          tone: 'professional'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { thread: ThreadResponse } = await response.json();
      this.currentThread = data.thread.tweets;
      this.displayThread(data.thread);
      this.showStep(3);
      
    } catch (error) {
      console.error('Error generating thread:', error);
      this.showError(`Failed to generate thread: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the backend server is running and Ollama is available.`);
    }
  }

  private setButtonLoading(button: HTMLButtonElement, loading: boolean, loadingText?: string, originalText?: string) {
    if (loading) {
      button.disabled = true;
      if (loadingText) button.textContent = loadingText;
      button.classList.add('opacity-50');
    } else {
      button.disabled = false;
      if (originalText) button.textContent = originalText;
      button.classList.remove('opacity-50');
    }
  }

  private startOver() {
    // Reset form
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;
    const refinedIntentionInput = document.getElementById('refinedIntention') as HTMLTextAreaElement;
    
    topicInput.value = '';
    contextInput.value = '';
    refinedIntentionInput.value = '';
    
    // Reset state
    this.currentThread = [];
    this.currentAnalysis = null;
    this.hideError();
    
    // Go back to step 1
    this.showStep(1);
  }

  private displayThread(threadData: ThreadResponse) {
    console.log('displayThread called with:', threadData);
    const resultsDiv = document.getElementById('threadResults') as HTMLDivElement;
    const tweetsContainer = document.getElementById('tweetsContainer') as HTMLDivElement;

    if (!resultsDiv || !tweetsContainer) {
      console.error('Could not find results div or tweets container');
      return;
    }

    // Clear previous results
    tweetsContainer.innerHTML = '';

    // Create tweet cards
    console.log('Creating tweet cards for', threadData.tweets.length, 'tweets');
    threadData.tweets.forEach((tweet, index) => {
      console.log('Creating card for tweet:', tweet);
      const tweetCard = this.createTweetCard(tweet, index);
      tweetsContainer.appendChild(tweetCard);
    });

    console.log('Thread display completed');
  }

  private createTweetCard(tweet: Tweet, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'tweet-card';
    
    // Create the structure without innerHTML to avoid escaping issues
    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-medium">${tweet.position}</span>
          </div>
          <span class="text-sm text-gray-500">Tweet ${tweet.position} of ${tweet.totalTweets}</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="char-counter text-sm ${this.getCharCounterClass(tweet.characterCount)}">${tweet.characterCount}/280</span>
          <button class="copy-btn p-1 text-gray-500 hover:text-blue-600 transition-colors" data-tweet-id="${tweet.id}">
            📋
          </button>
        </div>
      </div>
      
      <div class="tweet-content relative">
        <textarea 
          class="tweet-textarea w-full p-3 pr-12 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          rows="3"
          data-tweet-id="${tweet.id}"
        ></textarea>
        <button 
          class="copy-textarea-btn absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 group"
          data-tweet-id="${tweet.id}"
          title="Copy tweet"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          <span class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Copy tweet
          </span>
        </button>
      </div>
      
      <div class="mt-3 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-sm text-gray-500">
          <span>💬 Thread</span>
          <span>🔄 Retweet</span>
          <span>❤️ Like</span>
        </div>
        <button class="regenerate-btn text-sm text-blue-600 hover:text-blue-700 font-medium" data-tweet-id="${tweet.id}">
          🔄 Regenerate
        </button>
      </div>
    `;
    
    // Set textarea content safely
    const textarea = card.querySelector('.tweet-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = tweet.content;
    }

    // Add event listeners
    const copyBtn = card.querySelector('.copy-btn') as HTMLButtonElement;
    const copyTextareaBtn = card.querySelector('.copy-textarea-btn') as HTMLButtonElement;
    const regenerateBtn = card.querySelector('.regenerate-btn') as HTMLButtonElement;

    textarea.addEventListener('input', () => {
      this.updateCharacterCount(textarea, tweet.id);
    });

    // Add keyboard shortcut for copying (Ctrl+C / Cmd+C)
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && textarea.selectionStart === textarea.selectionEnd) {
        // Only trigger custom copy if no text is selected (otherwise use native copy)
        e.preventDefault();
        this.copyTweetWithFeedback(tweet.id, copyTextareaBtn);
      }
    });

    // Copy button in header
    copyBtn.addEventListener('click', () => {
      this.copyTweetWithFeedback(tweet.id, copyBtn);
    });

    // Copy button on textarea
    copyTextareaBtn.addEventListener('click', () => {
      this.copyTweetWithFeedback(tweet.id, copyTextareaBtn);
    });

    regenerateBtn.addEventListener('click', () => {
      this.regenerateTweet(tweet.id, index);
    });

    return card;
  }

  private getCharCounterClass(count: number): string {
    if (count > 280) return 'over-limit';
    if (count > 260) return 'danger';
    if (count > 240) return 'warning';
    return 'text-gray-500';
  }

  private updateCharacterCount(textarea: HTMLTextAreaElement, tweetId: string) {
    const count = textarea.value.length;
    const card = textarea.closest('.tweet-card');
    const counter = card?.querySelector('.char-counter');
    
    if (counter) {
      counter.textContent = `${count}/280`;
      counter.className = `char-counter text-sm ${this.getCharCounterClass(count)}`;
    }

    // Update the current thread data
    const tweetIndex = this.currentThread.findIndex(t => t.id === tweetId);
    if (tweetIndex !== -1) {
      this.currentThread[tweetIndex].content = textarea.value;
      this.currentThread[tweetIndex].characterCount = count;
    }
  }

  private async copyTweetWithFeedback(tweetId: string, button: HTMLButtonElement) {
    const tweet = this.currentThread.find(t => t.id === tweetId);
    if (!tweet) return;

    const originalHTML = button.innerHTML;
    const originalTitle = button.title;

    try {
      await navigator.clipboard.writeText(tweet.content);
      
      // Show success feedback on button
      button.innerHTML = `
        <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;
      button.title = 'Copied!';
      button.classList.add('text-green-600', 'bg-green-50');

      // Show toast notification
      this.showToast(`Tweet ${tweet.position} copied! 📋`, 'success');

      // Reset button after 2 seconds
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.title = originalTitle;
        button.classList.remove('text-green-600', 'bg-green-50');
      }, 2000);

    } catch (error) {
      console.error('Failed to copy tweet:', error);
      
      // Show error feedback
      button.innerHTML = `
        <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
      button.title = 'Copy failed';
      button.classList.add('text-red-600', 'bg-red-50');

      this.showToast('Failed to copy tweet', 'error');

      // Reset button after 2 seconds
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.title = originalTitle;
        button.classList.remove('text-red-600', 'bg-red-50');
      }, 2000);
    }
  }

  private async copyAllTweets() {
    const copyAllBtn = document.getElementById('copyAllBtn') as HTMLButtonElement;
    const originalText = copyAllBtn.textContent;
    
    const allTweets = this.currentThread.map(tweet => tweet.content).join('\n\n');
    
    try {
      // Show loading state
      copyAllBtn.textContent = '⏳ Copying...';
      copyAllBtn.disabled = true;
      
      await navigator.clipboard.writeText(allTweets);
      
      // Show success state
      copyAllBtn.textContent = '✅ Copied!';
      copyAllBtn.classList.add('bg-green-100', 'text-green-700');
      
      this.showToast(`All ${this.currentThread.length} tweets copied to clipboard! 📋`, 'success');
      
      // Reset button after 2 seconds
      setTimeout(() => {
        copyAllBtn.textContent = originalText;
        copyAllBtn.disabled = false;
        copyAllBtn.classList.remove('bg-green-100', 'text-green-700');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy tweets:', error);
      
      // Show error state
      copyAllBtn.textContent = '❌ Failed';
      copyAllBtn.classList.add('bg-red-100', 'text-red-700');
      
      this.showToast('Failed to copy tweets', 'error');
      
      // Reset button after 2 seconds
      setTimeout(() => {
        copyAllBtn.textContent = originalText;
        copyAllBtn.disabled = false;
        copyAllBtn.classList.remove('bg-red-100', 'text-red-700');
      }, 2000);
    }
  }

  private async regenerateTweet(tweetId: string, index: number) {
    // This would call the backend to regenerate a specific tweet
    // For now, we'll implement this as a placeholder
    this.showToast('Tweet regeneration coming soon! 🔄');
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Create a toast notification with different types
    const toast = document.createElement('div');
    
    const typeClasses = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-blue-600 text-white'
    };
    
    toast.className = `fixed top-4 right-4 ${typeClasses[type]} px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 opacity-100`;
    
    // Add icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${icons[type]}</span>
        <span>${message}</span>
      </div>
    `;
    
    // Initial animation state
    toast.style.transform = 'translateY(-100%)';
    toast.style.opacity = '0';
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
    
    // Auto dismiss
    setTimeout(() => {
      toast.style.transform = 'translateY(-100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  private showError(message: string) {
    const errorDiv = document.getElementById('errorState') as HTMLDivElement;
    const errorMessage = document.getElementById('errorMessage') as HTMLParagraphElement;
    
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  private hideError() {
    const errorDiv = document.getElementById('errorState') as HTMLDivElement;
    errorDiv.classList.add('hidden');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new ThreadGenerator();
}); 