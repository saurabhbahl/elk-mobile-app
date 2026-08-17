/**
 * dateUtils.ts
 *
 * Robust multi-format date parser for CMS event & program date strings.
 * Handles ISO 8601, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, and text dates safely.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Parses a date string into a Date object. Supports multiple common formats.
 */
export function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const clean = dateStr.replace(/\s+at\s+/i, ' ').trim();
  if (!clean) return null;

  // 1. Standard ISO / native parseable date
  const nativeDate = new Date(clean);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  // 2. Format: DD/MM/YYYY HH:MM am/pm or MM/DD/YYYY HH:MM am/pm
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

  // 3. Format: 20 July 2026 or July 20, 2026
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
