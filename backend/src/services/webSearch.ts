export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class WebSearchService {
  
  // Main search method with multi-strategy approach
  async searchWeb(topic: string, refinedIntention?: string): Promise<SearchResult[]> {
    try {
      console.log('Starting multi-strategy web search for:', topic);
      
      // Strategy 1: Try main topic terms
      const mainQuery = this.extractKeyTerms(topic);
      console.log('Strategy 1 - Main query:', mainQuery);
      let results = await this.performDuckDuckGoSearch(mainQuery);
      
      // Strategy 2: If no results, try broader database term
      if (results.length === 0) {
        const broadQuery = this.buildBroadDatabaseQuery(topic);
        console.log('Strategy 2 - Broad query:', broadQuery);
        results = await this.performDuckDuckGoSearch(broadQuery);
      }
      
      // Strategy 3: If still no results, try just the core concept
      if (results.length === 0) {
        const coreQuery = this.extractCoreConceptOnly(topic);
        console.log('Strategy 3 - Core query:', coreQuery);
        results = await this.performDuckDuckGoSearch(coreQuery);
      }
      
      console.log(`Multi-strategy search completed with ${results.length} results`);
      return results;
      
    } catch (error) {
      console.warn('Multi-strategy web search failed, continuing without search results:', (error as Error).message);
      return [];
    }
  }

  private extractKeyTerms(topic: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    // Extract 2-3 most important words, avoid overly long queries
    const keyWords = cleanTopic
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join(' ');
    
    return keyWords;
  }

  private buildBroadDatabaseQuery(topic: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    // Check for database-related terms and create broader queries
    if (cleanTopic.toLowerCase().includes('index')) return 'database index';
    if (cleanTopic.toLowerCase().includes('isolation')) return 'database isolation';
    if (cleanTopic.toLowerCase().includes('query')) return 'SQL query';
    if (cleanTopic.toLowerCase().includes('performance')) return 'database performance';
    if (cleanTopic.toLowerCase().includes('optimization')) return 'database optimization';
    if (cleanTopic.toLowerCase().includes('schema')) return 'database schema';
    if (cleanTopic.toLowerCase().includes('transaction')) return 'database transaction';
    if (cleanTopic.toLowerCase().includes('column')) return 'database column';
    if (cleanTopic.toLowerCase().includes('table')) return 'database table';
    if (cleanTopic.toLowerCase().includes('backup')) return 'database backup';
    if (cleanTopic.toLowerCase().includes('migration')) return 'database migration';
    if (cleanTopic.toLowerCase().includes('replication')) return 'database replication';
    if (cleanTopic.toLowerCase().includes('security')) return 'database security';
    
    return 'database';
  }

  private extractCoreConceptOnly(topic: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim().toLowerCase();
    
    // Extract just the core database concept
    if (cleanTopic.includes('index')) return 'index';
    if (cleanTopic.includes('isolation')) return 'isolation';
    if (cleanTopic.includes('query')) return 'query';
    if (cleanTopic.includes('performance')) return 'performance';
    if (cleanTopic.includes('optimization')) return 'optimization';
    if (cleanTopic.includes('schema')) return 'schema';
    if (cleanTopic.includes('transaction')) return 'transaction';
    if (cleanTopic.includes('column')) return 'column';
    if (cleanTopic.includes('table')) return 'table';
    if (cleanTopic.includes('backup')) return 'backup';
    if (cleanTopic.includes('migration')) return 'migration';
    if (cleanTopic.includes('replication')) return 'replication';
    if (cleanTopic.includes('security')) return 'security';
    
    return 'database';
  }

  private async performDuckDuckGoSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];
    
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'TweetyThreadGenerator/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`DuckDuckGo API returned ${response.status} for query: ${query}`);
        return [];
      }

      const data = await response.json() as any;
      const results: SearchResult[] = [];
      
      // Extract DuckDuckGo instant answer
      if (data.Abstract && data.Abstract.length > 20) {
        results.push({
          title: data.Heading || `About ${query}`,
          snippet: data.Abstract.substring(0, 300) + (data.Abstract.length > 300 ? '...' : ''),
          url: data.AbstractURL || ''
        });
      }
      
      // Extract related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 3).forEach((relatedTopic: any) => {
          if (relatedTopic.Text && relatedTopic.Text.length > 20) {
            const snippet = relatedTopic.Text.substring(0, 200) + (relatedTopic.Text.length > 200 ? '...' : '');
            results.push({
              title: relatedTopic.Text.split(' - ')[0] || `Related: ${query}`,
              snippet: snippet,
              url: relatedTopic.FirstURL || ''
            });
          }
        });
      }
      
      console.log(`DuckDuckGo search for "${query}" returned ${results.length} results`);
      return results.slice(0, 4);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`DuckDuckGo search failed for "${query}":`, (error as Error).message);
      return [];
    }
  }
} 