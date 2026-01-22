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
    provider!: string; // Ej: 'twitch', 'youtube', 'kick'

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    providerId!: string; // El ID único del usuario en esa plataforma (ej: '12345678')

    @Column({
        type: DataType.TEXT, // TEXT porque los tokens pueden ser muy largos
        allowNull: false
    })
    accessToken!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    refreshToken!: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    expiryDate!: Date; // Para saber cuándo renovar el token

    // Relación con User
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    userId!: string;

    @BelongsTo(() => User)
    user!: User;
}
