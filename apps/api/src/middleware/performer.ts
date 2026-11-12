import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { Role } from '@prisma/client';

export interface VerifiedPerformer {
  id: string;
  fullName: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      performer?: VerifiedPerformer;
    }
  }
}

export async function verifyPerformerAttribution(req: Request, res: Response, next: NextFunction) {
  const { performerEmployeeId, performerPin } = req.body;

  if (!performerEmployeeId || typeof performerEmployeeId !== 'string') {
    return res.status(400).json({ error: 'يجب اختيار الموظف المنفذ للعملية' });
  }

  if (!performerPin || typeof performerPin !== 'string') {
    return res.status(400).json({ error: 'يجب إدخال الرمز السري (PIN) للموظف المنفذ' });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: performerEmployeeId },
    select: { id: true, fullName: true, role: true, isActive: true, pinHash: true },
  });

  if (!employee) {
    return res.status(404).json({ error: 'الموظف المنفذ المحدد غير موجود' });
  }

  if (!employee.isActive) {
    return res.status(403).json({ error: 'حساب الموظف المنفذ المحدد معطل حالياً' });
  }

  const isPinValid = await bcrypt.compare(performerPin, employee.pinHash);
  if (!isPinValid) {
    return res.status(401).json({ error: 'الرمز السري (PIN) للموظف غير صحيح' });
  }

  req.performer = {
    id: employee.id,
    fullName: employee.fullName,
    role: employee.role,
  };

  return next();
}
