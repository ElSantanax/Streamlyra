import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";

dotenv.config();

import { User } from "../models/User.model";
import { Connection } from "../models/Connection.model";

const db = new Sequelize(process.env.DATABASE_URL!, {
    dialect: "postgres",
    logging: false,
    models: [User, Connection], // Modelos explícitos = Menos errores
});

export default db;