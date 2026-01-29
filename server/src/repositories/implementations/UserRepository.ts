import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { IUserRepository } from '../interfaces/IUserRepository';

/**
 * Implementación del repositorio de usuarios usando Sequelize
 */
export class UserRepository implements IUserRepository {
    async findByIdWithConnections(id: string): Promise<User | null> {
        return User.findByPk(id, {
            include: [{ model: Connection, attributes: ['provider', 'providerUsername'] }]
        }) as Promise<User | null>;
    }

    async findById(id: string): Promise<User | null> {
        return User.findByPk(id) as Promise<User | null>;
    }

    async findByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email } }) as Promise<User | null>;
    }

    async findByUsername(username: string): Promise<User | null> {
        return User.findOne({ where: { username } }) as Promise<User | null>;
    }

    async create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<User> {
        return User.create(data) as Promise<User>;
    }

    async update(
        id: string,
        data: Partial<{
            username: string;
            displayName: string;
            email: string;
            avatarUrl: string;
        }>
    ): Promise<User | null> {
        const user = await this.findById(id);
        if (!user) return null;
        return user.update(data) as Promise<User>;
    }

    async usernameExists(username: string): Promise<boolean> {
        const user = await this.findByUsername(username);
        return user !== null;
    }
}
