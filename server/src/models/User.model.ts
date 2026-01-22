import { Table, Column, Model, DataType, Default, PrimaryKey, HasMany, Unique } from "sequelize-typescript";
import { Connection } from "./Connection.model";

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
    username!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    displayName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    email!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    avatarUrl!: string;

    @HasMany(() => Connection)
    connections!: Connection[];
}