import { Pool } from 'pg';

export interface ExposureInput {
  flagKey: string;
  userId: string;
  value: boolean;
}

export interface OutcomeInput {
  userId: string;
  eventName: string;
}

export interface VariantStats {
  variant: boolean;
  exposures: number;
  conversions: number;
  conversionRate: number;
}

export interface FlagStats {
  flagKey: string;
  eventName: string;
  variants: VariantStats[];
}

export class ExperimentStore {
  constructor(private pool: Pool) {}

  async logExposure(input: ExposureInput): Promise<void> {
    await this.pool.query(`INSERT INTO exposures (flag_key, user_id, value) VALUES ($1, $2, $3)`, [
      input.flagKey,
      input.userId,
      input.value,
    ]);
  }

  async logOutcome(input: OutcomeInput): Promise<void> {
    await this.pool.query(`INSERT INTO outcomes (user_id, event_name) VALUES ($1, $2)`, [
      input.userId,
      input.eventName,
    ]);
  }

  async getStats(flagKey: string, eventName: string): Promise<FlagStats> {
    const result = await this.pool.query<{
      value: boolean;
      exposures: string;
      conversions: string;
    }>(
      `
      SELECT
        e.value,
        COUNT(DISTINCT e.user_id) AS exposures,
        COUNT(DISTINCT o.user_id) AS conversions
      FROM exposures e
      LEFT JOIN outcomes o
        ON o.user_id = e.user_id
        AND o.event_name = $2
        AND o.created_at >= e.created_at
      WHERE e.flag_key = $1
      GROUP BY e.value
      `,
      [flagKey, eventName]
    );

    const variants: VariantStats[] = result.rows.map((row) => {
      const exposures = parseInt(row.exposures, 10);
      const conversions = parseInt(row.conversions, 10);
      return {
        variant: row.value,
        exposures,
        conversions,
        conversionRate: exposures > 0 ? conversions / exposures : 0,
      };
    });

    return { flagKey, eventName, variants };
  }
}
