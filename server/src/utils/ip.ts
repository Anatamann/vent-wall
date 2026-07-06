import crypto from 'crypto'
import type { Request } from 'express'

function getIpHashSecret(): string {
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('IP_HASH_SECRET or JWT_SECRET must be set')
  }
  return secret
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim()
  }
  return req.socket.remoteAddress || req.ip || 'unknown'
}

export function hashIp(ip: string): string {
  return crypto.createHmac('sha256', getIpHashSecret()).update(ip).digest('hex')
}

export function hashClientIp(req: Request): string {
  return hashIp(getClientIp(req))
}