import { Pool } from 'pg';
import { CreateSegmentInput, Segment, SegmentCondition } from '../types';

interface SegmentRow {
  id: string;
  name: string;
  conditions: SegmentCondition[];
  created_at: Date;
  updated_at: Date;
}

function rowToSegment(row: SegmentRow): Segment {
  return {
    id: row.id,
    name: row.name,
    conditions: row.conditions,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class SegmentStore {
  constructor(private pool: Pool) {}

  async create(input: CreateSegmentInput): Promise<Segment> {
    try {
      const result = await this.pool.query<SegmentRow>(
        `INSERT INTO segments (name, conditions) VALUES ($1, $2) RETURNING *`,
        [input.name, JSON.stringify(input.conditions)]
      );
      return rowToSegment(result.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new Error(`Segment with name "${input.name}" already exists`, { cause: err });
      }
      throw err;
    }
  }

  async getByName(name: string): Promise<Segment | undefined> {
    const result = await this.pool.query<SegmentRow>('SELECT * FROM segments WHERE name = $1', [
      name,
    ]);
    return result.rows[0] ? rowToSegment(result.rows[0]) : undefined;
  }

  async getAll(): Promise<Segment[]> {
    const result = await this.pool.query<SegmentRow>('SELECT * FROM segments ORDER BY created_at');
    return result.rows.map(rowToSegment);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.pool.query('DELETE FROM segments WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      if ((err as { code?: string }).code === '22P02') {
        return false;
      }
      throw err;
    }
  }

  async update(
    id: string,
    changes: Partial<Pick<Segment, 'name'> & { conditions: SegmentCondition[] }>
  ): Promise<Segment> {
    const existing = await this.pool.query<SegmentRow>('SELECT * FROM segments WHERE id = $1', [
      id,
    ]);
    if (!existing.rows[0]) {
      throw new Error(`Segment with id "${id}" not found`);
    }

    const current = rowToSegment(existing.rows[0]);
    const newName = changes.name ?? current.name;
    const newConditions = changes.conditions ?? current.conditions;

    const result = await this.pool.query<SegmentRow>(
      `UPDATE segments SET name = $1, conditions = $2, updated_at = now() WHERE id = $3 RETURNING *`,
      [newName, JSON.stringify(newConditions), id]
    );
    return rowToSegment(result.rows[0]);
  }
}
