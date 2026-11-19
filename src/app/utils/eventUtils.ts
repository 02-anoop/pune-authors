export const parseEventDate = (dateVal: string | Date | null | undefined): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Try standard parse
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Try replacing '-' with '/' or spaces
  d = new Date(str.replace(/-/g, '/'));
  if (!isNaN(d.getTime())) return d;

  // Check DD-MM-YYYY or DD/MM/YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

export const checkIsPastEvent = (eventDate: string | Date | null | undefined, duration?: string | null) => {
  if (!eventDate) return false;
  const startDate = parseEventDate(eventDate);
  if (!startDate) return false;

  let totalDays = 1;

  if (duration) {
    const daysMatch = String(duration).match(/(\d+)\s*Days?/i);
    const hoursMatch = String(duration).match(/(\d+)\s*Hours?/i);

    let days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
    let hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;

    if (days === 0 && hours > 0) {
      totalDays = 1;
    } else if (days > 0) {
      totalDays = days;
    }
  }

  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + (totalDays - 1));
  endDate.setHours(23, 59, 59, 999);

  return Date.now() > endDate.getTime();
};

export const isEventLiveToday = (eventDate: string | Date | null | undefined, duration?: string | null): boolean => {
  if (!eventDate) return false;
  const startDate = parseEventDate(eventDate);
  if (!startDate) return false;

  startDate.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let totalDays = 1;
  if (duration) {
    const daysMatch = String(duration).match(/(\d+)\s*Days?/i);
    const hoursMatch = String(duration).match(/(\d+)\s*Hours?/i);

    let days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
    let hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;

    if (days === 0 && hours > 0) {
      totalDays = 1;
    } else if (days > 0) {
      totalDays = days;
    }
  }

  const endDate = new Date(startDate.getTime());
  endDate.setDate(endDate.getDate() + (totalDays - 1));
  endDate.setHours(23, 59, 59, 999);

  return now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
};

