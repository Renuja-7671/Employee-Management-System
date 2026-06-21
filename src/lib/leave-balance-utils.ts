// src/lib/leave-balance-utils.ts
// Shared helpers for leave balance adjustments

import type { LeaveStatus, LeaveType } from '@prisma/client';

/**
 * Balance is deducted when a leave is applied (non-official types).
 * It is restored on decline/cancel — so delete should only restore
 * if the deduction was never reversed.
 */
export function shouldRestoreBalanceOnDelete(
  status: LeaveStatus,
  leaveType: LeaveType
): boolean {
  if (leaveType === 'OFFICIAL') return false;
  if (status === 'DECLINED' || status === 'CANCELLED') return false;
  return true;
}

export function leaveBalanceFieldForType(
  leaveType: LeaveType
): 'annual' | 'casual' | 'medical' | null {
  if (leaveType === 'ANNUAL') return 'annual';
  if (leaveType === 'CASUAL') return 'casual';
  if (leaveType === 'MEDICAL') return 'medical';
  return null;
}
