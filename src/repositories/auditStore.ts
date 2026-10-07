import { Pool } from 'pg';

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

interface AuditRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: Date;
}

function rowToEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    changes: row.changes,
    createdAt: row.created_at.toISOString(),
  };
}

export class AuditStore {
  private ready = false;

  constructor(private pool: Pool) {}

  async ensureTable(): Promise<void> {
    if (this.ready) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changes JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`
      );
      this.ready = true;
    } catch {
      console.warn('[AuditStore] Failed to create audit_log table, audit logging disabled');
    }
  }

  async log(entry: {
    entityType: string;
    entityId: string;
    action: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.ensureTable();
      await this.pool.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, changes) VALUES ($1, $2, $3, $4)`,
        [entry.entityType, entry.entityId, entry.action, JSON.stringify(entry.changes)]
      );
    } catch {
      console.warn('[AuditStore] Failed to log audit entry, continuing');
    }
  }

  async getByEntity(entityType: string, entityId: string): Promise<AuditEntry[]> {
    try {
      await this.ensureTable();
      const result = await this.pool.query<AuditRow>(
        `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
        [entityType, entityId]
      );
      return result.rows.map(rowToEntry);
    } catch {
      return [];
    }
  }

  async getAll(limit: number = 50): Promise<AuditEntry[]> {
    try {
      await this.ensureTable();
      const result = await this.pool.query<AuditRow>(
        `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(rowToEntry);
    } catch {
      return [];
    }
  }
}
