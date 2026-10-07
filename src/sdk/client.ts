import { EventSource } from 'eventsource';
import { evaluateFlag } from '../services/evaluation';
import { FlagConfig, UserContext } from '../types';

const POLL_INTERVAL_MS = 10000;

export interface FeatureFlagClientOptions {
  baseUrl: string;
}

export class FeatureFlagClient {
  private flags: Map<string, FlagConfig> = new Map();
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private baseUrl: string;

  constructor(options: FeatureFlagClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  async start(): Promise<void> {
    await this.fetchAllFlags();
    this.connectStream();
  }

  stop(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  evaluate(key: string, user: UserContext): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      return false;
    }
    return evaluateFlag(flag, user);
  }

  private async fetchAllFlags(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/flags`);
    const flags = (await response.json()) as FlagConfig[];
    this.flags = new Map(flags.map((flag) => [flag.key, flag]));
  }

  private async refetchFlag(key: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/flags`);
    const flags = (await response.json()) as FlagConfig[];
    const updated = flags.find((flag) => flag.key === key);
    if (updated) {
      this.flags.set(key, updated);
    }
  }

  private connectStream(): void {
    this.eventSource = new EventSource(`${this.baseUrl}/stream`);

    this.eventSource.onmessage = (event) => {
      const { key } = JSON.parse(event.data) as { key: string };
      this.refetchFlag(key);
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.startPolling();
    };
  }

  private startPolling(): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(async () => {
      try {
        await this.fetchAllFlags();
        this.tryReconnectStream();
      } catch {
        // Server unreachable this cycle; cached flags remain in effect, retry next interval.
      }
    }, POLL_INTERVAL_MS);
  }

  private tryReconnectStream(): void {
    if (this.eventSource) return;

    let testSource: EventSource;
    try {
      testSource = new EventSource(`${this.baseUrl}/stream`);
    } catch {
      return;
    }
    testSource.onopen = () => {
      testSource.close();
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.connectStream();
    };
    testSource.onerror = () => {
      testSource.close();
    };
  }
}
