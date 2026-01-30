import { User } from '../../models/User.model';
import { Transaction } from 'sequelize';

/**
 * Interfaz que define las operaciones del repositorio de usuarios
 */
export interface IUserRepository {
    findByIdWithConnections(id: string, transaction?: Transaction): Promise<User | null>;

    findById(id: string, transaction?: Transaction): Promise<User | null>;

    findByEmail(email: string, transaction?: Transaction): Promise<User | null>;

    findByUsername(username: string, transaction?: Transaction): Promise<User | null>;

    create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }, transaction?: Transaction): Promise<User>;

    update(id: string, data: Partial<{
        username: string;
        displayName: string;
        email: string;
        avatarUrl: string;
    }>, transaction?: Transaction): Promise<User | null>;

    usernameExists(username: string, transaction?: Transaction): Promise<boolean>;
}
