export const formatLocalTime = (dateStr: string): string => {
  if (!dateStr) return '';

  if (dateStr.length <= 8 && dateStr.includes(':')) {
    return dateStr;
  }

  try {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return dateStr;
  }
};