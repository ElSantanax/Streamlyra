/**
 * Validadores de username
 */

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  cleaned?: string;
}

/**
 * Limpia el username removiendo el símbolo @ inicial
 */
export const cleanUsername = (username: string): string => {
  return username.replace(/^@+/, '');
};

/**
 * Valida un username de TikTok según las reglas oficiales de la plataforma
 * 
 * Reglas de TikTok:
 * - Solo letras latinas (a-z, A-Z), números (0-9), puntos (.) y guiones bajos (_)
 * - Longitud entre 2 y 24 caracteres
 * - No permite espacios, emojis, ni caracteres Unicode
 * 
 * @param username - El username a validar (puede incluir @ al inicio)
 * @returns Objeto con resultado de validación y username limpio si es válido
 */
export const validateTikTokUsername = (username: string): UsernameValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'El nombre de usuario es requerido' };
  }

  const cleaned = username.trim().replace(/^@+/, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: 'El nombre de usuario no puede estar vacío' };
  }

  if (cleaned.length < 2 || cleaned.length > 24) {
    return { 
      isValid: false, 
      error: 'El nombre de usuario debe tener entre 2 y 24 caracteres' 
    };
  }

  // TikTok solo permite letras latinas, números, puntos y guiones bajos
  const validUsernameRegex = /^[a-zA-Z0-9._]+$/;
  if (!validUsernameRegex.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Solo se permiten letras, números, puntos y guiones bajos' 
    };
  }

  return { isValid: true, cleaned };
};
