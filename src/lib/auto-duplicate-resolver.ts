import { PublicServantDuplicateDetector, DuplicateMatch, DuplicateCheckResult } from './duplicate-detector';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface AutoResolutionRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    matchTypes: string[];
    riskLevels: string[];
    confidenceLevels: string[];
    maxScore?: number;
    minScore?: number;
  };
  action: 'auto_approve' | 'auto_reject' | 'flag_for_review' | 'merge_with_existing';
  priority: number;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface AutoResolutionResult {
  ruleId: string;
  ruleName: string;
  action: string;
  confidence: number;
  reasoning: string;
  applied: boolean;
  timestamp: string;
}

export class AutoDuplicateResolver {
  private rules: AutoResolutionRule[] = [];
  private registryDir: string;

  constructor() {
    this.registryDir = path.join(process.cwd(), 'data', 'public-servant-applications');
    this.loadRules();
  }

  /**
   * Load auto-resolution rules from configuration
   */
  private loadRules(): void {
    // Default rules - in production, these would be loaded from a database
    this.rules = [
      {
        id: 'rule_001',
        name: 'Exact Employee Number Match',
        description: 'Automatically reject applications with duplicate employee numbers',
        conditions: {
          matchTypes: ['employee_number'],
          riskLevels: ['critical'],
          confidenceLevels: ['high']
        },
        action: 'auto_reject',
        priority: 1,
        enabled: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 0
      },
      {
        id: 'rule_002',
        name: 'Exact Email Match',
        description: 'Automatically reject applications with duplicate email addresses',
        conditions: {
          matchTypes: ['email'],
          riskLevels: ['critical'],
          confidenceLevels: ['high']
        },
        action: 'auto_reject',
        priority: 2,
        enabled: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 0
      },
      {
        id: 'rule_003',
        name: 'Low Risk Name Similarity',
        description: 'Auto-approve applications with only low-risk name similarities',
        conditions: {
          matchTypes: ['name_dob'],
          riskLevels: ['low'],
          confidenceLevels: ['low'],
          maxScore: 30
        },
        action: 'auto_approve',
        priority: 10,
        enabled: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 0
      },
      {
        id: 'rule_004',
        name: 'High Confidence Biometric Match',
        description: 'Flag high-confidence biometric matches for manual review',
        conditions: {
          matchTypes: ['biometric_face', 'biometric_fingerprint'],
          riskLevels: ['high'],
          confidenceLevels: ['high'],
          minScore: 95
        },
        action: 'flag_for_review',
        priority: 3,
        enabled: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 0
      },
      {
        id: 'rule_005',
        name: 'Medium Risk Multiple Matches',
        description: 'Flag applications with multiple medium-risk matches',
        conditions: {
          matchTypes: ['address_geolocation', 'phone_number', 'document_similarity'],
          riskLevels: ['medium'],
          confidenceLevels: ['medium']
        },
        action: 'flag_for_review',
        priority: 5,
        enabled: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        usageCount: 0
      }
    ];
  }

  /**
   * Process duplicate detection results and apply auto-resolution rules
   */
  async processDuplicates(applicationId: string, duplicateResult: DuplicateCheckResult): Promise<{
    processed: boolean;
    results: AutoResolutionResult[];
    finalAction: 'proceed' | 'block' | 'flag_for_review';
    message: string;
  }> {
    const results: AutoResolutionResult[] = [];
    let finalAction: 'proceed' | 'block' | 'flag_for_review' = 'proceed';
    let message = 'Application processed successfully';

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = this.rules.filter(rule => rule.enabled).sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const ruleResult = this.evaluateRule(rule, duplicateResult);
      if (ruleResult.applied) {
        results.push(ruleResult);
        
        // Update rule usage count
        rule.usageCount++;
        rule.lastUsed = new Date().toISOString();

        // Determine final action based on rule action
        switch (rule.action) {
          case 'auto_reject':
            finalAction = 'block';
            message = `Application automatically rejected: ${rule.description}`;
            break;
          case 'flag_for_review':
            if (finalAction === 'proceed') {
              finalAction = 'flag_for_review';
              message = `Application flagged for manual review: ${rule.description}`;
            }
            break;
          case 'auto_approve':
            // Only auto-approve if no higher priority rules have been triggered
            if (finalAction === 'proceed') {
              message = `Application automatically approved: ${rule.description}`;
            }
            break;
        }

        // If we have a blocking action, stop processing further rules
        if (finalAction === 'block') {
          break;
        }
      }
    }

    // If no rules were applied, use default behavior
    if (results.length === 0) {
      if (duplicateResult.requiresManualReview) {
        finalAction = 'flag_for_review';
        message = 'Application requires manual review due to duplicate detection';
      } else if (!duplicateResult.canProceed) {
        finalAction = 'block';
        message = duplicateResult.blockingMessage || 'Application blocked due to duplicate detection';
      }
    }

    // Log the auto-resolution results
    await this.logAutoResolution(applicationId, results, finalAction);

    return {
      processed: results.length > 0,
      results,
      finalAction,
      message
    };
  }

  /**
   * Evaluate a single rule against duplicate detection results
   */
  private evaluateRule(rule: AutoResolutionRule, duplicateResult: DuplicateCheckResult): AutoResolutionResult {
    const reasoning: string[] = [];
    let confidence = 0;
    let applied = false;

    // Check if any matches meet the rule conditions
    for (const match of duplicateResult.matches) {
      let matchMeetsConditions = true;

      // Check match type
      if (rule.conditions.matchTypes.length > 0 && !rule.conditions.matchTypes.includes(match.matchType)) {
        matchMeetsConditions = false;
      }

      // Check risk level
      if (rule.conditions.riskLevels.length > 0 && !rule.conditions.riskLevels.includes(match.riskLevel)) {
        matchMeetsConditions = false;
      }

      // Check confidence level
      if (rule.conditions.confidenceLevels.length > 0 && !rule.conditions.confidenceLevels.includes(match.confidence)) {
        matchMeetsConditions = false;
      }

      // Check score range
      if (rule.conditions.minScore && match.matchScore < rule.conditions.minScore) {
        matchMeetsConditions = false;
      }
      if (rule.conditions.maxScore && match.matchScore > rule.conditions.maxScore) {
        matchMeetsConditions = false;
      }

      if (matchMeetsConditions) {
        applied = true;
        confidence = Math.max(confidence, match.matchScore);
        reasoning.push(`Match type: ${match.matchType}, Risk: ${match.riskLevel}, Score: ${match.matchScore}`);
      }
    }

    // Additional conditions for specific rules
    if (applied) {
      switch (rule.id) {
        case 'rule_005': // Medium Risk Multiple Matches
          if (duplicateResult.matches.filter(m => m.riskLevel === 'medium').length < 2) {
            applied = false;
            reasoning.push('Insufficient medium-risk matches for rule application');
          }
          break;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
      confidence,
      reasoning: applied ? reasoning.join('; ') : 'Rule conditions not met',
      applied,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log auto-resolution results to application record
   */
  private async logAutoResolution(applicationId: string, results: AutoResolutionResult[], finalAction: string): Promise<void> {
    const applicationPath = path.join(this.registryDir, `${applicationId}.json`);
    
    if (!existsSync(applicationPath)) {
      return;
    }

    try {
      const applicationData = JSON.parse(await readFile(applicationPath, 'utf-8'));
      
      // Initialize auto-resolution tracking if not exists
      if (!applicationData.autoResolution) {
        applicationData.autoResolution = {
          enabled: true,
          results: [],
          finalAction: null,
          processedAt: null
        };
      }

      // Add new results
      applicationData.autoResolution.results.push(...results);
      applicationData.autoResolution.finalAction = finalAction;
      applicationData.autoResolution.processedAt = new Date().toISOString();
      applicationData.updatedAt = new Date().toISOString();

      // Save updated application
      await writeFile(applicationPath, JSON.stringify(applicationData, null, 2));
    } catch (error) {
      console.error('Error logging auto-resolution:', error);
    }
  }

  /**
   * Get auto-resolution statistics
   */
  async getAutoResolutionStats(): Promise<{
    totalRules: number;
    enabledRules: number;
    totalApplications: number;
    autoProcessed: number;
    autoApproved: number;
    autoRejected: number;
    flaggedForReview: number;
    ruleUsage: Array<{
      ruleId: string;
      ruleName: string;
      usageCount: number;
      lastUsed: string;
    }>;
  }> {
    const stats = {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(rule => rule.enabled).length,
      totalApplications: 0,
      autoProcessed: 0,
      autoApproved: 0,
      autoRejected: 0,
      flaggedForReview: 0,
      ruleUsage: this.rules.map(rule => ({
        ruleId: rule.id,
        ruleName: rule.name,
        usageCount: rule.usageCount,
        lastUsed: rule.lastUsed || 'Never'
      }))
    };

    // Count applications and auto-resolution results
    if (existsSync(this.registryDir)) {
      const fs = await import('fs');
      const files = fs.readdirSync(this.registryDir);
      
      for (const filename of files) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(this.registryDir, filename);
            const applicationData = JSON.parse(await readFile(filePath, 'utf-8'));
            
            stats.totalApplications++;
            
            if (applicationData.autoResolution?.results?.length > 0) {
              stats.autoProcessed++;
              
              switch (applicationData.autoResolution.finalAction) {
                case 'proceed':
                  stats.autoApproved++;
                  break;
                case 'block':
                  stats.autoRejected++;
                  break;
                case 'flag_for_review':
                  stats.flaggedForReview++;
                  break;
              }
            }
          } catch (error) {
            console.error(`Error reading application file ${filename}:`, error);
          }
        }
      }
    }

    return stats;
  }

  /**
   * Create a new auto-resolution rule
   */
  createRule(rule: Omit<AutoResolutionRule, 'id' | 'createdAt' | 'usageCount'>): AutoResolutionRule {
    const newRule: AutoResolutionRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    this.rules.push(newRule);
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<AutoResolutionRule>): boolean {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return false;
    }

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): boolean {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return false;
    }

    this.rules.splice(ruleIndex, 1);
    return true;
  }

  /**
   * Get all rules
   */
  getRules(): AutoResolutionRule[] {
    return [...this.rules];
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }
}

