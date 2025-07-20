export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class WebSearchService {
  
  // Main search method with multi-strategy approach for any technical domain
  async searchWeb(topic: string, domain?: string, refinedIntention?: string): Promise<SearchResult[]> {
    try {
      console.log('Starting multi-strategy web search for:', topic, 'Domain:', domain);
      
      // Strategy 1: Try main topic terms
      const mainQuery = this.extractKeyTerms(topic);
      console.log('Strategy 1 - Main query:', mainQuery);
      let results = await this.performDuckDuckGoSearch(mainQuery);
      
      // Strategy 2: If no results, try domain-specific query
      if (results.length === 0 && domain) {
        const domainQuery = this.buildDomainSpecificQuery(topic, domain);
        console.log('Strategy 2 - Domain query:', domainQuery);
        results = await this.performDuckDuckGoSearch(domainQuery);
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

  private buildDomainSpecificQuery(topic: string, domain: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim();
    
    // Domain-specific query builders
    const domainMappings: { [key: string]: string } = {
      'webdev': 'web development',
      'architecture': 'software architecture',
      'distributed-systems': 'distributed systems',
      'devops': 'DevOps',
      'ai-ml': 'machine learning',
      'security': 'cybersecurity',
      'mobile': 'mobile development',
      'blockchain': 'blockchain',
      'database': 'database'
    };

    const domainTerm = domainMappings[domain] || domain;
    
    // Check for specific technical concepts and create broader queries
    if (cleanTopic.toLowerCase().includes('performance')) return `${domainTerm} performance`;
    if (cleanTopic.toLowerCase().includes('architecture')) return `${domainTerm} architecture`;
    if (cleanTopic.toLowerCase().includes('best practices')) return `${domainTerm} best practices`;
    if (cleanTopic.toLowerCase().includes('optimization')) return `${domainTerm} optimization`;
    if (cleanTopic.toLowerCase().includes('security')) return `${domainTerm} security`;
    if (cleanTopic.toLowerCase().includes('testing')) return `${domainTerm} testing`;
    if (cleanTopic.toLowerCase().includes('deployment')) return `${domainTerm} deployment`;
    if (cleanTopic.toLowerCase().includes('scaling')) return `${domainTerm} scaling`;
    
    return `${domainTerm} ${cleanTopic}`.substring(0, 50); // Limit query length
  }

  private extractCoreConceptOnly(topic: string): string {
    const cleanTopic = topic.replace(/^I want to write about /i, '').trim().toLowerCase();
    
    // Extract just the core technical concept
    if (cleanTopic.includes('react')) return 'react';
    if (cleanTopic.includes('kubernetes')) return 'kubernetes';
    if (cleanTopic.includes('docker')) return 'docker';
    if (cleanTopic.includes('microservices')) return 'microservices';
    if (cleanTopic.includes('api')) return 'API';
    if (cleanTopic.includes('database')) return 'database';
    if (cleanTopic.includes('machine learning')) return 'machine learning';
    if (cleanTopic.includes('ai')) return 'AI';
    if (cleanTopic.includes('blockchain')) return 'blockchain';
    if (cleanTopic.includes('security')) return 'security';
    if (cleanTopic.includes('performance')) return 'performance';
    if (cleanTopic.includes('architecture')) return 'architecture';
    if (cleanTopic.includes('testing')) return 'testing';
    if (cleanTopic.includes('devops')) return 'DevOps';
    if (cleanTopic.includes('cloud')) return 'cloud';
    if (cleanTopic.includes('aws')) return 'AWS';
    if (cleanTopic.includes('azure')) return 'Azure';
    if (cleanTopic.includes('gcp')) return 'GCP';
    
    // Default to "software development" for technical topics
    return 'software development';
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