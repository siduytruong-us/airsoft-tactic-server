import { Module, Logger, OnModuleInit, Injectable } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger('Database');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      const result = await this.dataSource.query<[{ now: string; version: string }]>(
        `SELECT NOW() AS now, version() AS version`,
      );
      const { now, version } = result[0];
      const pgVersion = version.split(' ').slice(0, 2).join(' ');
      this.logger.log(`✅ PostgreSQL connected — ${pgVersion}`);
      this.logger.log(`   Server time: ${now}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ PostgreSQL connection FAILED: ${msg}`);
      this.logger.error(`   Check DB_HOST / DB_PORT / DB_PASSWORD in .env.local`);
    }
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host     = config.get('DB_HOST', 'localhost');
        const port     = config.get<number>('DB_PORT', 5432);
        const database = config.get('DB_NAME', 'postgres');
        const username = config.get('DB_USER', 'postgres');
        const password = config.get('DB_PASSWORD', '');
        const nodeEnv  = config.get('NODE_ENV', 'development');

        const logger = new Logger('DatabaseModule');
        logger.log(`⚙️  Connecting → ${username}@${host}:${port}/${database}`);

        return {
          type: 'postgres',
          host,
          port,
          database,
          username,
          password,
          synchronize: false,
          autoLoadEntities: true,
          logging: nodeEnv === 'local' ? ['query', 'error'] : ['error'],
          extra: {
            max: nodeEnv === 'local' ? 20 : 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: nodeEnv === 'local' ? 3000 : 30000,
          },
        };
      },
    }),
  ],
  providers: [DatabaseHealthService],
})
export class DatabaseModule {}
