export interface Flag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlagInput {
  key: string;
  description?: string;
  defaultValue?: boolean;
}
export interface UserContext {
  userId: string;
  attributes?: Record<string, string | number | boolean>;
}

export type RuleOperator = 'equals' | 'notEquals' | 'in' | 'contains' | 'inSegment';

export interface TargetingRule {
  attribute: string;
  operator: RuleOperator;
  value: string | number | boolean | (string | number)[];
  serveValue: boolean;
}

export interface RolloutConfig {
  percentage: number;
  serveValue: boolean;
}

export interface FlagConfig extends Flag {
  rules: TargetingRule[];
  rollout: RolloutConfig | null;
}
export interface FlagRepository {
  create(input: CreateFlagInput): Promise<FlagConfig>;
  getById(id: string): Promise<FlagConfig | undefined>;
  getByKey(key: string): Promise<FlagConfig | undefined>;
  getAll(): Promise<FlagConfig[]>;
  update(
    id: string,
    changes: Partial<Pick<FlagConfig, 'description' | 'enabled' | 'defaultValue'>>
  ): Promise<FlagConfig>;
  setRules(id: string, rules: TargetingRule[]): Promise<FlagConfig>;
  setRollout(id: string, rollout: RolloutConfig | null): Promise<FlagConfig>;
  delete(id: string): Promise<boolean>;
}

export interface SegmentCondition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'in' | 'contains';
  value: string | number | boolean | (string | number)[];
}

export interface Segment {
  id: string;
  name: string;
  conditions: SegmentCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentInput {
  name: string;
  conditions: SegmentCondition[];
}
