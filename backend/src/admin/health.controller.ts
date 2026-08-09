import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB)' })
  async ready() {
    let dbHealthy = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }
    return {
      status: dbHealthy ? 'ready' : 'not_ready',
      checks: { database: dbHealthy ? 'up' : 'down' },
      timestamp: new Date().toISOString(),
    };
  }
}
