import { Ollama } from 'ollama';

export interface Tweet {
  id: string;
  content: string;
  characterCount: number;
  position: number;
  totalTweets: number;
}

export interface ThreadResponse {
  tweets: Tweet[];
  topic: string;
  generatedAt: string;
}

export class ThreadGenerator {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({
      host: 'http://localhost:11434'
    });
  }

  async generateThread(topic: string, context?: string, tone?: string): Promise<ThreadResponse> {
    const prompt = this.buildPrompt(topic, context, tone);
    
    try {
      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical content creator for B2B SaaS and database professionals. Generate engaging Twitter threads with code examples, emojis, and practical insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      });

      const threadContent = response.message.content;
      const tweets = this.parseThreadContent(threadContent, topic);
      
      return {
        tweets,
        topic,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw new Error('Failed to generate thread. Please ensure Ollama is running with llama3.2 model.');
    }
  }

  private buildPrompt(topic: string, context?: string, tone?: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    const basePrompt = `Create a Twitter thread about "${cleanTopic}" for B2B SaaS entrepreneurs and technical professionals.

STRICT REQUIREMENTS:
- Generate exactly 6 tweets
- Each tweet MUST be under 280 characters
- Include relevant code examples and SQL snippets where applicable
- Use engaging emojis (🔥, ⚡, 💡, 🧵, 📊, 🔧, 🔒, 💾, ⚖️)
- Focus on practical, actionable insights
- Target database professionals and developers building authority
- Include technical depth with business value
- Number each tweet (1/6, 2/6, etc.)

${context ? `Additional context: ${context}` : ''}

${tone ? `Tone: ${tone}` : 'Tone: Professional but approachable, educational, with authority-building insights'}

FORMAT REQUIREMENTS:
- Start each tweet with "TWEET:"
- NO markdown formatting (**, *, etc.)
- Each tweet on a single line
- Make each tweet standalone but part of the thread
- Include practical examples, code snippets, or real-world scenarios
- End with actionable advice

Example for database isolation levels:
TWEET: 1/6 🧵 Database isolation levels explained: The secret to preventing data corruption in high-concurrency applications ⚡ Let's dive into READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, and SERIALIZABLE 🔒
TWEET: 2/6 💡 READ UNCOMMITTED: Fastest but dangerous! ⚠️ Allows dirty reads where you can see uncommitted changes from other transactions. Use only for analytics where accuracy isn't critical. Example: SELECT * FROM orders WHERE status = 'pending';
TWEET: 3/6 ✅ READ COMMITTED: Default for most databases. Prevents dirty reads but allows phantom reads. Good balance of performance and consistency for most applications.

Generate exactly 6 tweets for "${cleanTopic}". Each tweet must start with "TWEET:" and be on its own line:`;

    return basePrompt;
  }

  private parseThreadContent(content: string, topic: string): Tweet[] {
    console.log('Raw AI response:', content);
    
    const lines = content.split('\n');
    const tweets: Tweet[] = [];
    let tweetCounter = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for lines starting with TWEET: or containing numbered tweets
      if (trimmedLine.startsWith('TWEET:') || 
          /^\d+\/\d+/.test(trimmedLine) || 
          trimmedLine.match(/^(\d+\.\s|\d+\/\d+)/)) {
        
        let tweetContent = '';
        
        if (trimmedLine.startsWith('TWEET:')) {
          tweetContent = trimmedLine.replace('TWEET:', '').trim();
        } else {
          tweetContent = trimmedLine;
        }
        
        // Clean up the content by removing markdown and extra formatting
        tweetContent = tweetContent
          .replace(/\*\*/g, '') // Remove markdown bold
          .replace(/\n\n\*\*TWEET:.*$/g, '') // Remove trailing TWEET markers
          .replace(/\n+/g, ' ') // Replace newlines with spaces
          .trim();
        
        if (tweetContent && tweetContent.length > 10 && tweetContent.length <= 280) {
          tweets.push({
            id: `tweet-${tweetCounter}`,
            content: tweetContent,
            characterCount: tweetContent.length,
            position: tweetCounter,
            totalTweets: 0 // Will be updated after parsing all tweets
          });
          tweetCounter++;
        }
      }
    }

    // If still no tweets found, try splitting by common patterns
    if (tweets.length === 0) {
      const patterns = [/\d+\/\d+/g, /Tweet \d+:/gi, /\d+\./g];
      
      for (const pattern of patterns) {
        const matches = content.split(pattern);
        if (matches.length > 1) {
          for (let i = 1; i < matches.length && i <= 6; i++) {
            const match = matches[i].trim();
            if (match.length > 10 && match.length <= 280) {
              tweets.push({
                id: `tweet-${i}`,
                content: `${i}/6 ${match}`,
                characterCount: `${i}/6 ${match}`.length,
                position: i,
                totalTweets: 0
              });
            }
          }
          if (tweets.length > 0) break;
        }
      }
    }

    // Update totalTweets for all tweets
    tweets.forEach(tweet => {
      tweet.totalTweets = tweets.length;
    });

    // Enhanced fallback with actual content generation
    if (tweets.length === 0) {
      const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
      tweets.push({
        id: 'tweet-1',
        content: `1/1 🧵 ${cleanTopic} - Essential concepts every developer should master! 🚀 More detailed thread coming soon...`,
        characterCount: 0,
        position: 1,
        totalTweets: 1
      });
      tweets[0].characterCount = tweets[0].content.length;
    }

    console.log('Parsed tweets:', tweets.length);
    return tweets;
  }

  // Regenerate a specific tweet
  async regenerateTweet(tweetId: string, originalContent: string, context: string): Promise<Tweet> {
    const prompt = `Rewrite this tweet to be more engaging while keeping the same core message:

Original: "${originalContent}"
Context: ${context}

Requirements:
- Keep under 280 characters
- Include relevant emojis
- Maintain technical accuracy
- Make it more engaging or clear

Return only the improved tweet content:`;

    try {
      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      });

      const newContent = response.message.content.trim();
      
      return {
        id: tweetId,
        content: newContent,
        characterCount: newContent.length,
        position: parseInt(tweetId.split('-')[1]) || 1,
        totalTweets: 0 // Will be set by caller
      };
    } catch (error) {
      console.error('Tweet regeneration error:', error);
      throw new Error('Failed to regenerate tweet');
    }
  }
} 