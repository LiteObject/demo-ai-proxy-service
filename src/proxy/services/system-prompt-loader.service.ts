import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SystemPromptLoader {
  private readonly logger = new Logger(SystemPromptLoader.name);
  private incidentPromptCache?: { content: string; mtimeMs: number };
  private readonly incidentPromptPath = path.join(process.cwd(), 'config', 'incident-report-system-prompt.md');

  /**
   * Get incident report system prompt with file-based caching
   */
  async getIncidentPrompt(): Promise<string> {
    try {
      const stat = await fs.stat(this.incidentPromptPath);
      
      // Return cached content if file hasn't changed
      if (this.incidentPromptCache && this.incidentPromptCache.mtimeMs === stat.mtimeMs) {
        this.logger.debug(`📋 Using cached incident system prompt`);
        return this.incidentPromptCache.content;
      }

      // Load and cache new content
      const content = await fs.readFile(this.incidentPromptPath, 'utf-8');
      this.incidentPromptCache = { content, mtimeMs: stat.mtimeMs };
      
      this.logger.log(`📋 System prompt loaded and cached (mtime=${stat.mtimeMs})`);
      return content;
      
    } catch (error: any) {
      this.logger.error(`❌ Failed to load incident system prompt: ${error.message}`);
      throw new Error(`Failed to load incident system prompt: ${error.message}`);
    }
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.incidentPromptCache = undefined;
    this.logger.log('🗑️ System prompt cache cleared');
  }
}