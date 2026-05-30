import { createHmac } from 'node:crypto';
import { env } from '../../config/env';

export function hashNetworkValue(value?: string | null): string | null {
  if (!value) return null;
  return createHmac('sha256', env.AUTH_TOKEN_PEPPER).update(value).digest('hex');
}
