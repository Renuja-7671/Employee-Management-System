// src/lib/leave-probation-utils.ts
// Utility functions for managing leave balances based on probation status

/**
 * Calculate annual leave entitlement based on when an employee becomes permanent
 * @param confirmationDate - The date when isProbation changed from true to false
 * @returns Object with annual leaves for next year and effective year
 */
export function calculateAnnualLeavesForConfirmedEmployee(confirmationDate: Date): {
  annualLeavesForNextYear: number;
  effectiveYear: number;
} {
  const month = confirmationDate.getMonth(); // 0-indexed (0 = January, 11 = December)
  const year = confirmationDate.getFullYear();
  
  let annualLeavesForNextYear = 0;

  // Q1: January (0) - March (2)
  if (month >= 0 && month <= 2) {
    annualLeavesForNextYear = 14;
  }
  // Q2: April (3) - June (5)
  else if (month >= 3 && month <= 5) {
    annualLeavesForNextYear = 10;
  }
  // Q3: July (6) - September (8)
  else if (month >= 6 && month <= 8) {
    annualLeavesForNextYear = 7;
  }
  // Q4: October (9) - December (11)
  else if (month >= 9 && month <= 11) {
    annualLeavesForNextYear = 4;
  }

  return {
    annualLeavesForNextYear,
    effectiveYear: year + 1, // Leaves are for the next year
  };
}

/**
 * Get the leave balance for an employee based on their probation status
 * @param isProbation - Whether the employee is on probation
 * @param year - The year for the leave balance
 * @param confirmationDate - Optional: Date when employee was confirmed (isProbation changed to false)
 * @returns Leave balance object
 */
export function getLeaveBalanceForEmployee(
  isProbation: boolean,
  year: number,
  confirmationDate?: Date | null
): {
  annual: number;
  casual: number;
  medical: number;
  official: number;
} {
  // Probation employees: No annual leaves, but have other leaves
  if (isProbation) {
    return {
      annual: 0,
      casual: 7,
      medical: 7,
      official: 0,
    };
  }

  // Confirmed employees
  // If no confirmation date, treat as normal confirmed employee
  if (!confirmationDate) {
    return {
      annual: 14,
      casual: 7,
      medical: 7,
      official: 0,
    };
  }

  const confirmYear = confirmationDate.getFullYear();
  
  // If this is the year they were confirmed, they get 0 annual leaves this year
  if (year === confirmYear) {
    return {
      annual: 0,
      casual: 7,
      medical: 7,
      official: 0,
    };
  }
  
  // If this is the year after confirmation, calculate based on confirmation quarter
  if (year === confirmYear + 1) {
    const { annualLeavesForNextYear } = calculateAnnualLeavesForConfirmedEmployee(confirmationDate);
    return {
      annual: annualLeavesForNextYear,
      casual: 7,
      medical: 7,
      official: 0,
    };
  }
  
  // For years after the next year, normal leave balance
  if (year > confirmYear + 1) {
    return {
      annual: 14,
      casual: 7,
      medical: 7,
      official: 0,
    };
  }

  // Default fallback (shouldn't reach here in normal flow)
  return {
    annual: 14,
    casual: 7,
    medical: 7,
    official: 0,
  };
}

/**
 * Check if an employee can apply for a specific leave type
 * @param isProbation - Whether the employee is on probation
 * @param leaveType - Type of leave being applied for
 * @returns Object with canApply boolean and optional message
 */
export function canApplyForLeaveType(
  isProbation: boolean,
  leaveType: string
): {
  canApply: boolean;
  message?: string;
} {
  const leaveTypeUpper = leaveType.toUpperCase();

  // Probation employees cannot apply for annual leave
  if (isProbation && leaveTypeUpper === 'ANNUAL') {
    return {
      canApply: false,
      message: 'Employees on probation cannot apply for annual leave. You can apply for casual, medical, or official leave.',
    };
  }

  // All other leave types are allowed
  return {
    canApply: true,
  };
}

/**
 * Track when an employee's probation status changes
 * This should be called when isProbation is updated from true to false
 */
export interface ProbationStatusChange {
  employeeId: string;
  previousStatus: boolean;
  newStatus: boolean;
  changedAt: Date;
}

/**
 * Log probation status change for future reference
 * In a production system, you might want to store this in a database table
 */
export function logProbationStatusChange(change: ProbationStatusChange): void {
  console.log('[PROBATION] Status change:', {
    employeeId: change.employeeId,
    from: change.previousStatus ? 'Probation' : 'Confirmed',
    to: change.newStatus ? 'Probation' : 'Confirmed',
    changedAt: change.changedAt.toISOString(),
  });
  
  if (change.previousStatus && !change.newStatus) {
    const { annualLeavesForNextYear, effectiveYear } = calculateAnnualLeavesForConfirmedEmployee(change.changedAt);
    console.log('[PROBATION] Employee confirmed:', {
      employeeId: change.employeeId,
      confirmationDate: change.changedAt.toISOString().split('T')[0],
      annualLeavesForNextYear,
      effectiveYear,
    });
  }
}
