/**
 * Tests para validadores de username
 */

import { validateTikTokUsername, cleanUsername } from '../username.validator';

describe('cleanUsername', () => {
  it('should remove @ symbol from the beginning', () => {
    expect(cleanUsername('@usuario')).toBe('usuario');
    expect(cleanUsername('@@usuario')).toBe('usuario');
    expect(cleanUsername('@@@usuario')).toBe('usuario');
  });

  it('should not remove @ from the middle or end', () => {
    expect(cleanUsername('user@name')).toBe('user@name');
    expect(cleanUsername('username@')).toBe('username@');
  });

  it('should return empty string if only @ symbols', () => {
    expect(cleanUsername('@')).toBe('');
    expect(cleanUsername('@@')).toBe('');
  });
});

describe('validateTikTokUsername', () => {
  describe('valid usernames', () => {
    it('should accept valid usernames with letters and numbers', () => {
      const result = validateTikTokUsername('usuario123');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('usuario123');
      expect(result.error).toBeUndefined();
    });

    it('should accept usernames with @ prefix', () => {
      const result = validateTikTokUsername('@usuario123');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('usuario123');
    });

    it('should accept usernames with dots', () => {
      const result = validateTikTokUsername('user.name');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('user.name');
    });

    it('should accept usernames with underscores', () => {
      const result = validateTikTokUsername('user_name');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('user_name');
    });

    it('should accept usernames with mixed valid characters', () => {
      const result = validateTikTokUsername('user.name_123');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('user.name_123');
    });

    it('should accept minimum length username (2 characters)', () => {
      const result = validateTikTokUsername('ab');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('ab');
    });

    it('should accept maximum length username (24 characters)', () => {
      const result = validateTikTokUsername('a'.repeat(24));
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('a'.repeat(24));
    });
  });

  describe('invalid usernames - empty or null', () => {
    it('should reject empty string', () => {
      const result = validateTikTokUsername('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario es requerido');
    });

    it('should reject only spaces', () => {
      const result = validateTikTokUsername('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario no puede estar vacío');
    });

    it('should reject only @ symbols', () => {
      const result = validateTikTokUsername('@@@');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario no puede estar vacío');
    });
  });

  describe('invalid usernames - length', () => {
    it('should reject username with 1 character', () => {
      const result = validateTikTokUsername('a');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario debe tener entre 2 y 24 caracteres');
    });

    it('should reject username with 25 characters', () => {
      const result = validateTikTokUsername('a'.repeat(25));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario debe tener entre 2 y 24 caracteres');
    });

    it('should reject username with 30 characters', () => {
      const result = validateTikTokUsername('a'.repeat(30));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('El nombre de usuario debe tener entre 2 y 24 caracteres');
    });
  });

  describe('invalid usernames - special characters', () => {
    it('should reject username with spaces', () => {
      const result = validateTikTokUsername('user name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with hyphens', () => {
      const result = validateTikTokUsername('user-name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with special characters', () => {
      const specialChars = ['!', '#', '$', '%', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '?', '/'];
      
      specialChars.forEach(char => {
        const result = validateTikTokUsername(`user${char}name`);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
      });
    });

    it('should reject username with emojis', () => {
      const result = validateTikTokUsername('user😀name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });
  });

  describe('invalid usernames - unicode characters', () => {
    it('should reject username with Chinese characters', () => {
      const result = validateTikTokUsername('用户名');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with Japanese characters', () => {
      const result = validateTikTokUsername('ユーザー');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with Korean characters', () => {
      const result = validateTikTokUsername('사용자');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with Arabic characters', () => {
      const result = validateTikTokUsername('مستخدم');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with Cyrillic characters', () => {
      const result = validateTikTokUsername('пользователь');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });

    it('should reject username with accented characters', () => {
      const result = validateTikTokUsername('usuário');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Solo se permiten letras, números, puntos y guiones bajos');
    });
  });

  describe('edge cases', () => {
    it('should handle username with leading/trailing spaces', () => {
      const result = validateTikTokUsername('  usuario123  ');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('usuario123');
    });

    it('should handle username with multiple @ symbols', () => {
      const result = validateTikTokUsername('@@@@usuario123');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('usuario123');
    });

    it('should handle mixed case usernames', () => {
      const result = validateTikTokUsername('UserName123');
      expect(result.isValid).toBe(true);
      expect(result.cleaned).toBe('UserName123');
    });
  });
});
