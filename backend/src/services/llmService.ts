import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
}

export abstract class LLMService {
  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract getProviderName(): string;
}

export class LlamaService extends LLMService {
  private ollama: Ollama;

  constructor() {
    super();
    this.ollama = new Ollama({
      host: 'http://localhost:11434'
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false
      });

      return {
        content: response.message.content
      };
    } catch (error) {
      console.error('Llama/Ollama error:', error);
      throw new Error('Failed to generate response with Llama. Please ensure Ollama is running with llama3.2 model.');
    }
  }

  getProviderName(): string {
    return 'Llama (Local)';
  }
}

export class AnthropicService extends LLMService {
  private anthropic: Anthropic;

  constructor(apiKey?: string) {
    super();
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Anthropic service');
    }

    this.anthropic = new Anthropic({
      apiKey: key
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      // Anthropic requires system message to be separate
      const systemMessage = messages.find(msg => msg.role === 'system');
      const conversationMessages = messages.filter(msg => msg.role !== 'system');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Fast and cost-effective for thread generation
        max_tokens: 2000,
        system: systemMessage?.content || 'You are a helpful assistant.',
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      // Extract content from Anthropic response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return {
        content: textContent
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate response with Anthropic Claude. Please check your API key and quota.');
    }
  }

  getProviderName(): string {
    return 'Anthropic Claude';
  }
}

export class LLMServiceFactory {
  static createLLMService(): LLMService {
    const provider = process.env.LLM_PROVIDER || 'llama'; // Default to llama for local dev
    
    console.log(`Initializing LLM service with provider: ${provider}`);
    
    switch (provider.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        return new AnthropicService();
      
      case 'llama':
      case 'ollama':
      default:
        return new LlamaService();
    }
  }
} 