import { Sequelize } from "sequelize";

const db = new Sequelize(process.env.DATABASE_URL!);

export default db;