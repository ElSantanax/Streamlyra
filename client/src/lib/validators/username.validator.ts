/**
 * Validadores de username
 */

export const cleanUsername = (username: string): string => {
  return username.replace(/^@+/, '');
};

export const isValidUsername = (username: string): boolean => {
  if (!username || username.trim().length === 0) return false;
  
  const cleaned = cleanUsername(username);
  return cleaned.length >= 3 && cleaned.length <= 25;
};
