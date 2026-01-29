/**
 * Modelo de Connection - Representa conexiones de usuarios con plataformas
 */
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Default, PrimaryKey } from "sequelize-typescript";
import { User } from "./User.model";

@Table({
    tableName: "connections",
    timestamps: true,
    indexes: [
        {
            name: 'idx_connections_user_provider',
            unique: true,
            fields: ['userId', 'provider']
        },
        {
            name: 'idx_connections_provider_providerId',
            unique: true,
            fields: ['provider', 'providerId']
        }
    ]
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
    declare provider: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare providerId: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare providerUsername: string;

    @Column({
        type: DataType.TEXT,
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
    declare expiryDate: Date;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;
}
