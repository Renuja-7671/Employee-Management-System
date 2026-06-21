/**
 * Returns the preferred display name for an employee.
 * Priority: callingName → fullName → firstName + lastName → employeeId → 'Unknown'
 */
export function getDisplayName(user: {
  callingName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  employeeId?: string | null;
} | null | undefined): string {
  if (!user) return 'Unknown';
  if (user.callingName?.trim()) return user.callingName.trim();
  if (user.fullName?.trim()) return user.fullName.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (full) return full;
  if (user.employeeId) return user.employeeId;
  return 'Unknown';
}

/**
 * Cover employee label from Leave.coverEmployeeId → User.callingName
 */
export function getCoverEmployeeCallingName(
  coverEmployeeId: string | null | undefined,
  user: { callingName?: string | null } | null | undefined
): string {
  if (!coverEmployeeId) return '—';
  const callingName = user?.callingName?.trim();
  return callingName || '—';
}
