import { User } from '../../models/User.model';

/**
 * Interfaz que define las operaciones del repositorio de usuarios
 */
export interface IUserRepository {
    findByIdWithConnections(id: string): Promise<User | null>;

    findById(id: string): Promise<User | null>;

    findByEmail(email: string): Promise<User | null>;

    findByUsername(username: string): Promise<User | null>;

    create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<User>;

    update(id: string, data: Partial<{
        username: string;
        displayName: string;
        email: string;
        avatarUrl: string;
    }>): Promise<User | null>;

    usernameExists(username: string): Promise<boolean>;
}
