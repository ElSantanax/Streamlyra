import { Sequelize } from "sequelize-typescript";
import { config } from "./index";
import { User } from "../models/User.model";
import { Connection } from "../models/Connection.model";
import { UserAnalytics } from "../models/UserAnalytics.model";
import { KickWebhook } from "../models/KickWebhook.model";
import { TwitchWebhook } from "../models/TwitchWebhook.model";
import { YouTubeSubscription } from "../models/YouTubeSubscription.model";
import { YouTubeQuota } from "../models/YouTubeQuota.model";
import { YouTubeStreamContext } from "../models/YouTubeStreamContext.model";

const db = new Sequelize(config.databaseUrl, {
    dialect: "postgres",
    logging: false,
    models: [User, Connection, UserAnalytics, KickWebhook, TwitchWebhook, YouTubeSubscription, YouTubeQuota, YouTubeStreamContext],
    pool: {
        max: 20,          // Máximo de conexiones en el pool
        min: 2,           // Mínimo de conexiones mantenidas
        acquire: 30000,   // Tiempo máximo (ms) para obtener una conexión antes de error
        idle: 20000       // Tiempo máximo (ms) que una conexión puede estar idle antes de ser liberada
    }
});

export default db;