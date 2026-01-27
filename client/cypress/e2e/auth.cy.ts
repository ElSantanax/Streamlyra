/// <reference types="cypress" />

describe('Auth E2E (mocked)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should redirect to /login when visiting /dashboard without session', () => {
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('getMe');

    cy.visit('/dashboard');

    cy.wait('@getMe');
    cy.location('pathname').should('eq', '/login');
  });

  it('should allow dashboard when a user exists in localStorage and logout navigates away', () => {
    const user = {
      id: 'e2e-user-1',
      username: 'e2e',
      displayName: 'E2E User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=e2e',
    };

    let hasLoggedOut = false;
    cy.intercept('GET', '/api/auth/me', (req) => {
      if (!hasLoggedOut) {
        req.reply({ 
          statusCode: 200, 
          body: { 
            user,
            connections: {
              twitch: { connected: false, viewers: 0 },
              youtube: { connected: false, viewers: 0 },
              tiktok: { connected: false, viewers: 0 },
              kick: { connected: false, viewers: 0 },
            }
          } 
        });
        return;
      }

      req.reply({ statusCode: 401, body: { message: 'Unauthorized' } });
    }).as('getMe');

    cy.intercept('POST', '/api/auth/logout', {
      statusCode: 200,
      body: { success: true },
    }).as('logout');

    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('user', JSON.stringify(user));
      },
    });

    // Esperar a que la llamada de autenticación se complete
    cy.wait('@getMe');
    
    // Esperar a que el dashboard se renderice completamente
    cy.get('[data-cy="user-menu-trigger"]', { timeout: 10000 }).should('be.visible');
    
    // Hacer click en el menú de usuario
    cy.get('[data-cy="user-menu-trigger"]').click({ force: true });
    
    // Esperar a que el menú se abra y el botón de logout sea visible
    cy.contains('button', 'Cerrar Sesión', { timeout: 5000 }).should('be.visible');
    
    // Click en logout
    cy.contains('button', 'Cerrar Sesión').click({ force: true });

    cy.wait('@logout').then(() => {
      hasLoggedOut = true;
    });

    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('contain', 'redirect=%2Fdashboard');
    cy.window().then((w: Window) => {
      expect(w.localStorage.getItem('user')).to.eq(null);
    });
  });

  it('should complete OAuth login flow and redirect to dashboard', () => {
    const user = {
      id: 'e2e-oauth-user',
      username: 'oauth_test',
      displayName: 'OAuth Test User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=oauth',
    };

    // Mock del endpoint de exchange de código OAuth (POST /api/auth/twitch)
    cy.intercept('POST', '/api/auth/twitch', {
      statusCode: 200,
      body: { 
        user,
        token: 'mock-jwt-token'
      },
    }).as('exchangeCode');

    // Mock del endpoint /me para después del login
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: { 
        user,
        connections: {
          twitch: { connected: true, viewers: 0 },
          youtube: { connected: false, viewers: 0 },
          tiktok: { connected: false, viewers: 0 },
          kick: { connected: false, viewers: 0 },
        }
      }
    }).as('getMe');

    // Simular el callback de OAuth con un código
    cy.visit('/auth/callback?code=mock-oauth-code&state=twitch');

    // Esperar a que se complete el exchange
    cy.wait('@exchangeCode');

    // Verificar que redirige al dashboard
    cy.location('pathname', { timeout: 10000 }).should('eq', '/dashboard');

    // Verificar que el usuario está en localStorage
    cy.window().then((w: Window) => {
      const storedUser = w.localStorage.getItem('user');
      expect(storedUser).to.not.be.null;
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        expect(parsedUser.username).to.eq('oauth_test');
      }
    });

    // Verificar que el dashboard se renderiza correctamente
    cy.get('[data-cy="user-menu-trigger"]', { timeout: 10000 }).should('be.visible');
  });

  it('should redirect to login when session expires', () => {
    const user = {
      id: 'e2e-expired-user',
      username: 'expired_user',
      displayName: 'Expired User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expired',
    };

    let sessionExpired = false;

    // Mock: /me devuelve 200 inicialmente, luego 401 después de que expire
    cy.intercept('GET', '/api/auth/me', (req) => {
      if (sessionExpired) {
        req.reply({
          statusCode: 401,
          body: { message: 'Unauthorized' }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            user,
            connections: {
              twitch: { connected: false, viewers: 0 },
              youtube: { connected: false, viewers: 0 },
              tiktok: { connected: false, viewers: 0 },
              kick: { connected: false, viewers: 0 },
            }
          }
        });
      }
    }).as('getMe');

    // Mock de una acción protegida que fallará con 401
    cy.intercept('POST', '/api/auth/logout', (req) => {
      sessionExpired = true;
      req.reply({
        statusCode: 401,
        body: { message: 'Session expired' }
      });
    }).as('logoutExpired');

    // Iniciar con sesión válida
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('user', JSON.stringify(user));
      },
    });

    // Esperar a que cargue el dashboard
    cy.wait('@getMe');
    cy.get('[data-cy="user-menu-trigger"]', { timeout: 10000 }).should('be.visible');

    // Intentar hacer logout (esto simulará que la sesión expiró)
    cy.get('[data-cy="user-menu-trigger"]').click({ force: true });
    cy.contains('button', 'Cerrar Sesión', { timeout: 5000 }).should('be.visible');
    cy.contains('button', 'Cerrar Sesión').click({ force: true });

    // Esperar el intento de logout que fallará con 401
    cy.wait('@logoutExpired');

    // El sistema debería detectar el 401 y redirigir a login
    // Nota: esto depende de que el HttpClient maneje el 401 correctamente
    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');

    // Verificar que el localStorage se limpió
    cy.window().then((w: Window) => {
      expect(w.localStorage.getItem('user')).to.be.null;
    });
  });
});
