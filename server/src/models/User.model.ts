import { Table, Column, Model, DataType, Default } from "sequelize-typescript";

@Table({
    tableName: "users",

})

export class User extends Model<User> {

}