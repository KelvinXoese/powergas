import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USERNAME', 'powergas'),
  password: config.get<string>('DB_PASSWORD'),
  database: config.get<string>('DB_NAME', 'powergas_db'),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false, // Never use in production
  logging: config.get<string>('NODE_ENV') === 'development',
  ssl: config.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20, // Connection pool size
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
  },
  migrationsRun: false,
});
