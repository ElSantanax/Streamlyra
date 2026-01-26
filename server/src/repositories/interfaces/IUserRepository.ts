import { User } from '../../models/User.model';

/**
 * Interfaz que define las operaciones disponibles para el repositorio de usuarios.
 * Los servicios solo conocen esta interfaz, no la implementación con Sequelize.
 */
export interface IUserRepository {
    /**
     * Encuentra un usuario por ID con sus conexiones
     */
    findByIdWithConnections(id: string): Promise<User | null>;

    /**
     * Encuentra un usuario por ID
     */
    findById(id: string): Promise<User | null>;

    /**
     * Encuentra un usuario por email
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Encuentra un usuario por username
     */
    findByUsername(username: string): Promise<User | null>;

    /**
     * Crea un nuevo usuario
     */
    create(data: {
        username: string;
        displayName?: string;
        email?: string;
        avatarUrl?: string;
    }): Promise<User>;

    /**
     * Actualiza un usuario
     */
    update(id: string, data: Partial<{
        username: string;
        displayName: string;
        email: string;
        avatarUrl: string;
    }>): Promise<User | null>;

    /**
     * Verifica si un username ya existe
     */
    usernameExists(username: string): Promise<boolean>;
}
