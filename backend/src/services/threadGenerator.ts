import { LLMServiceFactory, LLMService } from './llmService';
import { WebSearchService, SearchResult } from './webSearch';
import { DomainService, DomainAnalysis, TechnicalDomain } from './domainService';
import { ContentEnhancementService, ContentEnhancement } from './contentEnhancementService';

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
  isTechnicalTopic: boolean;
  domain?: TechnicalDomain;
  suggestedHook?: string;
  expertiseLevel?: 'beginner' | 'intermediate' | 'expert';
  fallbackToOriginal?: boolean;
}

export class ThreadGenerator {
  private llmService: LLMService;
  private webSearchService: WebSearchService;
  private domainService: DomainService;
  private contentEnhancementService: ContentEnhancementService;

  constructor() {
    this.llmService = LLMServiceFactory.createLLMService();
    this.webSearchService = new WebSearchService();
    this.domainService = new DomainService();
    this.contentEnhancementService = new ContentEnhancementService();
    
    console.log(`ThreadGenerator initialized with ${this.llmService.getProviderName()}`);
  }

  async generateThread(topic: string, context?: string, tone?: string, tweetCount: number = 6): Promise<ThreadResponse> {
    // Validate tweet count
    const validatedCount = this.validateTweetCount(tweetCount);
    const prompt = this.buildPrompt(topic, context, tone, validatedCount);
    
    try {
      const response = await this.llmService.chat([
        {
          role: 'system',
          content: 'You are an expert technical content creator for B2B SaaS and technical professionals. Generate engaging Twitter threads with code examples, emojis, and practical insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const threadContent = response.content;
      const tweets = this.parseThreadContent(threadContent, topic, validatedCount);
      
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

  private buildPrompt(topic: string, context?: string, tone?: string, tweetCount: number = 6): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    // Analyze content strategy for code enhancements
    const domain = this.domainService.detectDomain(topic, context);
    const enhancement = this.contentEnhancementService.analyzeContentStrategy(topic, domain.primaryDomain.id, context, tweetCount);
    const codeInstructions = this.contentEnhancementService.generateVisualContentInstructions(enhancement);
    
    const basePrompt = `Create a Twitter thread about "${cleanTopic}" for B2B SaaS entrepreneurs and technical professionals.

STRICT REQUIREMENTS:
- Generate exactly ${tweetCount} tweets
- Each tweet MUST be under 280 characters
- Include relevant code examples where applicable
- Use engaging emojis (🔥, ⚡, 💡, 🧵, 📊, 🔧, 🔒, 💾, ⚖️)
- Focus on practical, actionable insights
- Target technical professionals and developers building authority
- Include technical depth with business value
- Number each tweet (1/${tweetCount}, 2/${tweetCount}, etc.)

${codeInstructions}

${context ? `Additional context: ${context}` : ''}

${tone ? `Tone: ${tone}` : 'Tone: Professional but approachable, educational, with authority-building insights'}

FORMAT REQUIREMENTS:
- Start each tweet with "TWEET:"
- Each tweet on a single line
- Make each tweet standalone but part of the thread
- Include practical code examples where valuable
- End with actionable advice

CODE CONTENT STRATEGY: ${enhancement.visualContentStrategy}
${enhancement.shouldIncludeCode ? '- Prioritize relevant code examples to demonstrate expertise' : ''}

Example for database isolation levels:
TWEET: 1/${tweetCount} 🧵 Database isolation levels explained: The secret to preventing data corruption in high-concurrency applications ⚡ Let's dive into READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, and SERIALIZABLE 🔒
TWEET: 2/${tweetCount} 💡 READ UNCOMMITTED: Fastest but dangerous! ⚠️ Allows dirty reads. \`SELECT * FROM orders WHERE status = 'pending'\` - Use only for analytics where accuracy isn't critical
TWEET: 3/${tweetCount} ✅ READ COMMITTED: Default for most databases. Prevents dirty reads but allows phantom reads. Good balance of performance and consistency for most applications.

Generate exactly ${tweetCount} tweets for "${cleanTopic}". Each tweet must start with "TWEET:" and be on its own line:`;

    return basePrompt;
  }

  private processTweet(content: string, position: number, totalTweets: number): Tweet | null {
    // Clean up formatting while preserving code backticks
    let cleanContent = content.trim()
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Validate tweet content
    if (cleanContent && cleanContent.length > 10 && cleanContent.length <= 400) { // Reasonable limit for tweets with code
      return {
        id: `tweet-${position + 1}`,
        content: cleanContent,
        characterCount: cleanContent.length,
        position: position + 1,
        totalTweets: totalTweets // Use the passed totalTweets parameter
      };
    }
    
    return null;
  }

  private parseThreadContent(content: string, topic: string, tweetCount: number): Tweet[] {
    console.log('Raw AI response:', content);
    
    const lines = content.split('\n');
    const tweets: Tweet[] = [];
    let tweetCounter = 1;
    let currentTweet = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Look for tweet markers
      if (trimmedLine.startsWith('TWEET:') || 
          /^\d+\/\d+/.test(trimmedLine) || 
          trimmedLine.match(/^(\d+\.\s|\d+\/\d+)/)) {
        
        // Process previous tweet if we have one
        if (currentTweet.trim()) {
          const processedTweet = this.processTweet(currentTweet, tweets.length, tweetCount);
          if (processedTweet) {
            tweets.push(processedTweet);
          }
        }
        
        // Start new tweet
        let tweetContent = '';
        if (trimmedLine.startsWith('TWEET:')) {
          tweetContent = trimmedLine.replace('TWEET:', '').trim();
        } else {
          tweetContent = trimmedLine;
        }
        
        currentTweet = tweetContent;
        tweetCounter++;
        
        // Stop after tweetCount tweets
        if (tweetCounter > tweetCount + 1) break;
      } else if (currentTweet) {
        // Continue accumulating current tweet content
        currentTweet += ' ' + trimmedLine;
      }
    }
    
    // Process final tweet
    if (currentTweet.trim() && tweets.length < tweetCount) {
      const processedTweet = this.processTweet(currentTweet, tweets.length, tweetCount);
      if (processedTweet) {
        tweets.push(processedTweet);
      }
    }

    // Enhanced fallback parsing if no tweets found with TWEET: prefix
    if (tweets.length === 0) {
      console.log('No tweets found with TWEET: prefix, trying alternative parsing...');
      return this.fallbackParsing(content, topic, tweetCount);
    }

    // Ensure all tweets have the correct totalTweets count
    tweets.forEach(tweet => {
      tweet.totalTweets = tweetCount;
    });

    console.log(`Successfully parsed ${tweets.length} tweets with code content`);
    tweets.forEach((tweet, index) => {
      console.log(`Tweet ${index + 1}: "${tweet.content.substring(0, 50)}..." (${tweet.position}/${tweet.totalTweets})`);
    });
    
    return tweets.slice(0, tweetCount);
  }

  private fallbackParsing(content: string, topic: string, tweetCount: number): Tweet[] {
    const tweets: Tweet[] = [];
    
    // Try to split by numbers like "1/6", "2/6", etc.
    const tweetPattern = /(\d+\/\d+.*?)(?=\d+\/\d+|$)/gs;
    const matches = content.match(tweetPattern);
    
    if (matches && matches.length > 0) {
      matches.forEach((match, index) => {
        if (index < tweetCount) {
          let cleanMatch = match.trim()
            .replace(/\*\*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanMatch.length > 10 && cleanMatch.length <= 400) {
            tweets.push({
              id: `tweet-${index + 1}`,
              content: cleanMatch,
              characterCount: cleanMatch.length,
              position: index + 1,
              totalTweets: tweetCount // Set correct total count
            });
          }
        }
      });
    }

    // Ultimate fallback
    if (tweets.length === 0) {
      console.log('All parsing failed, creating fallback tweet');
      const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
      const fallbackTweet = {
        id: 'tweet-1',
        content: `1/1 🧵 ${cleanTopic} - Essential concepts every developer should master! 🚀 More detailed thread coming soon...`,
        characterCount: 0,
        position: 1,
        totalTweets: 1
      };
      fallbackTweet.characterCount = fallbackTweet.content.length;
      tweets.push(fallbackTweet);
    }

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

  // Analyze user's topic intention for technical content across all domains
  async analyzeTopicIntention(topic: string, context?: string): Promise<IntentionAnalysis> {
    try {
      // First, detect the technical domain
      const domainAnalysis = this.domainService.detectDomain(topic, context);
      console.log('Domain analysis result:', domainAnalysis);

      const prompt = `Analyze this user input to understand their intention for creating a technical Twitter thread that builds authority and expertise:

User Topic: "${topic}"
${context ? `Additional Context: "${context}"` : ''}
Detected Domain: ${domainAnalysis.primaryDomain.name}

REQUIREMENTS:
1. Determine if this is a technical topic suitable for B2B SaaS professionals
2. Create a simple, conversational summary of what the user wants to explain
3. Focus on authority-building content that showcases expertise
4. Consider how this topic helps build professional credibility

RESPONSE FORMAT (JSON):
{
  "intention": "Simple text summary like: 'You want to share React performance optimization secrets that distinguish senior developers from junior ones'",
  "isTechnicalTopic": true/false,
  "authorityFocus": "How this topic builds professional authority",
  "fallbackToOriginal": false
}

If NOT technical/professional, set isTechnicalTopic to false and fallbackToOriginal to true.

Examples:
- "React performance optimization" → "You want to share React performance secrets that separate senior developers from the rest"
- "Microservices architecture patterns" → "You want to explain microservices patterns that scale startups to enterprise"
- "Cooking recipes" → Set isTechnicalTopic: false, fallbackToOriginal: true

Respond with valid JSON only:`;

      const response = await this.llmService.chat([
        {
          role: 'system',
          content: 'You are an expert at analyzing technical topics for B2B SaaS professionals. Always respond with valid JSON format.'
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
          intention: analysis.intention || `Technical insights about ${domainAnalysis.primaryDomain.name.toLowerCase()}`,
          isTechnicalTopic: analysis.isTechnicalTopic !== false,
          domain: domainAnalysis.primaryDomain,
          suggestedHook: domainAnalysis.suggestedHook,
          expertiseLevel: domainAnalysis.expertiseLevel,
          fallbackToOriginal: analysis.fallbackToOriginal === true
        };
      } catch (parseError) {
        console.error('Failed to parse intention analysis JSON:', parseError);
        // Fallback using domain analysis
        return {
          intention: `Technical insights about ${domainAnalysis.primaryDomain.name.toLowerCase()}`,
          isTechnicalTopic: true,
          domain: domainAnalysis.primaryDomain,
          suggestedHook: domainAnalysis.suggestedHook,
          expertiseLevel: domainAnalysis.expertiseLevel,
          fallbackToOriginal: false
        };
      }
    } catch (error) {
      console.error('Intention analysis error:', error);
      // Graceful fallback
      return {
        intention: 'Technical content creation',
        isTechnicalTopic: true,
        fallbackToOriginal: true
      };
    }
  }

  // Generate thread with enhanced context and domain expertise
  async generateThreadWithContext(topic: string, context?: string, refinedIntention?: string, domainAnalysis?: DomainAnalysis, tweetCount: number = 6): Promise<ThreadResponse> {
    try {
      // Validate tweet count
      const validatedCount = this.validateTweetCount(tweetCount);
      
      // Use provided domain analysis or detect domain
      const domain = domainAnalysis || this.domainService.detectDomain(topic, context);
      
      // Perform web search for additional context
      console.log('Performing web search for topic:', topic, 'Domain:', domain.primaryDomain.id, 'Tweet count:', validatedCount);
      const searchResults = await this.webSearchService.searchWeb(topic, domain.primaryDomain.id, refinedIntention);
      
      const enhancedContext = this.buildEnhancedContext(topic, context, refinedIntention, searchResults, domain);
      const prompt = this.buildAuthorityBuildingPrompt(topic, enhancedContext, domain, validatedCount);
      
      console.log('=== ENHANCED AUTHORITY-BUILDING PROMPT ===');
      console.log(prompt.substring(0, 500) + '...');
      console.log('==========================================');
      
      const response = await this.llmService.chat([
        {
          role: 'system',
          content: domain.primaryDomain.expertPersona + ` You MUST generate exactly ${validatedCount} tweets that build authority and showcase expertise. The first tweet must hook readers within 10 seconds.`
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
      
      const tweets = this.parseThreadContent(threadContent, topic, validatedCount);
      
      if (tweets.length < validatedCount) {
        console.warn(`Only parsed ${tweets.length} tweets instead of ${validatedCount}. Attempting to fix...`);
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

  private buildEnhancedContext(topic: string, context?: string, refinedIntention?: string, searchResults?: SearchResult[], domainAnalysis?: DomainAnalysis): string {
    let enhancedContext = '';
    
    if (domainAnalysis) {
      enhancedContext += `Technical Domain: ${domainAnalysis.primaryDomain.name}\n`;
      enhancedContext += `Expertise Level: ${domainAnalysis.expertiseLevel}\n`;
      enhancedContext += `Authority Focus: Building expertise and credibility in ${domainAnalysis.primaryDomain.name}\n`;
    }
    
    if (refinedIntention) {
      enhancedContext += `User's refined intention: ${refinedIntention}\n`;
    }
    
    if (context) {
      enhancedContext += `Additional context: ${context}\n`;
    }
    
    // Add search results context
    if (searchResults && searchResults.length > 0) {
      enhancedContext += `\nCurrent industry insights and research:\n`;
      searchResults.forEach((result, index) => {
        enhancedContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
      });
      enhancedContext += '\n';
    }
    
    enhancedContext += `Target Audience: B2B SaaS entrepreneurs and technical professionals seeking to build authority and share expertise through high-quality content.`;
    
    return enhancedContext;
  }

  private buildAuthorityBuildingPrompt(topic: string, enhancedContext: string, domainAnalysis: DomainAnalysis, tweetCount: number): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    // Analyze content strategy for code enhancements
    const enhancement = this.contentEnhancementService.analyzeContentStrategy(topic, domainAnalysis.primaryDomain.id, enhancedContext, tweetCount);
    const codeInstructions = this.contentEnhancementService.generateVisualContentInstructions(enhancement);
    
    return `Create a compelling Twitter thread about "${cleanTopic}" that builds technical authority and showcases expertise.

ENHANCED CONTEXT:
${enhancedContext}

CRITICAL SUCCESS FACTORS:
1. HOOK WITHIN 10 SECONDS: The first tweet must grab attention immediately and show clear value
2. AUTHORITY BUILDING: Each tweet should demonstrate deep expertise and professional credibility
3. ACTIONABLE INSIGHTS: Provide specific, implementable advice that professionals can use
4. PROFESSIONAL VALUE: Help readers build their own expertise and advance their careers
5. PRACTICAL EXAMPLES: Use code examples to demonstrate technical depth

${codeInstructions}

FORMAT REQUIREMENTS - FOLLOW EXACTLY:
1. Generate EXACTLY ${tweetCount} tweets, no more, no less
2. Each tweet MUST start with "TWEET:" (all caps)
3. Each tweet MUST be numbered 1/${tweetCount}, 2/${tweetCount}, 3/${tweetCount}, etc.
4. Each tweet MUST be under 280 characters
5. Each tweet on its own line

CODE CONTENT STRATEGY: ${enhancement.visualContentStrategy}
${enhancement.shouldIncludeCode ? '- Include relevant code examples with backticks for inline code' : ''}

CONTENT STRUCTURE:
- Tweet 1: Compelling hook with immediate value proposition (${domainAnalysis.suggestedHook})
- Tweet 2-${tweetCount-1}: Deep insights, practical examples, code samples, and expert-level knowledge
- Tweet ${tweetCount}: Call to action for engagement and authority building

AUTHORITY-BUILDING ELEMENTS TO INCLUDE:
- Specific metrics, numbers, or results where relevant
- Industry best practices and current trends (from search results)
- Expert-level insights that distinguish professionals from beginners
- Real-world examples and case studies
- Code snippets that demonstrate technical depth
- Forward-looking perspectives on technology trends

ENGAGEMENT OPTIMIZATION:
- Use compelling language that demonstrates expertise
- Include relevant emojis for visual appeal
- End with questions or calls to action that encourage professional discussion
- Reference current industry developments when applicable

Example structure for ${domainAnalysis.primaryDomain.name}:
TWEET: 1/${tweetCount} ${domainAnalysis.suggestedHook} 🧵 [specific metric or surprising insight] ⬇️
TWEET: 2/${tweetCount} 💡 [Expert insight #1]: [Specific example with code if applicable] \`code sample\` This is why [authority statement]
TWEET: 3/${tweetCount} 🔧 [Expert insight #2]: [Practical implementation] Most developers miss this because [expert perspective]
${tweetCount > 3 ? `TWEET: 4/${tweetCount} 📊 [Data/metrics/case study]: [Specific numbers or results] Here's how industry leaders approach this...` : ''}
${tweetCount > 4 ? `TWEET: 5/${tweetCount} 🚀 [Advanced technique/future trend]: [Forward-looking insight with technical example] This separates senior professionals from the rest` : ''}
TWEET: ${tweetCount}/${tweetCount} 💬 What's your experience with [topic]? Share your insights below! RT if this helped level up your ${domainAnalysis.primaryDomain.name.toLowerCase()} game 🔥

Now generate exactly ${tweetCount} authority-building tweets for "${cleanTopic}" following this EXACT format:`;
  }

  // Validate tweet count within allowed range
  private validateTweetCount(count: number): number {
    const tweetCount = Math.floor(Number(count));
    
    if (isNaN(tweetCount) || tweetCount < 1) {
      console.warn(`Invalid tweet count ${count}, using default: 6`);
      return 6;
    }
    
    if (tweetCount > 20) {
      console.warn(`Tweet count ${count} exceeds maximum 20, using 20`);
      return 20;
    }
    
    return tweetCount;
  }
} 