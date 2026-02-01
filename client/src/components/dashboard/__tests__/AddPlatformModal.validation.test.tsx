/**
 * Tests de validación para AddPlatformModal
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddPlatformModal from '../AddPlatformModal';
import * as authService from '../../../api/services/auth.service';

// Mock del authService
vi.mock('../../../api/services/auth.service', () => ({
  authService: {
    connectTikTok: vi.fn()
  }
}));

// Mock de toast
vi.mock('../../../lib/notifications', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('AddPlatformModal - TikTok Username Validation', () => {
  const mockOnClose = vi.fn();
  const mockOnConnectionSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (connections = {}) => {
    return render(
      <AddPlatformModal
        isOpen={true}
        onClose={mockOnClose}
        connections={connections}
        onConnectionSuccess={mockOnConnectionSuccess}
      />
    );
  };

  describe('Valid usernames', () => {
    it('should accept valid username without @', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'usuario123' } });
      
      // No debería mostrar error
      await waitFor(() => {
        expect(screen.queryByText(/Solo se permiten/i)).not.toBeInTheDocument();
      });
    });

    it('should accept valid username with @', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: '@usuario123' } });
      
      // No debería mostrar error
      await waitFor(() => {
        expect(screen.queryByText(/Solo se permiten/i)).not.toBeInTheDocument();
      });
    });

    it('should accept username with dots and underscores', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'user.name_123' } });
      
      // No debería mostrar error
      await waitFor(() => {
        expect(screen.queryByText(/Solo se permiten/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Invalid usernames - show errors', () => {
    it('should show error for username too short', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'a' } });
      
      await waitFor(() => {
        expect(screen.getByText(/debe tener entre 2 y 24 caracteres/i)).toBeInTheDocument();
      });
    });

    it('should show error for username too long', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'a'.repeat(25) } });
      
      await waitFor(() => {
        expect(screen.getByText(/debe tener entre 2 y 24 caracteres/i)).toBeInTheDocument();
      });
    });

    it('should show error for username with spaces', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'user name' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Solo se permiten letras, números, puntos y guiones bajos/i)).toBeInTheDocument();
      });
    });

    it('should show error for username with special characters', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'user@name!' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Solo se permiten letras, números, puntos y guiones bajos/i)).toBeInTheDocument();
      });
    });

    it('should show error for username with emojis', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'user😀name' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Solo se permiten letras, números, puntos y guiones bajos/i)).toBeInTheDocument();
      });
    });

    it('should show error for username with Unicode characters', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: '用户名' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Solo se permiten letras, números, puntos y guiones bajos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Helper text', () => {
    it('should show helper text when no error', async () => {
      renderModal();
      
      await waitFor(() => {
        expect(screen.getByText(/Usa tu @usuario \(no tu nombre visible\)/i)).toBeInTheDocument();
      });
    });

    it('should hide helper text when error is shown', async () => {
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'a' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/Usa tu @usuario \(no tu nombre visible\)/i)).not.toBeInTheDocument();
        expect(screen.getByText(/debe tener entre 2 y 24 caracteres/i)).toBeInTheDocument();
      });
    });
  });

  describe('Connection behavior', () => {
    it('should not call connectTikTok with invalid username', async () => {
      const connectTikTokSpy = vi.spyOn(authService.authService, 'connectTikTok');
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: 'a' } });
      
      // Intentar conectar presionando Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(connectTikTokSpy).not.toHaveBeenCalled();
      });
    });

    it('should call connectTikTok with cleaned username when valid', async () => {
      const connectTikTokSpy = vi.spyOn(authService.authService, 'connectTikTok').mockResolvedValue(undefined);
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      fireEvent.change(input, { target: { value: '@usuario123' } });
      
      // Buscar el botón de conectar y hacer click
      await waitFor(() => {
        const connectButton = screen.getByTitle('Conectar');
        fireEvent.click(connectButton);
      });
      
      await waitFor(() => {
        expect(connectTikTokSpy).toHaveBeenCalledWith('usuario123');
      });
    });

    it('should clear error after successful connection', async () => {
      vi.spyOn(authService.authService, 'connectTikTok').mockResolvedValue(undefined);
      renderModal();
      const input = screen.getByPlaceholderText('@usuario');
      
      // Primero crear un error
      fireEvent.change(input, { target: { value: 'a' } });
      
      await waitFor(() => {
        expect(screen.getByText(/debe tener entre 2 y 24 caracteres/i)).toBeInTheDocument();
      });
      
      // Luego corregir el username
      fireEvent.change(input, { target: { value: 'usuario123' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/debe tener entre 2 y 24 caracteres/i)).not.toBeInTheDocument();
      });
    });
  });
});
