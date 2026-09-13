import { WSMessage } from '@aircursor/shared';

export interface ValidationResult {
  valid: boolean;
  message?: WSMessage;
  error?: string;
}

const MAX_PAYLOAD_BYTES = 4096; // 4KB maximum payload limit

export function validateIncomingWSMessage(data: Buffer | string): ValidationResult {
  if (data.length > MAX_PAYLOAD_BYTES) {
    return { valid: false, error: 'Payload size exceeds 4KB limit' };
  }

  try {
    const parsed = JSON.parse(data.toString());
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      return { valid: false, error: 'Malformed message: missing or invalid type property' };
    }

    const type = parsed.type;
    const validTypes = [
      'create_session',
      'join_session',
      'motion',
      'click',
      'double_click',
      'right_click',
      'scroll',
      'ping',
      'disconnect',
    ];

    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid message type: ${type}` };
    }

    // Motion numeric validation
    if (type === 'motion') {
      if (typeof parsed.dx !== 'number' || typeof parsed.dy !== 'number' || !isFinite(parsed.dx) || !isFinite(parsed.dy)) {
        return { valid: false, error: 'Invalid motion dx/dy coordinates' };
      }
      // Clamp extreme coordinate values to prevent overflow attacks
      parsed.dx = Math.min(Math.max(-200, parsed.dx), 200);
      parsed.dy = Math.min(Math.max(-200, parsed.dy), 200);
    }

    // Scroll validation
    if (type === 'scroll') {
      if (typeof parsed.dy !== 'number' || !isFinite(parsed.dy)) {
        return { valid: false, error: 'Invalid scroll dy value' };
      }
      parsed.dy = Math.min(Math.max(-500, parsed.dy), 500);
    }

    // Join session code validation
    if (type === 'join_session') {
      if (typeof parsed.sessionCode !== 'string' || parsed.sessionCode.length > 20) {
        return { valid: false, error: 'Invalid session code format' };
      }
      parsed.sessionCode = parsed.sessionCode.trim().toUpperCase();
    }

    return { valid: true, message: parsed as WSMessage };
  } catch (err) {
    return { valid: false, error: 'JSON parse error' };
  }
}

/**
 * Basic IP rate limiter for WS connections
 */
const ipConnectionCounts: Map<string, { count: number; resetAt: number }> = new Map();

export function isRateLimited(ip: string, limitPerMin = 40): boolean {
  const now = Date.now();
  const entry = ipConnectionCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipConnectionCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }

  if (entry.count >= limitPerMin) {
    return true;
  }

  entry.count++;
  return false;
}
