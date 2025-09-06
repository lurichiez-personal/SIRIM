// Servicio de autenticación de Microsoft Office 365
// Implementa OAuth 2.0 con Azure AD para SIRIM

export interface MicrosoftAuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface MicrosoftUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
  businessPhones: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

class MicrosoftAuthService {
  private config: MicrosoftAuthConfig | null = null;
  private isConfigured = false;

  // Inicializar configuración de Microsoft OAuth
  configure(config: MicrosoftAuthConfig) {
    this.config = config;
    this.isConfigured = true;
    
    // Guardar configuración en localStorage para persistencia
    localStorage.setItem('microsoft_auth_config', JSON.stringify({
      clientId: config.clientId,
      tenantId: config.tenantId,
      redirectUri: config.redirectUri
      // No guardar client_secret en localStorage por seguridad
    }));
  }

  // Cargar configuración desde localStorage
  loadConfiguration(): boolean {
    const stored = localStorage.getItem('microsoft_auth_config');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        this.config = config;
        this.isConfigured = true;
        return true;
      } catch (error) {
        console.error('Error cargando configuración de Microsoft Auth:', error);
      }
    }
    return false;
  }

  // Verificar si está configurado
  isReady(): boolean {
    return this.isConfigured && this.config !== null;
  }

  // Obtener configuración actual
  getConfiguration(): MicrosoftAuthConfig | null {
    return this.config;
  }

  // Generar URL de autorización de Microsoft
  getAuthorizationUrl(): string {
    if (!this.config) {
      throw new Error('Configuración de Microsoft no inicializada');
    }

    const baseUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email User.Read',
      response_mode: 'query',
      state: this.generateState()
    });

    return `${baseUrl}?${params.toString()}`;
  }

  // Intercambiar código por token
  async exchangeCodeForToken(code: string, state: string): Promise<TokenResponse> {
    if (!this.config) {
      throw new Error('Configuración de Microsoft no inicializada');
    }

    // Verificar estado para prevenir CSRF
    if (!this.verifyState(state)) {
      throw new Error('Estado de autenticación inválido');
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret || '',
      code: code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error obteniendo token: ${response.status} - ${errorText}`);
      }

      const tokenData: TokenResponse = await response.json();
      
      // Guardar token de forma segura
      this.storeToken(tokenData);
      
      return tokenData;
    } catch (error) {
      console.error('Error en intercambio de código por token:', error);
      throw error;
    }
  }

  // Obtener información del usuario autenticado
  async getUserInfo(accessToken: string): Promise<MicrosoftUser> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo información del usuario: ${response.status}`);
      }

      const userData: MicrosoftUser = await response.json();
      return userData;
    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      throw error;
    }
  }

  // Iniciar proceso de autenticación (redirige a Microsoft)
  startAuthentication() {
    if (!this.isReady()) {
      throw new Error('Microsoft Auth no está configurado. Configure primero las credenciales.');
    }

    const authUrl = this.getAuthorizationUrl();
    window.location.href = authUrl;
  }

  // Manejar callback de autenticación
  async handleCallback(): Promise<{ user: MicrosoftUser; token: TokenResponse } | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`Error de autenticación: ${error} - ${urlParams.get('error_description')}`);
    }

    if (!code || !state) {
      return null; // No hay código de autorización
    }

    try {
      // Intercambiar código por token
      const tokenResponse = await this.exchangeCodeForToken(code, state);
      
      // Obtener información del usuario
      const userInfo = await this.getUserInfo(tokenResponse.access_token);

      // Limpiar parámetros de URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return {
        user: userInfo,
        token: tokenResponse
      };
    } catch (error) {
      console.error('Error procesando callback de autenticación:', error);
      throw error;
    }
  }

  // Verificar si hay un token válido guardado
  hasValidToken(): boolean {
    const tokenData = this.getStoredToken();
    if (!tokenData) return false;

    const expirationTime = tokenData.timestamp + (tokenData.expires_in * 1000);
    return Date.now() < expirationTime;
  }

  // Obtener token guardado
  getStoredToken(): (TokenResponse & { timestamp: number }) | null {
    const stored = localStorage.getItem('microsoft_token');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored token:', error);
      }
    }
    return null;
  }

  // Cerrar sesión
  logout() {
    localStorage.removeItem('microsoft_token');
    localStorage.removeItem('microsoft_user');
    
    // Opcionalmente redirigir a logout de Microsoft
    if (this.config) {
      const logoutUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(this.config.redirectUri)}`;
      window.location.href = logoutUrl;
    }
  }

  // Generar estado para prevenir CSRF
  private generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('microsoft_auth_state', state);
    return state;
  }

  // Verificar estado para prevenir CSRF
  private verifyState(state: string): boolean {
    const storedState = sessionStorage.getItem('microsoft_auth_state');
    sessionStorage.removeItem('microsoft_auth_state');
    return storedState === state;
  }

  // Almacenar token de forma segura
  private storeToken(tokenData: TokenResponse) {
    const tokenWithTimestamp = {
      ...tokenData,
      timestamp: Date.now()
    };
    localStorage.setItem('microsoft_token', JSON.stringify(tokenWithTimestamp));
  }
}

// Instancia singleton del servicio
export const microsoftAuthService = new MicrosoftAuthService();

// Hook para usar en componentes React
export const useMicrosoftAuth = () => {
  return {
    configure: microsoftAuthService.configure.bind(microsoftAuthService),
    isReady: microsoftAuthService.isReady.bind(microsoftAuthService),
    startAuthentication: microsoftAuthService.startAuthentication.bind(microsoftAuthService),
    handleCallback: microsoftAuthService.handleCallback.bind(microsoftAuthService),
    hasValidToken: microsoftAuthService.hasValidToken.bind(microsoftAuthService),
    logout: microsoftAuthService.logout.bind(microsoftAuthService),
    getConfiguration: microsoftAuthService.getConfiguration.bind(microsoftAuthService),
    loadConfiguration: microsoftAuthService.loadConfiguration.bind(microsoftAuthService)
  };
};