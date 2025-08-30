import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || 'sirim_secret_default';
export const DATABASE_URL = process.env.DATABASE_URL || './sirim.sqlite';
