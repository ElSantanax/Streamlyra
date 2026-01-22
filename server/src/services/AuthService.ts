import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';

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
        let connection = await Connection.findOne({
            where: { provider: profile.provider, providerId: profile.providerId },
            include: [User]
        });

        let user;

        if (connection) {
            user = connection.user;

            // Si el usuario ya está logueado y es distinto al dueño de la conexión, error de seguridad
            if (currentUserId && user.id !== currentUserId) {
                throw new Error(`Esta cuenta de ${profile.provider} ya está vinculada a otro usuario.`);
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
                if (!user) throw new Error('Usuario logueado no encontrado');
            } else {
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
        let baseUsername = profile.username.replace(/\s+/g, '').toLowerCase().substring(0, 15);
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
}
