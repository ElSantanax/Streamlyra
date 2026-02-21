/**
 * Modelo de User - Representa usuarios del sistema
 */
import { Table, Column, Model, DataType, Default, PrimaryKey, HasMany, HasOne, Unique } from "sequelize-typescript";
import { Connection } from "./Connection.model";
import { UserAnalytics } from "./UserAnalytics.model";

@Table({
    tableName: "users",
    timestamps: true
})
export class User extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @Unique
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare username: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare displayName: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare avatarUrl: string;

    @HasMany(() => Connection)
    declare connections: Connection[];

    @HasOne(() => UserAnalytics)
    declare analytics: UserAnalytics;
}