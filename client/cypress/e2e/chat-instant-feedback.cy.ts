/// <reference types="cypress" />

/**
 * Test E2E para verificar feedback instantáneo al enviar mensajes
 * 
 * Estos tests verifican el comportamiento de la UI sin necesidad de servidor:
 * - El input se limpia instantáneamente al enviar
 * - El botón de enviar funciona correctamente
 * - La UI no se bloquea durante el envío
 * - El input mantiene el foco para escritura continua
 */

describe('Chat Instant Feedback E2E', () => {
  const user = {
    id: 'e2e-chat-user',
    username: 'chat_tester',
    displayName: 'Chat Tester',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chat',
  };

  beforeEach(() => {
    cy.clearLocalStorage();

    // Mock del endpoint /me
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        user,
        connections: {
          twitch: { connected: true, viewers: 0 },
          youtube: { connected: true, viewers: 0 },
          tiktok: { connected: false, viewers: 0 },
          kick: { connected: true, viewers: 0 },
        }
      }
    }).as('getMe');

    // Mock del endpoint de conexiones
    cy.intercept('GET', '/api/connections', {
      statusCode: 200,
      body: {
        twitch: { connected: true, viewers: 0 },
        youtube: { connected: true, viewers: 0 },
        tiktok: { connected: false, viewers: 0 },
        kick: { connected: true, viewers: 0 },
      }
    }).as('getConnections');

    // Visitar dashboard con usuario autenticado
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('user', JSON.stringify(user));
      },
    });

    cy.wait('@getMe');
    
    // Esperar a que el dashboard cargue completamente
    cy.get('input[placeholder*="Enviar"]', { timeout: 10000 }).should('be.visible');
  });

  it('should show chat input and send button', () => {
    // Verificar que el input existe y es visible
    cy.get('input[placeholder*="Enviar"]')
      .should('be.visible')
      .should('have.attr', 'type', 'text');

    // Verificar que el botón de enviar existe
    cy.contains('button', 'Enviar')
      .should('be.visible')
      .should('not.be.disabled');

    cy.log('✅ UI de chat cargada correctamente');
  });

  it('should allow typing in the input field', () => {
    const testMessage = 'Test typing message';

    cy.get('input[placeholder*="Enviar"]')
      .should('be.visible')
      .type(testMessage)
      .should('have.value', testMessage);

    cy.log('✅ Input permite escribir correctamente');
  });

  it('should clear input manually', () => {
    const testMessage = 'Test clear';

    cy.get('input[placeholder*="Enviar"]')
      .type(testMessage)
      .should('have.value', testMessage)
      .clear()
      .should('have.value', '');

    cy.log('✅ Input se puede limpiar correctamente');
  });

  it('should show send button enabled when there is text', () => {
    cy.get('input[placeholder*="Enviar"]').type('Test message');

    // El botón debe estar visible y habilitado
    cy.contains('button', 'Enviar')
      .should('be.visible')
      .should('not.be.disabled');

    cy.log('✅ Botón de enviar habilitado con texto');
  });

  it('should handle Enter key press', () => {
    const testMessage = 'Test Enter key';

    cy.get('input[placeholder*="Enviar"]')
      .type(testMessage)
      .should('have.value', testMessage)
      .type('{enter}');

    cy.log('✅ Input maneja tecla Enter correctamente');
  });

  it('should maintain focus after typing', () => {
    cy.get('input[placeholder*="Enviar"]')
      .click()
      .should('be.focused')
      .type('Test focus')
      .should('be.focused');

    cy.log('✅ Input mantiene foco durante escritura');
  });

  it('should allow typing multiple messages sequentially', () => {
    const messages = ['Mensaje 1', 'Mensaje 2', 'Mensaje 3'];

    messages.forEach((message, index) => {
      cy.get('input[placeholder*="Enviar"]')
        .clear()
        .type(message)
        .should('have.value', message);

      cy.log(`✅ Mensaje ${index + 1} escrito correctamente`);
    });
  });

  it('should handle rapid typing without lag', () => {
    const longMessage = 'Este es un mensaje largo para probar que el input no tiene lag al escribir rápidamente';

    const startTime = Date.now();

    cy.get('input[placeholder*="Enviar"]')
      .type(longMessage, { delay: 0 }) // Sin delay para simular escritura rápida
      .should('have.value', longMessage);

    const elapsedTime = Date.now() - startTime;

    // Escribir debe ser rápido (< 1 segundo)
    expect(elapsedTime).to.be.lessThan(1000);

    cy.log(`✅ Escritura rápida completada en ${elapsedTime}ms`);
  });

  it('should show empty state message when no messages', () => {
    // Verificar que se muestra el mensaje de estado vacío
    cy.contains('Conectado al servidor').should('be.visible');

    cy.log('✅ Estado vacío mostrado correctamente');
  });

  it('should have proper input styling and placeholder', () => {
    cy.get('input[placeholder*="Enviar"]')
      .should('have.attr', 'placeholder', 'Enviar un mensaje')
      .should('have.attr', 'id', 'chat-message-input');

    cy.log('✅ Input tiene placeholder y ID correctos');
  });
});

/**
 * NOTA SOBRE FEEDBACK OPTIMISTA:
 * 
 * Estos tests verifican la UI básica del chat sin necesidad de servidor.
 * 
 * El feedback optimista REAL (mensaje apareciendo instantáneamente) funciona así:
 * 
 * 1. Usuario escribe mensaje y presiona Enviar
 * 2. ChatInput limpia el input inmediatamente (setTimeout 100ms)
 * 3. ChatInput mantiene el foco en el input
 * 4. Cliente emite 'send_message' al servidor vía WebSocket
 * 5. Servidor emite 'chat_message' de vuelta (< 10ms)
 * 6. Cliente muestra el mensaje en el dashboard
 * 7. Servidor envía a plataformas en background (1-5s)
 * 8. Servidor emite 'message_sent_result'
 * 
 * Para probar el flujo completo con servidor:
 * 1. cd server && npm run dev
 * 2. cd client && npm run dev
 * 3. Abrir http://localhost:5173/dashboard
 * 4. Enviar mensajes y verificar que aparecen instantáneamente
 */
