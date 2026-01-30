/**
 * Validadores de username
 */

export const cleanUsername = (username: string): string => {
  return username.replace(/^@+/, '');
};
