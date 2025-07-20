export interface TechnicalDomain {
  id: string;
  name: string;
  description: string;
  expertPersona: string;
  searchTerms: string[];
  authorityKeywords: string[];
}

export interface DomainAnalysis {
  primaryDomain: TechnicalDomain;
  confidence: number;
  suggestedHook: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
}

export class DomainService {
  private domains: TechnicalDomain[] = [
    {
      id: 'webdev',
      name: 'Web Development',
      description: 'Frontend, backend, full-stack development, frameworks, and web technologies',
      expertPersona: 'You are a senior full-stack developer with 8+ years building scalable web applications. You specialize in modern frameworks (React, Vue, Angular), backend technologies (Node.js, Python, Go), and have deep expertise in web performance, architecture, and best practices.',
      searchTerms: ['web development', 'frontend', 'backend', 'javascript', 'react', 'vue', 'angular', 'node.js'],
      authorityKeywords: ['scalable', 'performance', 'architecture', 'best practices', 'modern', 'enterprise']
    },
    {
      id: 'architecture',
      name: 'Software Architecture',
      description: 'System design, architectural patterns, microservices, and scalable systems',
      expertPersona: 'You are a distinguished software architect with 10+ years designing enterprise systems. You excel at system design, architectural patterns, microservices, event-driven architecture, and building systems that scale from startup to enterprise.',
      searchTerms: ['software architecture', 'system design', 'microservices', 'design patterns', 'scalability'],
      authorityKeywords: ['enterprise', 'scalable', 'patterns', 'design', 'architecture', 'systems thinking']
    },
    {
      id: 'distributed-systems',
      name: 'Distributed Systems',
      description: 'Distributed computing, consensus algorithms, fault tolerance, and large-scale systems',
      expertPersona: 'You are a distributed systems expert with deep knowledge of consensus algorithms, fault tolerance, CAP theorem, and building resilient large-scale systems. You understand the complexities of network partitions, eventual consistency, and distributed data management.',
      searchTerms: ['distributed systems', 'consensus', 'fault tolerance', 'CAP theorem', 'eventual consistency'],
      authorityKeywords: ['resilient', 'fault-tolerant', 'consensus', 'distributed', 'large-scale', 'reliability']
    },
    {
      id: 'devops',
      name: 'DevOps & Infrastructure',
      description: 'CI/CD, containerization, cloud platforms, monitoring, and infrastructure automation',
      expertPersona: 'You are a senior DevOps engineer with expertise in CI/CD, containerization (Docker, Kubernetes), cloud platforms (AWS, GCP, Azure), infrastructure as code, and building reliable deployment pipelines.',
      searchTerms: ['devops', 'kubernetes', 'docker', 'ci/cd', 'aws', 'cloud', 'infrastructure'],
      authorityKeywords: ['automation', 'reliable', 'scalable', 'cloud-native', 'infrastructure', 'deployment']
    },
    {
      id: 'ai-ml',
      name: 'AI/ML & Data Science',
      description: 'Machine learning, AI, data science, MLOps, and intelligent systems',
      expertPersona: 'You are an AI/ML engineer with extensive experience in machine learning, deep learning, MLOps, and building production AI systems. You understand model training, deployment, monitoring, and the practical challenges of AI in business.',
      searchTerms: ['machine learning', 'AI', 'artificial intelligence', 'data science', 'neural networks', 'MLOps'],
      authorityKeywords: ['intelligent', 'predictive', 'automated', 'data-driven', 'ML', 'production AI']
    },
    {
      id: 'security',
      name: 'Cybersecurity',
      description: 'Application security, infrastructure security, threat modeling, and secure coding',
      expertPersona: 'You are a cybersecurity expert specializing in application security, threat modeling, secure coding practices, and building security-first systems. You understand OWASP principles, encryption, and modern security challenges.',
      searchTerms: ['cybersecurity', 'security', 'encryption', 'OWASP', 'threat modeling', 'secure coding'],
      authorityKeywords: ['secure', 'protected', 'encrypted', 'threat-resistant', 'compliant', 'security-first']
    },
    {
      id: 'mobile',
      name: 'Mobile Development',
      description: 'iOS, Android, React Native, Flutter, and mobile app development',
      expertPersona: 'You are a senior mobile developer with expertise in iOS (Swift), Android (Kotlin), and cross-platform frameworks (React Native, Flutter). You understand mobile-specific challenges like performance, battery optimization, and user experience.',
      searchTerms: ['mobile development', 'iOS', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
      authorityKeywords: ['mobile-first', 'native', 'cross-platform', 'optimized', 'user experience', 'performant']
    },
    {
      id: 'blockchain',
      name: 'Blockchain & Web3',
      description: 'Blockchain development, smart contracts, DeFi, and decentralized applications',
      expertPersona: 'You are a blockchain developer with deep expertise in smart contracts, DeFi protocols, and building decentralized applications. You understand Ethereum, Solidity, and the complexities of building secure, decentralized systems.',
      searchTerms: ['blockchain', 'web3', 'smart contracts', 'ethereum', 'DeFi', 'solidity', 'decentralized'],
      authorityKeywords: ['decentralized', 'trustless', 'immutable', 'smart contracts', 'DeFi', 'web3']
    },
    {
      id: 'database',
      name: 'Database & Data Engineering',
      description: 'Database design, SQL, NoSQL, data pipelines, and data architecture',
      expertPersona: 'You are a senior database engineer with expertise in SQL/NoSQL databases, data modeling, query optimization, and building scalable data architectures. You understand ACID properties, CAP theorem, and modern data stack.',
      searchTerms: ['database', 'SQL', 'NoSQL', 'data engineering', 'data pipeline', 'data architecture'],
      authorityKeywords: ['scalable', 'optimized', 'performant', 'data-driven', 'robust', 'efficient']
    }
  ];

  // Detect technical domain from topic
  detectDomain(topic: string, context?: string): DomainAnalysis {
    const fullText = `${topic} ${context || ''}`.toLowerCase();
    const scores: { domain: TechnicalDomain; score: number }[] = [];

    // Score each domain based on keyword matches
    for (const domain of this.domains) {
      let score = 0;
      
      // Primary search terms (higher weight)
      for (const term of domain.searchTerms) {
        if (fullText.includes(term)) {
          score += 3;
        }
      }
      
      // Authority keywords (lower weight)
      for (const keyword of domain.authorityKeywords) {
        if (fullText.includes(keyword)) {
          score += 1;
        }
      }
      
      scores.push({ domain, score });
    }

    // Sort by score and get the highest
    scores.sort((a, b) => b.score - a.score);
    const topMatch = scores[0];
    
    // Default to web development if no clear match
    const primaryDomain = topMatch.score > 0 ? topMatch.domain : this.domains[0];
    const confidence = Math.min(topMatch.score / 10, 1); // Normalize to 0-1

    return {
      primaryDomain,
      confidence,
      suggestedHook: this.generateHook(primaryDomain, topic),
      expertiseLevel: this.determineExpertiseLevel(fullText)
    };
  }

  private generateHook(domain: TechnicalDomain, topic: string): string {
    const hooks = {
      'webdev': '🚀 Want to build web apps that scale? Here\'s what senior developers wish they knew earlier',
      'architecture': '🏗️ System design secrets that separate senior engineers from the rest',
      'distributed-systems': '⚡ The distributed systems principles that power trillion-dollar companies',
      'devops': '🔧 DevOps practices that reduce deployment anxiety and increase reliability',
      'ai-ml': '🤖 AI/ML insights that bridge the gap between research and production',
      'security': '🔒 Security principles that protect your applications from real-world threats',
      'mobile': '📱 Mobile development strategies that create apps users actually love',
      'blockchain': '⛓️ Web3 development insights for building the decentralized future',
      'database': '📊 Database optimizations that turned slow queries into lightning-fast responses'
    };

    return hooks[domain.id] || '💡 Technical insights that level up your engineering game';
  }

  private determineExpertiseLevel(text: string): 'beginner' | 'intermediate' | 'expert' {
    const beginnerTerms = ['basics', 'introduction', 'getting started', 'tutorial', 'beginner'];
    const expertTerms = ['advanced', 'optimization', 'architecture', 'enterprise', 'scalability', 'performance'];

    const hasBeginnerTerms = beginnerTerms.some(term => text.includes(term));
    const hasExpertTerms = expertTerms.some(term => text.includes(term));

    if (hasBeginnerTerms && !hasExpertTerms) return 'beginner';
    if (hasExpertTerms) return 'expert';
    return 'intermediate';
  }

  // Get all available domains for UI
  getAllDomains(): TechnicalDomain[] {
    return this.domains;
  }

  // Get domain by ID
  getDomainById(id: string): TechnicalDomain | undefined {
    return this.domains.find(domain => domain.id === id);
  }
} 