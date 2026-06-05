/**
 * Returns the preferred display name for an employee.
 * Priority: callingName → firstName + lastName fallback → 'Unknown'
 */
export function getDisplayName(user: {
  callingName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined): string {
  if (!user) return 'Unknown';
  if (user.callingName) return user.callingName;
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || 'Unknown';
}
