/**
 * Time Rounding Utility
 * 
 * Rules:
 * - Removed rounding logic. We now use direct clock-in and clock-out.
 */

/**
 * Get the actual login/logout time.
 * @param {Date|string|object} timestamp - The actual clock-in or clock-out time (Date, string, or Firestore Timestamp)
 * @returns {Date|null} - The actual time, or null if invalid
 */
export function getCalculatedTime(timestamp) {
  if (!timestamp) return null;

  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Format a time as HH:MM AM/PM string
 * @param {Date|string|object} timestamp 
 * @returns {string}
 */
export function formatTimeShort(timestamp) {
  if (!timestamp) return "--:--";
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Calculate session duration using actual times, matched perfectly to displayed minutes
 * @param {Date|string|object} clockIn 
 * @param {Date|string|object} clockOut 
 * @returns {number} minutes
 */
export function calcCalculatedMinutes(clockIn, clockOut) {
  const actualIn = getCalculatedTime(clockIn);
  if (!actualIn || !clockOut) return 0;

  let actualOut;
  if (clockOut?.toDate) {
    actualOut = clockOut.toDate();
  } else if (clockOut instanceof Date) {
    actualOut = new Date(clockOut);
  } else {
    actualOut = new Date(clockOut);
  }

  if (isNaN(actualOut.getTime())) return 0;

  // Clone dates to safely modify them
  const inExact = new Date(actualIn);
  const outExact = new Date(actualOut);

  // Zero out seconds and milliseconds so that the visual "hh:mm" display difference matches the actual calculation precisely
  inExact.setSeconds(0, 0);
  outExact.setSeconds(0, 0);

  const diff = Math.floor((outExact.getTime() - inExact.getTime()) / 60000);
  return Math.max(0, Math.min(diff, 1440));
}
