import { Sequelize } from "sequelize-typescript";
import { config } from "./index";
import { User } from "../models/User.model";
import { Connection } from "../models/Connection.model";
import { KickWebhook } from "../models/KickWebhook.model";

const db = new Sequelize(config.databaseUrl, {
    dialect: "postgres",
    logging: false,
    models: [User, Connection, KickWebhook],
});

export default db;