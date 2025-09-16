export type ProviderName = 'aws' | 'azure' | 'google' | 'openai';

export interface AIServiceCapabilities {
  textGeneration: boolean;
  chatCompletion: boolean;
  imageGeneration: boolean;
  embeddingGeneration: boolean;
  functionCalling: boolean;
}

export interface ProviderDefinition {
  name: ProviderName;
  displayName: string;
  defaultRegion?: string;
  capabilities: AIServiceCapabilities;
}

export interface AIServiceProvider extends ProviderDefinition {
  region?: string;
}

// Centralized provider definitions - single source of truth
export const PROVIDER_DEFINITIONS: Record<ProviderName, ProviderDefinition> = {
  aws: {
    name: 'aws',
    displayName: 'AWS Bedrock',
    defaultRegion: 'us-east-1',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddingGeneration: false,
      functionCalling: false
    }
  },
  azure: {
    name: 'azure',
    displayName: 'Azure OpenAI',
    defaultRegion: 'eastus',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddingGeneration: true,
      functionCalling: true
    }
  },
  google: {
    name: 'google',
    displayName: 'Google Vertex AI',
    defaultRegion: 'us-central1',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddingGeneration: true,
      functionCalling: false
    }
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: true,
      embeddingGeneration: true,
      functionCalling: true
    }
  }
} as const;

// Type guard for provider validation
export function isValidProviderName(name: string): name is ProviderName {
  return Object.keys(PROVIDER_DEFINITIONS).includes(name as ProviderName);
}

// Helper function to get valid provider names
export function getValidProviderNames(): ProviderName[] {
  return Object.keys(PROVIDER_DEFINITIONS) as ProviderName[];
}