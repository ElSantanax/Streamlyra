import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { UserAnalytics } from '../../models/UserAnalytics.model';
import { IUserRepository } from '../interfaces/IUserRepository';
import { Transaction } from 'sequelize';

/**
 * Implementación del repositorio de usuarios usando Sequelize
 */
export class UserRepository implements IUserRepository {
    async findByIdWithConnections(id: string, transaction?: Transaction): Promise<User | null> {
        return User.findByPk(id, {
            include: [
                { model: Connection, attributes: ['provider', 'providerUsername'] },
                { model: UserAnalytics, attributes: ['userId', 'lastFollowerName', 'lastFollowerPlatform', 'lastFollowerAt', 'lastRaidName', 'lastRaidPlatform', 'lastRaidViewers', 'lastRaidAt'] }
            ],
            transaction
        }) as Promise<User | null>;
    }

    async findById(id: string, transaction?: Transaction): Promise<User | null> {
        return User.findByPk(id, { transaction }) as Promise<User | null>;
    }

    async findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
        return User.findOne({ where: { email }, transaction }) as Promise<User | null>;
    }

    async findByUsername(username: string, transaction?: Transaction): Promise<User | null> {
        return User.findOne({ where: { username }, transaction }) as Promise<User | null>;
    }

    async create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }, transaction?: Transaction): Promise<User> {
        return User.create(data, { transaction }) as Promise<User>;
    }

    async update(
        id: string,
        data: Partial<{
            username: string;
            displayName: string;
            email: string;
            avatarUrl: string;
        }>,
        transaction?: Transaction
    ): Promise<User | null> {
        const user = await this.findById(id, transaction);
        if (!user) return null;
        return user.update(data, { transaction }) as Promise<User>;
    }

    async usernameExists(username: string, transaction?: Transaction): Promise<boolean> {
        const user = await this.findByUsername(username, transaction);
        return user !== null;
    }
}
