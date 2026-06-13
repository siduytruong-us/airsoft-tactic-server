import { Module, Logger, OnModuleInit, Injectable } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger('Database');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // ── Connectivity check ────────────────────────────────────────────────────
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
      this.logger.error(`   Check DB_HOST / DB_PORT / DB_PASSWORD (Supabase) in .env.local`);
      return;
    }

    // ── Migration runner ──────────────────────────────────────────────────────
    await this.runMigrations();
  }

  private async runMigrations() {
    // Ensure tracking table exists
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Read SQL files from src/migrations/
    const migrationsDir = path.join(process.cwd(), 'src', 'migrations');
    let files: string[];
    try {
      files = fs
        .readdirSync(migrationsDir)
        .filter((f) => /^V\d+__.*\.sql$/.test(f))
        .sort((a, b) => this.versionOf(a) - this.versionOf(b));
    } catch {
      this.logger.warn(`Migrations folder not found: ${migrationsDir}`);
      return;
    }

    // Load applied versions
    const applied = await this.dataSource.query<{ version: string }[]>(
      `SELECT version FROM schema_migrations ORDER BY version`,
    );
    let appliedSet = new Set(applied.map((r) => r.version));

    // Bootstrap: if schema_migrations is empty but DB already has tables (existing install),
    // mark all files that exist on disk but whose version <= last known-good as applied.
    if (appliedSet.size === 0) {
      const existingTables = await this.dataSource.query<{ tablename: string }[]>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fields'`,
      );
      if (existingTables.length > 0) {
        // DB already set up — seed all files present on disk as applied (skip re-running them)
        for (const file of files) {
          const version = file.replace(/\.sql$/, '');
          await this.dataSource.query(
            `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
            [version],
          );
        }
        this.logger.log(`Bootstrapped schema_migrations with ${files.length} existing migration(s)`);
        // Reload applied set — now all files are marked; nothing will run below
        const reloaded = await this.dataSource.query<{ version: string }[]>(
          `SELECT version FROM schema_migrations`,
        );
        appliedSet = new Set(reloaded.map((r) => r.version));
      }
    }

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (appliedSet.has(version)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      try {
        await this.dataSource.query(sql);
        await this.dataSource.query(
          `INSERT INTO schema_migrations (version) VALUES ($1)`,
          [version],
        );
        this.logger.log(`✅ Migration applied: ${version}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`❌ Migration FAILED: ${version} — ${msg}`);
        throw err; // halt on failure
      }
    }
  }

  private versionOf(filename: string): number {
    const match = /^V(\d+)__/.exec(filename);
    return match ? parseInt(match[1], 10) : 0;
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Server always connects to Supabase Postgres — no local DB.
        // Direct host (db.<ref>.supabase.co) is IPv6-only; use the IPv4 transaction
        // pooler (Supavisor) by default so it works on IPv4-only networks.
        const host     = config.get('DB_HOST', 'aws-1-us-east-1.pooler.supabase.com');
        const port     = config.get<number>('DB_PORT', 6543);
        const database = config.get('DB_NAME', 'postgres');
        const username = config.get('DB_USER', 'postgres.ycqcvjpqdvlsoqclstht');
        const password = config.get('DB_PASSWORD', '');
        const nodeEnv  = config.get('NODE_ENV', 'development');
        // Supabase Postgres requires SSL. Allow opt-out via DB_SSL=false for edge cases.
        const sslEnabled = config.get('DB_SSL', 'true') !== 'false';

        const logger = new Logger('DatabaseModule');
        logger.log(`⚙️  Connecting → ${username}@${host}:${port}/${database} (ssl=${sslEnabled})`);

        return {
          type: 'postgres',
          host,
          port,
          database,
          username,
          password,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
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
