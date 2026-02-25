export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  cleaned?: string;
}

import i18n from '../../config/i18n';

export const cleanUsername = (username: string): string => {
  return username.replace(/^@+/, '');
};

export const validateTikTokUsername = (username: string): UsernameValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: i18n.t('validation.usernameRequired', 'El nombre de usuario es requerido') };
  }

  const cleaned = username.trim().replace(/^@+/, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: i18n.t('validation.usernameEmpty', 'El nombre de usuario no puede estar vacío') };
  }

  if (cleaned.length < 2 || cleaned.length > 24) {
    return {
      isValid: false,
      error: i18n.t('validation.usernameLength', 'El nombre de usuario debe tener entre 2 y 24 caracteres')
    };
  }

  const validUsernameRegex = /^[a-zA-Z0-9._]+$/;
  if (!validUsernameRegex.test(cleaned)) {
    return {
      isValid: false,
      error: i18n.t('validation.usernameFormat', 'Solo se permiten letras, números, puntos y guiones bajos')
    };
  }

  return { isValid: true, cleaned };
};