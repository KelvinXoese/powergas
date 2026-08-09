import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('rejects invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ firstName: 'A', lastName: 'B', email: 'not-an-email', phone: '+233501234567', password: 'Pass@1234' })
        .expect(400);
    });

    it('rejects weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '+233501234567', password: 'weak' })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('rejects invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'WrongPass@1' })
        .expect(401);
    });
  });

  describe('/api/v1/health (GET)', () => {
    it('returns ok', () => {
      return request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });
  });
});
