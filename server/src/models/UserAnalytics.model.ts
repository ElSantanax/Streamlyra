import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import { User } from "./User.model";

@Table({
    tableName: "user_analytics",
    timestamps: true
})
export class UserAnalytics extends Model {
    @PrimaryKey
    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare userId: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare lastFollowerName: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare lastFollowerPlatform: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare lastFollowerAt: Date;

    @BelongsTo(() => User)
    declare user: User;
}
