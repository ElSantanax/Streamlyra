import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { IUserRepository } from '../interfaces/IUserRepository';

/**
 * Implementación del repositorio de usuarios usando Sequelize.
 * Encapsula toda la lógica de acceso a datos para usuarios.
 */
export class UserRepository implements IUserRepository {
    /**
     * Encuentra un usuario por ID con sus conexiones cargadas
     */
    async findByIdWithConnections(id: string): Promise<User | null> {
        return User.findByPk(id, {
            include: [{ model: Connection, attributes: ['provider', 'providerUsername'] }]
        }) as Promise<User | null>;
    }

    /**
     * Encuentra un usuario por ID
     */
    async findById(id: string): Promise<User | null> {
        return User.findByPk(id) as Promise<User | null>;
    }

    /**
     * Encuentra un usuario por email
     */
    async findByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email } }) as Promise<User | null>;
    }

    /**
     * Encuentra un usuario por username
     */
    async findByUsername(username: string): Promise<User | null> {
        return User.findOne({ where: { username } }) as Promise<User | null>;
    }

    /**
     * Crea un nuevo usuario
     */
    async create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<User> {
        return User.create(data) as Promise<User>;
    }

    /**
     * Actualiza un usuario
     */
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

    /**
     * Verifica si un username ya existe
     */
    async usernameExists(username: string): Promise<boolean> {
        const user = await this.findByUsername(username);
        return user !== null;
    }
}
