import { Pool } from 'pg';
import {
  CreateFlagInput,
  FlagConfig,
  FlagRepository,
  RolloutConfig,
  TargetingRule,
} from '../types';

interface FlagRow {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  default_value: boolean;
  rules: TargetingRule[];
  rollout: RolloutConfig | null;
  created_at: Date;
  updated_at: Date;
}

function rowToFlagConfig(row: FlagRow): FlagConfig {
  return {
    id: row.id,
    key: row.key,
    description: row.description,
    enabled: row.enabled,
    defaultValue: row.default_value,
    rules: row.rules,
    rollout: row.rollout,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgFlagStore implements FlagRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateFlagInput): Promise<FlagConfig> {
    try {
      const result = await this.pool.query<FlagRow>(
        `INSERT INTO flags (key, description, default_value)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [input.key, input.description ?? '', input.defaultValue ?? false]
      );
      return rowToFlagConfig(result.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new Error(`Flag with key "${input.key}" already exists`, { cause: err });
      }
      throw err;
    }
  }

  async getById(id: string): Promise<FlagConfig | undefined> {
    try {
      const result = await this.pool.query<FlagRow>('SELECT * FROM flags WHERE id = $1', [id]);
      return result.rows[0] ? rowToFlagConfig(result.rows[0]) : undefined;
    } catch (err) {
      if ((err as { code?: string }).code === '22P02') {
        return undefined;
      }
      throw err;
    }
  }

  async getByKey(key: string): Promise<FlagConfig | undefined> {
    const result = await this.pool.query<FlagRow>('SELECT * FROM flags WHERE key = $1', [key]);
    return result.rows[0] ? rowToFlagConfig(result.rows[0]) : undefined;
  }

  async getAll(): Promise<FlagConfig[]> {
    const result = await this.pool.query<FlagRow>('SELECT * FROM flags ORDER BY created_at');
    return result.rows.map(rowToFlagConfig);
  }

  async update(
    id: string,
    changes: Partial<Pick<FlagConfig, 'description' | 'enabled' | 'defaultValue'>>
  ): Promise<FlagConfig> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Flag with id "${id}" not found`);
    }

    const merged = { ...existing, ...changes };
    const result = await this.pool.query<FlagRow>(
      `UPDATE flags SET description = $1, enabled = $2, default_value = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [merged.description, merged.enabled, merged.defaultValue, id]
    );
    return rowToFlagConfig(result.rows[0]);
  }

  async setRules(id: string, rules: TargetingRule[]): Promise<FlagConfig> {
    const result = await this.pool.query<FlagRow>(
      `UPDATE flags SET rules = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [JSON.stringify(rules), id]
    );
    if (!result.rows[0]) {
      throw new Error(`Flag with id "${id}" not found`);
    }
    return rowToFlagConfig(result.rows[0]);
  }

  async setRollout(id: string, rollout: RolloutConfig | null): Promise<FlagConfig> {
    const result = await this.pool.query<FlagRow>(
      `UPDATE flags SET rollout = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [rollout ? JSON.stringify(rollout) : null, id]
    );
    if (!result.rows[0]) {
      throw new Error(`Flag with id "${id}" not found`);
    }
    return rowToFlagConfig(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM flags WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
