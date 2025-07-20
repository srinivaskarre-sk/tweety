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

export interface IntentionAnalysis {
  intention: string;
  isDatabaseTopic: boolean;
  suggestedContext?: string;
  fallbackToOriginal?: boolean;
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
      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing database and SQL topics. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      });

      const jsonResponse = response.message.content.trim();
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
    const enhancedContext = this.buildEnhancedContext(topic, context, refinedIntention);
    const prompt = this.buildEnhancedPrompt(topic, enhancedContext);
    
    try {
      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical content creator specializing in database systems, SQL, and data engineering. Generate engaging Twitter threads with practical examples, code snippets, and actionable insights for database professionals.'
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
      console.error('Enhanced thread generation error:', error);
      throw new Error('Failed to generate enhanced thread. Please ensure Ollama is running with llama3.2 model.');
    }
  }

  private buildEnhancedContext(topic: string, context?: string, refinedIntention?: string): string {
    let enhancedContext = '';
    
    if (refinedIntention) {
      enhancedContext += `User's refined intention: ${refinedIntention}\n`;
    }
    
    if (context) {
      enhancedContext += `Additional context: ${context}\n`;
    }
    
    enhancedContext += `Focus: Database systems, SQL queries, performance optimization, data modeling, and practical implementation examples.`;
    
    return enhancedContext;
  }

  private buildEnhancedPrompt(topic: string, enhancedContext: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    return `Create a comprehensive Twitter thread about "${cleanTopic}" specifically for database professionals and developers.

ENHANCED CONTEXT:
${enhancedContext}

STRICT REQUIREMENTS:
- Generate exactly 6 tweets for database/SQL professionals
- Each tweet MUST be under 280 characters
- Include practical SQL examples, database concepts, and real-world scenarios
- Use engaging emojis (🔥, ⚡, 💡, 🧵, 📊, 🔧, 🔒, 💾, ⚖️, 🎯, 📈)
- Focus on actionable insights and practical implementation
- Target audience: Database administrators, developers, data engineers
- Number each tweet (1/6, 2/6, etc.)

CONTENT FOCUS:
- Database performance and optimization
- SQL best practices and techniques
- Data modeling and schema design
- Security and compliance considerations
- Real-world implementation examples
- Common pitfalls and solutions

FORMAT REQUIREMENTS:
- Start each tweet with "TWEET:"
- NO markdown formatting (**, *, etc.)
- Each tweet on a single line
- Include practical code examples where relevant
- Balance technical depth with accessibility

Example structure for database isolation levels:
TWEET: 1/6 🧵 Database isolation levels explained: Your secret weapon against data corruption in high-concurrency apps ⚡ Let's explore READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, and SERIALIZABLE 🔒
TWEET: 2/6 💡 READ UNCOMMITTED (Level 0): Fastest but dangerous! ⚠️ Allows dirty reads - you can see uncommitted changes. Perfect for analytics where speed > accuracy. Example: SELECT * FROM orders WHERE status = 'processing';

Generate exactly 6 tweets for "${cleanTopic}". Each tweet must start with "TWEET:" and be on its own line:`;
  }
} 