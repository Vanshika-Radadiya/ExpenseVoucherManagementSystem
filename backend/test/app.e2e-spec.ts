import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/database/prisma.service.js';

process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/expense_voucher_test';
process.env.JWT_ACCESS_SECRET = 'test-only-secret-with-at-least-32-characters';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $connect: vi.fn(), $disconnect: vi.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ status: 'ok', service: 'expense-voucher-api' });
  });

  it('rejects unauthenticated voucher requests', () => {
    return request(app.getHttpServer()).get('/api/vouchers').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
