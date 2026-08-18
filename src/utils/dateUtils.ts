/**
 * dateUtils.ts
 *
 * Robust multi-format date parser for CMS event & program date strings.
 * Handles ISO 8601, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, and text dates safely.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses a date string into a Date object. Supports multiple common formats.
 */
export function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const clean = dateStr.replace(/\s+at\s+/i, ' ').trim();
  if (!clean) return null;

  // 1. Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+T?\s*(.*))?$/i);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const timePart = (ymdMatch[4] || '').trim();

    let hours = 0;
    let mins = 0;
    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      mins = parseInt(timeMatch[2], 10);
      const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
      const isAM = timeMatch[3] && timeMatch[3].toLowerCase() === 'am';

      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
    }

    const d = new Date(year, month, day, hours, mins, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Standard ISO / native parseable date
  const nativeDate = new Date(clean);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  // 3. Format: DD/MM/YYYY HH:MM am/pm or MM/DD/YYYY HH:MM am/pm
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)/);
  if (slashMatch) {
    const part1 = parseInt(slashMatch[1], 10);
    const part2 = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    const timePart = slashMatch[4].trim();

    let day = part1;
    let month = part2 - 1;

    // Detect if part1 is month (e.g. 12/25/2026 where month > 12 is impossible)
    if (part1 > 12 && part2 <= 12) {
      day = part1;
      month = part2 - 1;
    } else if (part2 > 12 && part1 <= 12) {
      month = part1 - 1;
      day = part2;
    }

    let hours = 0;
    let mins = 0;
    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      mins = parseInt(timeMatch[2], 10);
      const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
      const isAM = timeMatch[3] && timeMatch[3].toLowerCase() === 'am';

      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
    }

    const d = new Date(year, month, day, hours, mins, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Format: 20 July 2026 or July 20, 2026
  const textMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?/) || clean.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?/);
  if (textMatch) {
    const isDayFirst = !isNaN(parseInt(textMatch[1], 10));
    const day = isDayFirst ? parseInt(textMatch[1], 10) : parseInt(textMatch[2], 10);
    const monthStr = (isDayFirst ? textMatch[2] : textMatch[1]).slice(0, 3).toUpperCase();
    const year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();

    const monthIdx = MONTHS.indexOf(monthStr);
    if (monthIdx !== -1) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Checks if a given date string represents a past timestamp.
 */
export function isDateExpired(dateStr: string | null | undefined): boolean {
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
}

/**
 * Extracts formatted month (3-letter uppercase) and day string for UI date badges.
 */
export function formatDateBadge(dateStr: string | null | undefined): { month: string; day: string } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const parsed = parseFlexibleDate(dateStr);
  if (parsed) {
    return {
      month: MONTHS[parsed.getMonth()],
      day: parsed.getDate().toString(),
    };
  }

  return null;
}

/**
 * Formats a program schedule date string into "July 5, 2026".
 * Preserves time/ranges or non-date schedule text if present.
 */
export function formatProgramScheduleDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const clean = dateStr.trim();
  if (!clean) return '';

  // Handle range if separated by ' - ' or ' to '
  if (clean.includes(' - ') || clean.toLowerCase().includes(' to ')) {
    const separator = clean.includes(' - ') ? ' - ' : (clean.includes(' To ') ? ' To ' : ' to ');
    const parts = clean.split(separator);
    if (parts.length === 2) {
      const formattedStart = formatProgramScheduleDate(parts[0]);
      const formattedEnd = formatProgramScheduleDate(parts[1]);
      if (formattedStart && formattedEnd && formattedStart !== parts[0] && formattedEnd !== parts[1]) {
        return `${formattedStart}${separator}${formattedEnd}`;
      }
    }
  }

  const parsed = parseFlexibleDate(clean);
  if (parsed) {
    const monthName = FULL_MONTHS[parsed.getMonth()];
    const day = parsed.getDate();
    const year = parsed.getFullYear();
    let formatted = `${monthName} ${day}, ${year}`;

    // Extract time if input string has time component (e.g. 10:00 AM)
    const timeMatch = clean.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
    if (timeMatch) {
      formatted += ` ${timeMatch[1]}`;
    }

    return formatted;
  }

  return clean;
}

