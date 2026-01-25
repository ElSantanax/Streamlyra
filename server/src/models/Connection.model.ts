import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Default, PrimaryKey } from "sequelize-typescript";
import { User } from "./User.model";

@Table({
    tableName: "connections",
    timestamps: true
})
export class Connection extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare provider: string; // Ej: 'twitch', 'youtube', 'kick'

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare providerId: string; // El ID único del usuario en esa plataforma (ej: '12345678')

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare providerUsername: string; // El nickname del usuario en esa plataforma (ej: para Twitch Chat)

    @Column({
        type: DataType.TEXT, // TEXT porque los tokens pueden ser muy largos
        allowNull: false
    })
    declare accessToken: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare refreshToken: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare expiryDate: Date; // Para saber cuándo renovar el token

    // Relación con User
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;

    static async removeConnection(userId: string, provider: string) {
        return this.destroy({ where: { userId, provider } });
    }
}
