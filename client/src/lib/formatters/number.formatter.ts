/**
 * Formateadores de números
 */

export const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

export const formatViewers = (count: number | undefined): string => {
  if (count === undefined) return '0';
  return formatNumber(count);
};
