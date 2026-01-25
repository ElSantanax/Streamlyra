import axios from 'axios';

export interface OAuthExchangeOptions {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    grantType?: string;
    contentType?: 'json' | 'form';
}

export class OAuthUtils {
    static async exchangeCode<T>(code: string, options: OAuthExchangeOptions, extraParams: Record<string, string> = {}): Promise<T> {
        const { baseUrl, clientId, clientSecret, redirectUri, grantType = 'authorization_code', contentType = 'json' } = options;

        const data: Record<string, string> = {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: grantType,
            ...extraParams
        };

        if (redirectUri) data.redirect_uri = redirectUri;

        const config = contentType === 'form'
            ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, transformRequest: [(data: Record<string, string>) => new URLSearchParams(data).toString()] }
            : {};

        const response = await axios.post<T>(baseUrl, data, config);
        return response.data;
    }

    static async refreshTokens<T>(refreshToken: string, options: Omit<OAuthExchangeOptions, 'redirectUri' | 'grantType'>): Promise<T> {
        const { baseUrl, clientId, clientSecret, contentType = 'json' } = options;

        const data: Record<string, string> = {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };

        const config = contentType === 'form'
            ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, transformRequest: [(data: Record<string, string>) => new URLSearchParams(data).toString()] }
            : {};

        const response = await axios.post<T>(baseUrl, data, config);
        return response.data;
    }
}
