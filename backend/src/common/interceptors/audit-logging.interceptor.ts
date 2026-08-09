import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog } from '../../notifications/entities/notification.entity';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];
// Fields that should never end up in an audit log's newValue, even though
// they arrive in mutating request bodies.
const SENSITIVE_KEYS = ['password', 'otp', 'token', 'secret', 'accessToken', 'refreshToken'];

/**
 * Actually persists to the AuditLog table. Previously nothing in the
 * entire codebase wrote to it — the existing LoggingInterceptor only logs
 * to console (and is instantiated manually in main.ts, bypassing DI
 * entirely, so it couldn't inject a repository even if it tried to). The
 * admin AuditLogs page would show "No audit entries yet" forever, no
 * matter how much real platform activity happened, until this existed.
 *
 * Registered via APP_INTERCEPTOR in app.module.ts so Nest's DI container
 * actually provides the repository — a manually-`new`'d interceptor like
 * LoggingInterceptor can't do that.
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(@InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, body, user } = req;

    if (!MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget — an audit log write failing should never break
        // the actual request that triggered it.
        this.write(method, url, ip, body, user).catch((err) =>
          this.logger.error(`Audit write failed for ${method} ${url}`, err?.stack),
        );
      }),
    );
  }

  private async write(method: string, url: string, ip: string, body: any, user: any): Promise<void> {
    const pathParts = url.split('?')[0].split('/').filter(Boolean); // e.g. ['api','v1','orders','uuid','status']
    const resourceType = pathParts[2] ?? 'unknown'; // skip 'api'/'v1' prefix
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resourceId = pathParts.find((p) => uuidPattern.test(p)) ?? null;

    const sanitizedBody = body ? { ...body } : null;
    if (sanitizedBody) {
      for (const key of SENSITIVE_KEYS) delete sanitizedBody[key];
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: user?.id ?? null,
        action: `${method} ${url.split('?')[0]}`,
        resourceType,
        resourceId,
        newValue: sanitizedBody,
        ipAddress: ip,
      }),
    );
  }
}
