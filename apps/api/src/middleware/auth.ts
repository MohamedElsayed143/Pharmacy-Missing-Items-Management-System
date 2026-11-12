import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-default-secret';

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; username: string };
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, fullName: true, role: true, isActive: true },
    });

    if (!employee || !employee.isActive) {
      return res.status(401).json({ error: 'حساب المستخدم غير نشط أو غير موجود' });
    }

    req.user = {
      id: employee.id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'رمز الجلسة غير صالح أو منتهي الصلاحية' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ليس لديك الصلاحية الكافية لإتمام هذه العملية' });
    }

    return next();
  };
}
