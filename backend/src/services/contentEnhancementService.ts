export interface ContentEnhancement {
  shouldIncludeCode: boolean;
  codeExamples: CodeSample[];
  visualContentStrategy: 'code-heavy' | 'text-only';
}

export interface CodeSample {
  language: string;
  purpose: string;
  tweetPosition?: number; // Which tweet this should appear in (1-based)
  snippet: string;
  context: string;
}

export class ContentEnhancementService {
  
  // Analyze topic and determine optimal code content strategy
  analyzeContentStrategy(topic: string, domain: string, context?: string, tweetCount: number = 6): ContentEnhancement {
    const fullText = `${topic} ${context || ''}`.toLowerCase();
    
    const enhancement: ContentEnhancement = {
      shouldIncludeCode: false,
      codeExamples: [],
      visualContentStrategy: 'text-only'
    };

    // Determine content strategy based on domain and topic
    if (this.isCodeHeavyTopic(fullText, domain)) {
      enhancement.visualContentStrategy = 'code-heavy';
      enhancement.shouldIncludeCode = true;
      enhancement.codeExamples = this.generateCodeSamples(topic, domain, fullText, tweetCount);
    }

    return enhancement;
  }

  private isCodeHeavyTopic(text: string, domain: string): boolean {
    const codeKeywords = [
      'algorithm', 'function', 'method', 'api', 'sql', 'query', 'code', 'implementation',
      'syntax', 'programming', 'script', 'debugging', 'testing', 'refactoring', 'optimization',
      'performance', 'best practices', 'patterns'
    ];
    
    const codeHeavyDomains = ['database', 'webdev', 'ai-ml', 'devops'];
    
    return codeKeywords.some(keyword => text.includes(keyword)) || 
           codeHeavyDomains.includes(domain);
  }

  private generateCodeSamples(topic: string, domain: string, fullText: string, maxSamples: number): CodeSample[] {
    const samples: CodeSample[] = [];
    
    // Domain-specific code sample templates
    switch (domain) {
      case 'database':
        if (fullText.includes('performance') || fullText.includes('optimization')) {
          samples.push({
            language: 'sql',
            purpose: 'Query optimization example',
            snippet: 'SELECT * FROM users WHERE status = \'active\' AND created_at > \'2024-01-01\'',
            context: 'Optimized query with proper indexing',
            tweetPosition: 2
          });
        }
        if (fullText.includes('isolation') || fullText.includes('transaction')) {
          samples.push({
            language: 'sql',
            purpose: 'Transaction isolation demo',
            snippet: 'BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nCOMMIT;',
            context: 'Safe transaction handling',
            tweetPosition: 3
          });
        }
        if (fullText.includes('index') || fullText.includes('indexing')) {
          samples.push({
            language: 'sql',
            purpose: 'Index creation',
            snippet: 'CREATE INDEX idx_user_status_date ON users(status, created_at);',
            context: 'Composite index for performance',
            tweetPosition: 4
          });
        }
        break;

      case 'webdev':
        if (fullText.includes('react') || fullText.includes('component')) {
          samples.push({
            language: 'javascript',
            purpose: 'React optimization',
            snippet: 'const MemoizedComponent = React.memo(({ data }) => (\n  <div>{data.map(item => <Item key={item.id} {...item} />)}</div>\n));',
            context: 'Performance optimization with React.memo',
            tweetPosition: 2
          });
        }
        if (fullText.includes('api') || fullText.includes('fetch')) {
          samples.push({
            language: 'javascript',
            purpose: 'Error handling',
            snippet: 'const response = await fetch(\'/api/data\')\n  .catch(err => ({ error: err.message }));',
            context: 'Robust API error handling',
            tweetPosition: 3
          });
        }
        if (fullText.includes('async') || fullText.includes('promise')) {
          samples.push({
            language: 'javascript',
            purpose: 'Async/await pattern',
            snippet: 'try {\n  const result = await processData();\n  return result;\n} catch (error) {\n  console.error(\'Processing failed:\', error);\n}',
            context: 'Clean async error handling',
            tweetPosition: 4
          });
        }
        break;

      case 'devops':
        if (fullText.includes('docker') || fullText.includes('container')) {
          samples.push({
            language: 'dockerfile',
            purpose: 'Multi-stage build',
            snippet: 'FROM node:16-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production',
            context: 'Optimized Docker build',
            tweetPosition: 2
          });
        }
        if (fullText.includes('kubernetes') || fullText.includes('k8s')) {
          samples.push({
            language: 'yaml',
            purpose: 'Kubernetes deployment',
            snippet: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: myapp\nspec:\n  replicas: 3',
            context: 'Basic K8s deployment config',
            tweetPosition: 3
          });
        }
        break;

      case 'ai-ml':
        if (fullText.includes('model') || fullText.includes('training')) {
          samples.push({
            language: 'python',
            purpose: 'Model validation',
            snippet: 'from sklearn.model_selection import cross_val_score\nscores = cross_val_score(model, X, y, cv=5, scoring=\'accuracy\')',
            context: 'Proper model evaluation',
            tweetPosition: 2
          });
        }
        if (fullText.includes('data') || fullText.includes('preprocessing')) {
          samples.push({
            language: 'python',
            purpose: 'Data preprocessing',
            snippet: 'import pandas as pd\ndf = pd.read_csv(\'data.csv\')\ndf_clean = df.dropna().fillna(df.mean())',
            context: 'Basic data cleaning pipeline',
            tweetPosition: 3
          });
        }
        break;

      case 'architecture':
      case 'distributed-systems':
        if (fullText.includes('api') || fullText.includes('service')) {
          samples.push({
            language: 'javascript',
            purpose: 'Service communication',
            snippet: 'const response = await fetch(\'http://user-service/api/users\', {\n  headers: { \'Authorization\': `Bearer ${token}` }\n});',
            context: 'Microservice API call',
            tweetPosition: 2
          });
        }
        break;
    }

    return samples.slice(0, Math.min(maxSamples, 3)); // Limit to 3 code examples max
  }

  // Generate enhanced prompt instructions for code content
  generateVisualContentInstructions(enhancement: ContentEnhancement): string {
    let instructions = '';

    if (enhancement.visualContentStrategy === 'text-only') {
      return 'Focus on clear, concise explanations without code examples.';
    }

    instructions += 'CODE CONTENT REQUIREMENTS:\n';
    instructions += '- Include relevant, practical code examples in appropriate tweets\n';
    instructions += '- Use backticks for inline code: `code here`\n';
    instructions += '- For multi-line code, format clearly with line breaks\n';
    instructions += '- Keep code snippets concise and Twitter-friendly\n';
    instructions += '- Focus on practical, copy-paste ready examples\n';
    
    if (enhancement.codeExamples.length > 0) {
      instructions += '\nSUGGESTED CODE EXAMPLES:\n';
      enhancement.codeExamples.forEach((example, index) => {
        instructions += `${index + 1}. ${example.purpose} (Tweet ${example.tweetPosition || 'any'}): ${example.language} example\n`;
        instructions += `   Context: ${example.context}\n`;
      });
    }

    instructions += '\nIMPORTANT: Ensure code examples enhance understanding and fit within tweet character limits.\n';

    return instructions;
  }
} 