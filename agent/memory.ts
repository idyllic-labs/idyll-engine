/**
 * In-memory activity tracking for agents
 */

import { formatDistanceToNow } from 'date-fns';
import { AgentActivity } from './types';

/**
 * Simple in-memory activity store
 */
export class ActivityMemory {
  private activities: AgentActivity[] = [];
  private maxSize: number;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  /**
   * Add an activity record
   */
  add(activity: Omit<AgentActivity, 'id' | 'timestamp'>): AgentActivity {
    const record: AgentActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.activities.unshift(record);
    
    // Keep only maxSize records
    if (this.activities.length > this.maxSize) {
      this.activities = this.activities.slice(0, this.maxSize);
    }

    return record;
  }

  /**
   * Get recent activities
   */
  getRecent(limit?: number): AgentActivity[] {
    return limit ? this.activities.slice(0, limit) : this.activities;
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
  }

  /**
   * Format activities as memory context for agent
   */
  formatForPrompt(limit = 10): string {
    const recent = this.getRecent(limit);
    
    if (recent.length === 0) {
      return '';
    }

    const formatted = recent.map(activity => {
      const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });
      const parts = [`[${timeAgo}] ${activity.type}`];
      
      if (activity.userMessage) {
        parts.push(`User: "${activity.userMessage.substring(0, 100)}${activity.userMessage.length > 100 ? '...' : ''}"`);
      }
      
      if (activity.assistantMessage) {
        parts.push(`Assistant: "${activity.assistantMessage.substring(0, 100)}${activity.assistantMessage.length > 100 ? '...' : ''}"`);
      }
      
      if (activity.toolCalls && activity.toolCalls.length > 0) {
        parts.push(`Tools: ${activity.toolCalls.map(tc => tc.name).join(', ')}`);
      }
      
      if (activity.error) {
        parts.push(`Error: ${activity.error}`);
      }
      
      return parts.join(' | ');
    }).join('\n');

    return `<recent_activity>
${formatted}
</recent_activity>`;
  }

  /**
   * Get activities as JSON
   */
  toJSON(): AgentActivity[] {
    return this.activities;
  }
}