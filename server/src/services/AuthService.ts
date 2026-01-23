import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';
import { TwitchService } from './platforms/TwitchService';
import { YouTubeService } from './platforms/YouTubeService';

export interface PlatformProfile {
    provider: 'twitch' | 'youtube' | 'kick' | 'tiktok';
    providerId: string;
    username: string; // login/slug
    displayName: string;
    avatarUrl: string;
    email?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

export class AuthService {

    /**
     * Procesa la autenticación de una plataforma:
     * 1. Vincula a usuario logueado si existe
     * 2. O busca conexión existente
     * 3. O crea usuario nuevo
     */
    static async handlePlatformAuth(profile: PlatformProfile, tokens: AuthTokens, currentUserId?: string) {

        // 1. Buscar conexión existente
        const connection = await Connection.findOne({
            where: { provider: profile.provider, providerId: profile.providerId },
            include: [User]
        });

        let user: User | null = null;

        if (connection) {
            user = connection.user;

            // Si el usuario ya está logueado y es distinto al dueño de la conexión, error de seguridad
            if (currentUserId && user.id !== currentUserId) {
                // Verificamos si el usuario actual existe antes de lanzar error de vínculo
                const currentUserExists = await User.findByPk(currentUserId);
                if (currentUserExists) {
                    throw new Error(`Esta cuenta de ${profile.provider} ya está vinculada a otro usuario.`);
                }
                // Si el usuario actual no existe, simplemente ignoramos el ID viejo y procedemos
            }

            // Actualizar tokens
            this.updateConnectionTokens(connection, tokens);
            await connection.save();

            // Actualizar perfil si es necesario
            if (user.avatarUrl !== profile.avatarUrl || user.displayName !== profile.displayName) {
                user.avatarUrl = profile.avatarUrl;
                user.displayName = profile.displayName;
                await user.save();
            }
        } else {
            // No hay conexión, hay que vincular o crear
            if (currentUserId) {
                user = await User.findByPk(currentUserId);
            }

            // Si no hay usuario (porque no había ID o el ID era de un usuario borrado)
            if (!user) {
                // Crear usuario nuevo (con manejo de colisión de username)
                user = await this.createUserFromProfile(profile);
            }

            // Crear la conexión
            await Connection.create({
                provider: profile.provider,
                providerId: profile.providerId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || '',
                expiryDate: this.calculateExpiry(tokens.expiresIn),
                userId: user.id
            });
        }

        // Generar JWT de Streamlyra
        const jwtToken = this.generateToken(user);

        return {
            token: jwtToken,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            }
        };
    }

    private static async createUserFromProfile(profile: PlatformProfile) {
        // Usamos el username de la plataforma como base, sin truncar a 15 (Twitch permite hasta 25)
        const baseUsername = profile.username.replace(/\s+/g, '').toLowerCase();
        let username = baseUsername;
        let suffix = 1;

        while (await User.findOne({ where: { username } })) {
            username = `${baseUsername}${suffix}`;
            suffix++;
        }

        return await User.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email
        });
    }

    private static updateConnectionTokens(connection: Connection, tokens: AuthTokens) {
        connection.accessToken = tokens.accessToken;
        if (tokens.refreshToken) connection.refreshToken = tokens.refreshToken;
        connection.expiryDate = this.calculateExpiry(tokens.expiresIn);
    }

    private static calculateExpiry(expiresIn: number): Date {
        const date = new Date();
        date.setSeconds(date.getSeconds() + expiresIn);
        return date;
    }

    static generateToken(user: User): string {
        return jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );
    }

    /**
     * Verifica si el token de una conexión ha expirado y lo refresca si es necesario
     */
    static async getValidAccessToken(userId: string, provider: 'twitch' | 'youtube'): Promise<string | null> {
        const connection = await Connection.findOne({ where: { userId, provider } });
        if (!connection) return null;

        // Si falta más de 5 minutos para que expire, lo usamos tal cual
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutos
        if (connection.expiryDate && (connection.expiryDate.getTime() - now.getTime() > bufferTime)) {
            return connection.accessToken;
        }

        // Si ha expirado o está cerca, refrescar
        if (!connection.refreshToken) {
            console.warn(`[AuthService] No hay refresh token para ${provider} de ${userId}`);
            return connection.accessToken; // Intentar con el actual de todas formas
        }

        console.log(`[AuthService] Refrescando token expirado para ${provider}...`);
        try {
            const tokens: AuthTokens = (provider === 'twitch')
                ? await TwitchService.refreshAccessToken(connection.refreshToken)
                : await YouTubeService.refreshAccessToken(connection.refreshToken);

            this.updateConnectionTokens(connection, tokens);
            await connection.save();
            return connection.accessToken;
        } catch (error) {
            console.error(`[AuthService] Error al refrescar token de ${provider}:`, error);
            return connection.accessToken;
        }
    }
}
