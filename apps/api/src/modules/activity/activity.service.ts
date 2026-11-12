import { prisma } from '../../prisma/client';
import { broadcastEvent } from '../../realtime/socket';

export interface LogActionParams {
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  authenticatedUserId: string;
  performerEmployeeId: string;
  notes?: string;
}

export async function logActivity(params: LogActionParams) {
  try {
    const record = await prisma.activityLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : undefined,
        newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : undefined,
        authenticatedUserId: params.authenticatedUserId,
        performerEmployeeId: params.performerEmployeeId,
        notes: params.notes,
      },
      include: {
        authenticatedUser: { select: { fullName: true, username: true } },
        performerEmployee: { select: { fullName: true, role: true } },
      },
    });

    broadcastEvent('activity:new', record);
    broadcastEvent('stats:updated');

    return record;
  } catch (error) {
    console.error('Failed to write activity log:', error);
    return null;
  }
}
