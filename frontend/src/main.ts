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

class ThreadGenerator {
  private apiUrl = 'http://localhost:3001';
  private currentThread: Tweet[] = [];

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    const form = document.getElementById('threadForm') as HTMLFormElement;
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    const copyAllBtn = document.getElementById('copyAllBtn') as HTMLButtonElement;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.generateThread();
    });

    copyAllBtn.addEventListener('click', () => {
      this.copyAllTweets();
    });
  }

  private async generateThread() {
    const topicInput = document.getElementById('topic') as HTMLInputElement;
    const contextInput = document.getElementById('context') as HTMLTextAreaElement;
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;

    const topic = topicInput.value.trim();
    const context = contextInput.value.trim();

    if (!topic) {
      alert('Please enter a topic');
      return;
    }

    // Show loading state
    this.setLoadingState(true);
    this.hideResults();
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
      console.log('API Response:', data);
      console.log('Thread tweets:', data.thread.tweets);
      this.currentThread = data.thread.tweets;
      this.displayThread(data.thread);
    } catch (error) {
      console.error('Error generating thread:', error);
      this.showError(`Failed to generate thread: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the backend server is running and Ollama is available.`);
    } finally {
      this.setLoadingState(false);
    }
  }

  private setLoadingState(loading: boolean) {
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    
    if (loading) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating... ⚡';
      generateBtn.classList.add('opacity-50');
    } else {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Thread 🚀';
      generateBtn.classList.remove('opacity-50');
    }
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

    // Show results
    resultsDiv.classList.remove('hidden');
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
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

  private async copyTweet(tweetId: string) {
    const tweet = this.currentThread.find(t => t.id === tweetId);
    if (!tweet) return;

    try {
      await navigator.clipboard.writeText(tweet.content);
      this.showToast('Tweet copied to clipboard! 📋');
    } catch (error) {
      console.error('Failed to copy tweet:', error);
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

  private hideResults() {
    const resultsDiv = document.getElementById('threadResults') as HTMLDivElement;
    resultsDiv.classList.add('hidden');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new ThreadGenerator();
}); 