import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: string
  username: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const token = header.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}