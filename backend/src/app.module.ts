import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import { redisStore } from 'cache-manager-redis-yet';
import * as winston from 'winston';
import { AuditLog } from './notifications/entities/notification.entity';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { RidersModule } from './riders/riders.module';
import { StationsModule } from './stations/stations.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TrackingModule } from './tracking/tracking.module';
import { DisputesModule } from './disputes/disputes.module';
import { ChangeRequestsModule } from './change-requests/change-requests.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FilesModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // ── Logger ──────────────────────────────────────────────────────────────
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, trace }) =>
              `${timestamp} [${context}] ${level}: ${message}${trace ? '\n' + trace : ''}`,
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),

    // ── Database ────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // ── Cache / Redis ────────────────────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        socket: { host: config.get('REDIS_HOST'), port: config.get('REDIS_PORT') },
        password: config.get('REDIS_PASSWORD') || undefined,
        ttl: 60 * 5, // 5 minutes default
      }),
      inject: [ConfigService],
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
         throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60),
         limit: config.get<number>('THROTTLE_LIMIT', 100),

        }]
        
      }),
      inject: [ConfigService],
    }),

    // ── Queue ────────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    // ── Events ──────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),

    // ── Scheduler ───────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature Modules ─────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    CustomersModule,
    RidersModule,
    StationsModule,
    OrdersModule,
    InventoryModule,
    PaymentsModule,
    NotificationsModule,
    TrackingModule,
    DisputesModule,
    ChangeRequestsModule,
    ReviewsModule,
    FilesModule,
    AdminModule,
    TypeOrmModule.forFeature([AuditLog]),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditLoggingInterceptor },
  ],
})
export class AppModule {}
