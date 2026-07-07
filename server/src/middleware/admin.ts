import type { Request, Response, NextFunction } from 'express'
import { isAdminUser } from '../config/admin.js'
import { requireAuth } from './auth.js'

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || !isAdminUser(req.user.userId)) {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}