/**
 * Formats minutes into a human-readable time string.
 * @param minutes - The number of minutes to format
 * @returns Formatted string (e.g., "1h 30m", "45m", "2h")
 */
export function formatMinutesToTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Parses a time string or number into minutes.
 * @param value - String or number to parse
 * @returns Number of minutes, or 0 if invalid
 */
export function parseMinutes(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, Math.round(value));
  
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}
