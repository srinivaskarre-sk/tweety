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

interface TechnicalDomain {
  id: string;
  name: string;
  description: string;
  expertPersona: string;
  searchTerms: string[];
  authorityKeywords: string[];
}

interface IntentionAnalysis {
  intention: string;
  isTechnicalTopic: boolean;
  domain?: TechnicalDomain;
  suggestedHook?: string;
  expertiseLevel?: 'beginner' | 'intermediate' | 'expert';
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

  private async checkBackendHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed with status: ${response.status}`);
      }
      console.log('Backend is healthy');
    } catch (error) {
      console.error('Backend health check failed:', error);
      this.showError('Backend server is not responding. Please ensure it is running on port 3001.');
    }
  }

  private initializeEventListeners() {
    // Step 1: Topic input form
    const form = document.getElementById('threadForm') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.analyzeTopic();
    });

    // Topic input - show/hide skip button based on content
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const skipBtn = document.getElementById('skipToOriginalBtn') as HTMLButtonElement;
    
    topicInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value.length > 0) {
        skipBtn.classList.remove('hidden');
      } else {
        skipBtn.classList.add('hidden');
      }
    });

    // Tweet count slider
    const tweetCountSlider = document.getElementById('tweetCount') as HTMLInputElement;
    const tweetCountDisplay = document.getElementById('tweetCountDisplay') as HTMLSpanElement;
    
    tweetCountSlider.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      tweetCountDisplay.textContent = value;
    });

    // Skip to original flow
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
        // Check topic input and show/hide skip button accordingly
        const topicInput = document.getElementById('topic') as HTMLInputElement;
        const skipBtn = document.getElementById('skipToOriginalBtn') as HTMLButtonElement;
        if (topicInput && skipBtn) {
          if (topicInput.value.trim().length > 0) {
            skipBtn.classList.remove('hidden');
          } else {
            skipBtn.classList.add('hidden');
          }
        }
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
    // Display domain information
    const domainText = document.getElementById('domainText');
    const expertiseText = document.getElementById('expertiseText');
    
    if (domainText && analysis.domain) {
      domainText.textContent = analysis.domain.name;
    }
    
    if (expertiseText && analysis.expertiseLevel) {
      const expertiseLabels = {
        'beginner': 'Beginner-friendly content',
        'intermediate': 'Intermediate-level insights',
        'expert': 'Expert-level deep dive'
      };
      expertiseText.textContent = expertiseLabels[analysis.expertiseLevel];
    }
    
    // Display intention
    const intentionText = document.getElementById('intentionText');
    if (intentionText) {
      intentionText.textContent = analysis.intention;
    }
    
    // Display hook strategy
    const hookText = document.getElementById('hookText');
    if (hookText && analysis.suggestedHook) {
      hookText.textContent = analysis.suggestedHook;
    }
    
    // Show warning if not a technical topic
    const nonTechnicalWarning = document.getElementById('nonTechnicalWarning');
    if (!analysis.isTechnicalTopic && nonTechnicalWarning) {
      nonTechnicalWarning.classList.remove('hidden');
    } else if (nonTechnicalWarning) {
      nonTechnicalWarning.classList.add('hidden');
    }
    
    // Pre-fill suggested refinement if available
    if (analysis.suggestedHook) {
      const refinedIntention = document.getElementById('refinedIntention') as HTMLTextAreaElement;
      if (refinedIntention) {
        refinedIntention.placeholder = `You can refine the focus, add specific examples, or adjust the authority angle...`;
      }
    }
  }

  private getTweetCount(): number {
    const tweetCountSlider = document.getElementById('tweetCount') as HTMLInputElement;
    return parseInt(tweetCountSlider.value) || 6;
  }

  private async generateEnhancedThread() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;
    const refinedIntentionInput = document.getElementById('refinedIntention') as HTMLTextAreaElement;
    const generateBtn = document.getElementById('generateWithContextBtn') as HTMLButtonElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();
    const refinedIntention = refinedIntentionInput.value.trim();
    const tweetCount = this.getTweetCount();

    // Show enhanced loading state with web search indication
    this.setButtonLoading(generateBtn, true, 'Researching latest info... 🔍');
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
          refinedIntention: refinedIntention || undefined,
          tweetCount
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update loading text to show thread generation phase
      this.setButtonLoading(generateBtn, true, 'Generating enhanced thread... ⚡');

      const data: { thread: ThreadResponse } = await response.json();
      this.currentThread = data.thread.tweets;
      this.displayThread(data.thread);
      this.showStep(3);
      
    } catch (error) {
      console.error('Error generating enhanced thread:', error);
      this.showError(`Failed to generate enhanced thread: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or use the original flow.`);
    } finally {
      this.setButtonLoading(generateBtn, false, 'Generate Authority Thread 🚀');
    }
  }

  private async generateOriginalThread() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();
    const tweetCount = this.getTweetCount();

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
          tone: 'professional',
          tweetCount
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
    const tweetCountSlider = document.getElementById('tweetCount') as HTMLInputElement;
    const tweetCountDisplay = document.getElementById('tweetCountDisplay') as HTMLSpanElement;
    const skipBtn = document.getElementById('skipToOriginalBtn') as HTMLButtonElement;
    
    topicInput.value = '';
    contextInput.value = '';
    refinedIntentionInput.value = '';
    tweetCountSlider.value = '6';
    tweetCountDisplay.textContent = '6';
    
    // Hide skip button since topic is cleared
    skipBtn.classList.add('hidden');
    
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
    const threadSubtitle = document.getElementById('threadSubtitle') as HTMLParagraphElement;

    if (!resultsDiv || !tweetsContainer) {
      console.error('Could not find results div or tweets container');
      return;
    }

    // Update subtitle with tweet count
    if (threadSubtitle) {
      const tweetCount = threadData.tweets.length;
      threadSubtitle.textContent = `✨ ${tweetCount} ${tweetCount === 1 ? 'tweet' : 'tweets'} optimized for professional credibility and expertise showcase`;
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
    card.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
    
    // Process tweet content for inline code
    const processedContent = this.processTextContent(tweet.content);
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-blue-600 font-medium">${index + 1}</span>
          </div>
          <div>
            <div class="font-medium text-gray-900">Tweet ${tweet.position}/${tweet.totalTweets}</div>
            <div class="text-sm text-gray-500">${tweet.characterCount} characters</div>
          </div>
        </div>
        <button 
          class="copy-tweet-btn px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          data-tweet-content="${tweet.content.replace(/"/g, '&quot;')}"
        >
          📋 Copy
        </button>
      </div>
      
      <div class="tweet-content text-gray-800 leading-relaxed">
        ${processedContent}
      </div>
    `;

    // Add copy functionality
    const copyBtn = card.querySelector('.copy-tweet-btn') as HTMLButtonElement;
    copyBtn.addEventListener('click', async () => {
      const originalText = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(tweet.content);
        copyBtn.textContent = '✅ Copied!';
        copyBtn.classList.add('bg-green-100', 'text-green-700');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('bg-green-100', 'text-green-700');
        }, 2000);
      } catch (error) {
        console.error('Failed to copy tweet:', error);
        copyBtn.textContent = '❌ Failed';
      }
    });

    return card;
  }

  private processTextContent(content: string): string {
    // Process inline code with backticks
    return content.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
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
    const tweetCount = this.currentThread.length;
    
    try {
      // Show loading state
      copyAllBtn.textContent = '⏳ Copying...';
      copyAllBtn.disabled = true;
      
      await navigator.clipboard.writeText(allTweets);
      
      // Show success state
      copyAllBtn.textContent = '✅ Copied!';
      copyAllBtn.classList.add('bg-green-100', 'text-green-700');
      
      this.showToast(`All ${tweetCount} ${tweetCount === 1 ? 'tweet' : 'tweets'} copied to clipboard! 📋`, 'success');
      
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