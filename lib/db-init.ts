/**
 * Originium Kernel Database Initialization
 * 数据库初始化 - 自动建表和数据迁移
 */

import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { getEnvConfig } from './env';

/**
 * 数据库表结构定义
 */
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: 'varchar' | 'text' | 'integer' | 'bigint' | 'timestamp' | 'boolean' | 'json';
  nullable?: boolean;
  primary?: boolean;
  default?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * 预定义的表结构 - 用户表
 */
const USERS_TABLE: TableSchema = {
  name: 'users',
  columns: [
    { name: 'uid', type: 'varchar', primary: true },
    { name: 'email', type: 'varchar', nullable: false },
    { name: 'name', type: 'varchar', nullable: false },
    { name: 'password', type: 'varchar', nullable: false },
    { name: 'role', type: 'varchar', default: "'user'" },
    { name: 'user_group', type: 'varchar', nullable: true },
    { name: 'status', type: 'varchar', default: "'active'" },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_email', columns: ['email'], unique: true },
    { name: 'idx_uid', columns: ['uid'], unique: true },
  ],
};

/**
 * 预定义的表结构 - KV 存储表
 */
const KV_TABLE: TableSchema = {
  name: 'originium_kv',
  columns: [
    { name: 'k', type: 'varchar', primary: true },
    { name: 'v', type: 'text', nullable: true },
    { name: 'expiry', type: 'bigint', nullable: true },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_k', columns: ['k'], unique: true },
  ],
};

/**
 * 所有表结构
 */
export const SCHEMAS: TableSchema[] = [KV_TABLE, USERS_TABLE];

/**
 * MySQL 建表语句生成
 */
function generateCreateTableMySQL(schema: TableSchema): string {
  const columns = schema.columns.map(col => {
    let type = 'VARCHAR(255)';
    switch (col.type) {
      case 'text': type = 'TEXT'; break;
      case 'integer': type = 'INT'; break;
      case 'bigint': type = 'BIGINT'; break;
      case 'timestamp': type = 'TIMESTAMP'; break;
      case 'boolean': type = 'TINYINT(1)'; break;
      case 'json': type = 'JSON'; break;
    }
    
    const nullable = col.nullable ? 'NULL' : 'NOT NULL';
    const primary = col.primary ? 'PRIMARY KEY' : '';
    const defaultVal = col.default ? `DEFAULT ${col.default}` : '';
    
    return `  \`${col.name}\` ${type} ${nullable} ${primary} ${defaultVal}`.trim();
  });
  
  const indexes = schema.indexes?.map(idx => {
    const unique = idx.unique ? 'UNIQUE' : '';
    const cols = idx.columns.map(c => `\`${c}\``).join(', ');
    return `  ${unique} INDEX \`${idx.name}\` (${cols})`;
  }) || [];
  
  return `CREATE TABLE IF NOT EXISTS \`${schema.name}\` (\n${[...columns, ...indexes].join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

/**
 * PostgreSQL 建表语句生成
 */
function generateCreateTablePostgres(schema: TableSchema): string {
  const columns = schema.columns.map(col => {
    let type = 'VARCHAR(255)';
    switch (col.type) {
      case 'text': type = 'TEXT'; break;
      case 'integer': type = 'INTEGER'; break;
      case 'bigint': type = 'BIGINT'; break;
      case 'timestamp': type = 'TIMESTAMP'; break;
      case 'boolean': type = 'BOOLEAN'; break;
      case 'json': type = 'JSONB'; break;
    }
    
    const nullable = col.nullable ? 'NULL' : 'NOT NULL';
    const primary = col.primary ? 'PRIMARY KEY' : '';
    const defaultVal = col.default ? `DEFAULT ${col.default}` : '';
    
    return `  "${col.name}" ${type} ${nullable} ${primary} ${defaultVal}`.trim();
  });
  
  const indexes = schema.indexes?.map(idx => {
    const unique = idx.unique ? 'UNIQUE' : '';
    const cols = idx.columns.map(c => `"${c}"`).join(', ');
    return `CREATE ${unique} INDEX IF NOT EXISTS "${idx.name}" ON "${schema.name}" (${cols});`;
  }) || [];
  
  const createTable = `CREATE TABLE IF NOT EXISTS "${schema.name}" (\n${columns.join(',\n')}\n);`;
  return [createTable, ...indexes].join('\n');
}

/**
 * 数据库初始化类
 */
export class DatabaseInitializer {
  private sqlType?: 'mysql' | 'postgres';
  private connection: any;

  constructor() {}

  /**
   * 初始化所有表
   */
  async initialize(): Promise<void> {
    console.log('[数据库初始化] 开始数据库初始化...');
    
    const config = getEnvConfig();
    const databaseUrl = config.databaseUrl;
    
    if (!databaseUrl) {
      console.log('[数据库初始化] 未配置 DATABASE_URL，跳过初始化');
      return;
    }
    
    // 检测数据库类型
    if (databaseUrl.startsWith('mysql:')) {
      this.sqlType = 'mysql';
      await this.connectMySQL(databaseUrl);
    } else if (databaseUrl.startsWith('postgres:') || databaseUrl.startsWith('postgresql:')) {
      this.sqlType = 'postgres';
      await this.connectPostgres(databaseUrl);
    } else {
      console.log('[数据库初始化] 非 SQL 数据库，跳过建表操作');
      return;
    }
    
    // 创建表
    await this.createTables();
    
    // 关闭连接
    await this.close();
    
    console.log('[数据库初始化] ✓ 数据库初始化完成');
  }

  /**
   * 连接 MySQL
   */
  private async connectMySQL(url: string): Promise<void> {
    console.log('[数据库初始化] 正在连接 MySQL...');
    const cleanUrl = url.replace('mysql://', '');
    this.connection = await mysql.createPool(`mysql://${cleanUrl}`);
    console.log('[数据库初始化] ✓ MySQL 连接成功');
  }

  /**
   * 连接 PostgreSQL
   */
  private async connectPostgres(url: string): Promise<void> {
    console.log('[数据库初始化] 正在连接 PostgreSQL...');
    this.connection = new PgClient({ connectionString: url });
    await this.connection.connect();
    console.log('[数据库初始化] ✓ PostgreSQL 连接成功');
  }

  /**
   * 创建所有表
   */
  private async createTables(): Promise<void> {
    console.log('[数据库初始化] 开始创建表结构...');
    
    for (const schema of SCHEMAS) {
      await this.createTable(schema);
    }
    
    console.log('[数据库初始化] ✓ 所有表创建完成');
  }

  /**
   * 创建单个表
   */
  private async createTable(schema: TableSchema): Promise<void> {
    console.log(`[数据库初始化] 创建表：${schema.name}`);
    
    try {
      if (this.sqlType === 'mysql') {
        const sql = generateCreateTableMySQL(schema);
        console.log(`[数据库初始化] SQL: ${sql.replace(/\n/g, ' ')}`);
        await this.connection.query(sql);
      } else if (this.sqlType === 'postgres') {
        const sql = generateCreateTablePostgres(schema);
        const statements = sql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          console.log(`[数据库初始化] SQL: ${stmt.trim()}`);
          await this.connection.query(stmt);
        }
      }
      console.log(`[数据库初始化] ✓ 表 ${schema.name} 创建成功`);
    } catch (error: any) {
      console.error(`[数据库初始化] ❌ 表 ${schema.name} 创建失败:`, error.message);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  private async close(): Promise<void> {
    if (this.connection) {
      if (this.sqlType === 'mysql') {
        await this.connection.end();
      } else {
        await this.connection.end();
      }
      console.log('[数据库初始化] 数据库连接已关闭');
    }
  }
}

/**
 * 导出初始化函数
 */
export async function initializeDatabase(): Promise<void> {
  const initializer = new DatabaseInitializer();
  await initializer.initialize();
}
