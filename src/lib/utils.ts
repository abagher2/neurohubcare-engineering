export function getIsoDateString(dateInput: string | Date | undefined): string {
  if (!dateInput) return '2026-01-01';
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0];
  }
  const str = String(dateInput);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  return str.slice(0, 10);
}

export function formatDate(dateInput: string | Date): string {
  try {
    const dateString = getIsoDateString(dateInput);
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
    }
    return dateString;
  } catch (e) {
    return String(dateInput);
  }
}
