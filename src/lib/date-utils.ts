/**
 * Utility functions for date calculations
 */

/**
 * Add one month to a date, handling edge cases:
 * - 31 Jan → 28/29 Feb (tahun kabisat)
 * - 31 Mar → 30 Apr
 * - 31 May → 30 Jun
 * - 31 Jul → 31 Aug (normal)
 * - 31 Aug → 30 Sep
 * - 31 Oct → 30 Nov
 * - 31 Dec → 31 Jan (tahun berikutnya)
 * 
 * @param date - Base date
 * @returns New date with one month added, same day of month (adjusted for edge cases)
 * 
 * @example
 * addOneMonth(new Date('2025-12-07')) // Returns 2026-01-07
 * addOneMonth(new Date('2025-01-31')) // Returns 2025-02-28 (or 29 if leap year)
 * addOneMonth(new Date('2025-03-31')) // Returns 2025-04-30
 */
export function addOneMonth(date: Date): Date {
    const result = new Date(date);
    const originalDay = result.getDate();
    
    // Add one month
    result.setMonth(result.getMonth() + 1);
    
    // Check if the day overflowed (e.g., Jan 31 → Feb 31 becomes Mar 3)
    // If so, we need to adjust to the last day of the target month
    if (result.getDate() !== originalDay) {
        // Day overflowed, meaning the target month doesn't have enough days
        // Set to the last day of the target month
        result.setDate(0); // Go to last day of previous month (which is our target month)
    }
    
    return result;
}

/**
 * Add months to a date, handling edge cases
 * 
 * @param date - Base date
 * @param months - Number of months to add
 * @returns New date with months added
 * 
 * @example
 * addMonths(new Date('2025-12-07'), 1) // Returns 2026-01-07
 * addMonths(new Date('2025-01-31'), 1) // Returns 2025-02-28 (or 29 if leap year)
 */
export function addMonths(date: Date, months: number): Date {
    let result = new Date(date);
    
    for (let i = 0; i < months; i++) {
        result = addOneMonth(result);
    }
    
    return result;
}

/**
 * Check if a year is a leap year
 * 
 * @param year - Year to check
 * @returns True if leap year, false otherwise
 */
export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Get the last day of a month
 * 
 * @param year - Year
 * @param month - Month (0-11, where 0 = January)
 * @returns Last day of the month (28-31)
 */
export function getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

