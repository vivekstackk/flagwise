import { randomUUID } from 'crypto';
import {
  CreateFlagInput,
  FlagConfig,
  FlagRepository,
  RolloutConfig,
  TargetingRule,
} from '../types';

export class FlagStore implements FlagRepository {
  private flags: Map<string, FlagConfig> = new Map();

  async create(input: CreateFlagInput): Promise<FlagConfig> {
    const existing = await this.getByKey(input.key);
    if (existing) {
      throw new Error(`Flag with key "${input.key}" already exists`);
    }

    const now = new Date().toISOString();
    const flag: FlagConfig = {
      id: randomUUID(),
      key: input.key,
      description: input.description ?? '',
      enabled: false,
      defaultValue: input.defaultValue ?? false,
      createdAt: now,
      updatedAt: now,
      rules: [],
      rollout: null,
    };

    this.flags.set(flag.id, flag);
    return flag;
  }

  async getById(id: string): Promise<FlagConfig | undefined> {
    return this.flags.get(id);
  }

  async getByKey(key: string): Promise<FlagConfig | undefined> {
    for (const flag of this.flags.values()) {
      if (flag.key === key) return flag;
    }
    return undefined;
  }

  async getAll(): Promise<FlagConfig[]> {
    return Array.from(this.flags.values());
  }

  async update(
    id: string,
    changes: Partial<Pick<FlagConfig, 'description' | 'enabled' | 'defaultValue'>>
  ): Promise<FlagConfig> {
    const flag = this.flags.get(id);
    if (!flag) {
      throw new Error(`Flag with id "${id}" not found`);
    }

    const updated: FlagConfig = { ...flag, ...changes, updatedAt: new Date().toISOString() };
    this.flags.set(id, updated);
    return updated;
  }

  async setRules(id: string, rules: TargetingRule[]): Promise<FlagConfig> {
    const flag = this.flags.get(id);
    if (!flag) {
      throw new Error(`Flag with id "${id}" not found`);
    }

    const updated: FlagConfig = { ...flag, rules, updatedAt: new Date().toISOString() };
    this.flags.set(id, updated);
    return updated;
  }

  async setRollout(id: string, rollout: RolloutConfig | null): Promise<FlagConfig> {
    const flag = this.flags.get(id);
    if (!flag) {
      throw new Error(`Flag with id "${id}" not found`);
    }

    const updated: FlagConfig = { ...flag, rollout, updatedAt: new Date().toISOString() };
    this.flags.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.flags.delete(id);
  }
}
