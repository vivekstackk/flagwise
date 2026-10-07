import { createHash } from 'crypto';
import { FlagConfig, Segment, SegmentCondition, TargetingRule, UserContext } from '../types';

export function evaluateFlag(
  flag: FlagConfig,
  user: UserContext,
  segments: Map<string, Segment> = new Map()
): boolean {
  if (!flag.enabled) {
    return flag.defaultValue;
  }

  const matchedRule = flag.rules.find((rule) => matchesRule(rule, user, segments));
  if (matchedRule) {
    return matchedRule.serveValue;
  }

  if (flag.rollout) {
    return evaluateRollout(flag, flag.rollout, user);
  }

  return flag.defaultValue;
}

function matchesRule(
  rule: TargetingRule,
  user: UserContext,
  segments: Map<string, Segment>
): boolean {
  if (rule.operator === 'inSegment') {
    const segmentName = rule.value as string;
    const segment = segments.get(segmentName);
    if (!segment) return false;
    return segment.conditions.every((condition) => matchesCondition(condition, user));
  }

  const actual = user.attributes?.[rule.attribute];
  if (actual === undefined) return false;

  switch (rule.operator) {
    case 'equals':
      return actual === rule.value;
    case 'notEquals':
      return actual !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(actual as string | number);
    case 'contains':
      return (
        typeof actual === 'string' && typeof rule.value === 'string' && actual.includes(rule.value)
      );
    default:
      return false;
  }
}

function matchesCondition(condition: SegmentCondition, user: UserContext): boolean {
  const actual = user.attributes?.[condition.attribute];
  if (actual === undefined) return false;

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'notEquals':
      return actual !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual as string | number);
    case 'contains':
      return (
        typeof actual === 'string' &&
        typeof condition.value === 'string' &&
        actual.includes(condition.value)
      );
    default:
      return false;
  }
}

function evaluateRollout(
  flag: FlagConfig,
  rollout: { percentage: number; serveValue: boolean },
  user: UserContext
): boolean {
  const bucket = bucketFor(flag.key, user.userId);
  return bucket < rollout.percentage ? rollout.serveValue : flag.defaultValue;
}

export function bucketFor(flagKey: string, userId: string): number {
  const hash = createHash('sha256').update(`${flagKey}:${userId}`).digest('hex');
  const intValue = parseInt(hash.slice(0, 8), 16);
  return (intValue % 10000) / 100;
}
