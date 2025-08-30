import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function initDb() {
  const db = await open({
    filename: path.join(process.cwd(), 'sirim.sqlite'),
    driver: sqlite3.Database
  });
  // Crear tablas si no existen
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      roles TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rnc TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER,
      monto REAL,
      fecha TEXT,
      estado TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT,
      monto REAL,
      fecha TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER,
      monto REAL,
      fecha TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT,
      monto REAL,
      fecha TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS ingresos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT,
      monto REAL,
      fecha TEXT,
      empresaId INTEGER
    );
    CREATE TABLE IF NOT EXISTS facturas_recurrentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER,
      monto REAL,
      frecuencia TEXT,
      empresaId INTEGER
    );
  `);
  return db;
}
