import { LLMServiceFactory, LLMService } from './llmService';
import { WebSearchService, SearchResult } from './webSearch';

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

export interface IntentionAnalysis {
  intention: string;
  isDatabaseTopic: boolean;
  suggestedContext?: string;
  fallbackToOriginal?: boolean;
}

export class ThreadGenerator {
  private llmService: LLMService;
  private webSearchService: WebSearchService;

  constructor() {
    this.llmService = LLMServiceFactory.createLLMService();
    this.webSearchService = new WebSearchService();
    
    console.log(`ThreadGenerator initialized with ${this.llmService.getProviderName()}`);
  }

  async generateThread(topic: string, context?: string, tone?: string): Promise<ThreadResponse> {
    const prompt = this.buildPrompt(topic, context, tone);
    
    try {
      const response = await this.llmService.chat([
        {
          role: 'system',
          content: 'You are an expert technical content creator for B2B SaaS and database professionals. Generate engaging Twitter threads with code examples, emojis, and practical insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const threadContent = response.content;
      const tweets = this.parseThreadContent(threadContent, topic);
      
      return {
        tweets,
        topic,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('LLM generation error:', error);
      throw new Error('Failed to generate thread. Please ensure LLM service is running.');
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
        
        // Enhanced cleaning for markdown and formatting issues
        tweetContent = tweetContent
          .replace(/\*\*/g, '') // Remove markdown bold
          .replace(/\*/g, '') // Remove markdown italic
          .replace(/`/g, '') // Remove code formatting
          .replace(/\n\n\*\*TWEET:.*$/g, '') // Remove trailing TWEET markers
          .replace(/\n+/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        // Validate tweet content
        if (tweetContent && tweetContent.length > 10 && tweetContent.length <= 320) {
          tweets.push({
            id: `tweet-${tweetCounter}`,
            content: tweetContent,
            characterCount: tweetContent.length,
            position: tweetCounter,
            totalTweets: 0 // Will be updated after parsing all tweets
          });
          tweetCounter++;
          
          // Stop after 6 tweets
          if (tweetCounter > 6) break;
        }
      }
    }

    // Enhanced fallback parsing if no tweets found with TWEET: prefix
    if (tweets.length === 0) {
      console.log('No tweets found with TWEET: prefix, trying alternative parsing...');
      
      // Try to split by numbers like "1/6", "2/6", etc.
      const tweetPattern = /(\d+\/\d+.*?)(?=\d+\/\d+|$)/gs;
      const matches = content.match(tweetPattern);
      
      if (matches && matches.length > 0) {
        matches.forEach((match, index) => {
          if (index < 6) { // Limit to 6 tweets
            let cleanMatch = match.trim()
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/`/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanMatch.length > 10 && cleanMatch.length <= 320) {
              tweets.push({
                id: `tweet-${index + 1}`,
                content: cleanMatch,
                characterCount: cleanMatch.length,
                position: index + 1,
                totalTweets: 0
              });
            }
          }
        });
      }
    }

    // Final fallback - split by common patterns
    if (tweets.length === 0) {
      console.log('Alternative parsing failed, using pattern-based splitting...');
      const patterns = [/\d+\/6/g, /Tweet \d+:/gi, /\d+\./g];
      
      for (const pattern of patterns) {
        const parts = content.split(pattern);
        if (parts.length > 1) {
          for (let i = 1; i < Math.min(parts.length, 7); i++) {
            const part = parts[i].trim()
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/`/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (part.length > 10 && part.length <= 320) {
              tweets.push({
                id: `tweet-${i}`,
                content: `${i}/6 ${part}`,
                characterCount: `${i}/6 ${part}`.length,
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
    const finalTweetCount = Math.max(tweets.length, 1);
    tweets.forEach(tweet => {
      tweet.totalTweets = finalTweetCount;
    });

    // Ultimate fallback with actual content generation
    if (tweets.length === 0) {
      console.log('All parsing failed, creating fallback tweet');
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

    console.log(`Successfully parsed ${tweets.length} tweets`);
    tweets.forEach((tweet, index) => {
      console.log(`Tweet ${index + 1}: "${tweet.content.substring(0, 50)}..."`);
    });
    
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
      const response = await this.llmService.chat([
        {
          role: 'user',
          content: prompt
        }
      ]);

      const newContent = response.content.trim();
      
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

  // Analyze user's topic intention for database/SQL content
  async analyzeTopicIntention(topic: string, context?: string): Promise<IntentionAnalysis> {
    const prompt = `Analyze this user input to understand their intention for creating a database/SQL-focused Twitter thread:

User Topic: "${topic}"
${context ? `Additional Context: "${context}"` : ''}

REQUIREMENTS:
1. Determine if this is a database/SQL-related topic
2. Create a simple, conversational summary of what the user wants to explain
3. Focus on database systems, SQL queries, data modeling, performance, or related concepts

RESPONSE FORMAT (JSON):
{
  "intention": "Simple text summary like: 'You want to explain database isolation levels with practical SQL examples and real-world scenarios'",
  "isDatabaseTopic": true/false,
  "suggestedContext": "Optional suggestion for missing context",
  "fallbackToOriginal": false
}

If NOT database-related, set isDatabaseTopic to false and fallbackToOriginal to true.

Examples:
- "What are database isolation levels" → "You want to explain the four database isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE) with practical examples"
- "SQL query optimization" → "You want to share SQL query optimization techniques and performance improvement strategies"
- "React components" → Set isDatabaseTopic: false, fallbackToOriginal: true

Respond with valid JSON only:`;

    try {
      const response = await this.llmService.chat([
        {
          role: 'system',
          content: 'You are an expert at analyzing database and SQL topics. Always respond with valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const jsonResponse = response.content.trim();
      console.log('Raw intention analysis response:', jsonResponse);
      
      // Try to parse JSON response
      try {
        const analysis = JSON.parse(jsonResponse);
        return {
          intention: analysis.intention || 'Database-related content creation',
          isDatabaseTopic: analysis.isDatabaseTopic !== false,
          suggestedContext: analysis.suggestedContext,
          fallbackToOriginal: analysis.fallbackToOriginal === true
        };
      } catch (parseError) {
        console.error('Failed to parse intention analysis JSON:', parseError);
        // Fallback to original flow
        return {
          intention: 'Database-related content creation',
          isDatabaseTopic: true,
          fallbackToOriginal: true
        };
      }
    } catch (error) {
      console.error('Intention analysis error:', error);
      // Graceful fallback
      return {
        intention: 'Database-related content creation',
        isDatabaseTopic: true,
        fallbackToOriginal: true
      };
    }
  }

  // Generate thread with enhanced context from intention analysis
  async generateThreadWithContext(topic: string, context?: string, refinedIntention?: string): Promise<ThreadResponse> {
    try {
      // Perform web search for additional context
      console.log('Performing web search for topic:', topic);
      const searchResults = await this.webSearchService.searchWeb(topic, refinedIntention);
      
      const enhancedContext = this.buildEnhancedContext(topic, context, refinedIntention, searchResults);
      const prompt = this.buildEnhancedPrompt(topic, enhancedContext);
      
      console.log('=== ENHANCED PROMPT ===');
      console.log(prompt.substring(0, 500) + '...');
      console.log('=======================');
      
      const response = await this.llmService.chat([
        {
          role: 'system',
          content: 'You are an expert technical content creator specializing in database systems, SQL, and data engineering. You MUST generate exactly 6 tweets, each starting with "TWEET:" and numbered 1/6, 2/6, etc. Follow the format requirements precisely.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const threadContent = response.content;
      console.log('=== RAW LLM RESPONSE ===');
      console.log(threadContent);
      console.log('========================');
      
      const tweets = this.parseThreadContent(threadContent, topic);
      
      if (tweets.length < 6) {
        console.warn(`Only parsed ${tweets.length} tweets instead of 6. Attempting to fix...`);
      }
      
      return {
        tweets,
        topic,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Enhanced thread generation error:', error);
      throw new Error('Failed to generate enhanced thread. Please ensure LLM service is running.');
    }
  }

  private buildEnhancedContext(topic: string, context?: string, refinedIntention?: string, searchResults?: SearchResult[]): string {
    let enhancedContext = '';
    
    if (refinedIntention) {
      enhancedContext += `User's refined intention: ${refinedIntention}\n`;
    }
    
    if (context) {
      enhancedContext += `Additional context: ${context}\n`;
    }
    
    // Add search results context
    if (searchResults && searchResults.length > 0) {
      enhancedContext += `\nCurrent web research findings:\n`;
      searchResults.forEach((result, index) => {
        enhancedContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
      });
      enhancedContext += '\n';
    }
    
    enhancedContext += `Focus: Database systems, SQL queries, performance optimization, data modeling, and practical implementation examples with current best practices.`;
    
    return enhancedContext;
  }

  private buildEnhancedPrompt(topic: string, enhancedContext: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    return `Create a comprehensive Twitter thread about "${cleanTopic}" specifically for database professionals and developers.

ENHANCED CONTEXT:
${enhancedContext}

CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY:
1. Generate EXACTLY 6 tweets, no more, no less
2. Each tweet MUST start with "TWEET:" (all caps)
3. Each tweet MUST be numbered 1/6, 2/6, 3/6, 4/6, 5/6, 6/6
4. Each tweet MUST be under 280 characters
5. NO markdown formatting (no **, *, etc.)
6. Each tweet on its own line
7. Include practical SQL examples and current best practices

CONTENT REQUIREMENTS:
- Incorporate current web research findings and latest best practices from the context above
- Include practical SQL examples, database concepts, and real-world scenarios
- Use engaging emojis (🔥, ⚡, 💡, 🧵, 📊, 🔧, 🔒, 💾, ⚖️, 🎯, 📈)
- Focus on actionable insights and practical implementation
- Target audience: Database administrators, developers, data engineers
- Reference current trends and up-to-date information when available

EXACT FORMAT EXAMPLE:
TWEET: 1/6 🧵 Database isolation levels explained: Your secret weapon against data corruption in high-concurrency apps ⚡ Let's explore the latest approaches that industry experts recommend 🔒
TWEET: 2/6 💡 READ UNCOMMITTED: Fastest but dangerous! Allows dirty reads. Recent studies show 40% performance boost but high risk. Use only for analytics: SELECT * FROM orders WHERE status = 'pending';
TWEET: 3/6 ✅ READ COMMITTED: Default for most databases. Prevents dirty reads, allows phantom reads. Good balance for OLTP systems. PostgreSQL and MySQL default. Perfect for e-commerce applications 📊
TWEET: 4/6 🔒 REPEATABLE READ: Locks read data until transaction ends. Prevents dirty and non-repeatable reads. Higher consistency but potential deadlocks. Example: START TRANSACTION; SELECT * FROM accounts WHERE id = 1;
TWEET: 5/6 🎯 SERIALIZABLE: Highest isolation level. Complete transaction isolation. Slowest performance but ACID compliant. Use for financial systems: SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
TWEET: 6/6 🚀 Best practices 2024: Use READ COMMITTED for most apps, SERIALIZABLE for critical data, monitor lock contention with pg_stat_activity. Choose based on consistency vs performance needs 📈 #DatabasePerformance

Now generate exactly 6 tweets for "${cleanTopic}" following this EXACT format:`;
  }
} 