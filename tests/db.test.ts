import { describe, expect, test } from 'vitest';
import { getUserByUsernameSearch } from '@/app/api/users/route';
import type { IDatabase } from '@/lib/db';

/**
 * 简单的 db Mock:基于 Map 存储,统计 db.get 的调用次数和 key 列表
 * 仅 get 路径有真实逻辑,其余方法返回 no-op Promise 以满足 IDatabase 类型
 */
interface MockDbHandle {
  db: IDatabase;
  store: Map<string, string>;
  getCallCount: number;
  getCallKeys: string[];
}

function createMockDb(): MockDbHandle {
  const store = new Map<string, string>();
  const getCallKeys: string[] = [];
  const counters = { count: 0 };

  const db: IDatabase = {
    prisma: null,
    get(key: string): Promise<string | null> {
      counters.count += 1;
      getCallKeys.push(key);
      return Promise.resolve(store.get(key) ?? null);
    },
    set(): Promise<void> {
      return Promise.resolve();
    },
    del(): Promise<void> {
      return Promise.resolve();
    },
    exists(): Promise<boolean> {
      return Promise.resolve(false);
    },
    hget(): Promise<string | null> {
      return Promise.resolve(null);
    },
    hset(): Promise<void> {
      return Promise.resolve();
    },
    hdel(): Promise<void> {
      return Promise.resolve();
    },
    hgetall(): Promise<Record<string, string>> {
      return Promise.resolve({});
    },
  };

  return {
    db,
    store,
    get getCallCount() {
      return counters.count;
    },
    getCallKeys,
  };
}

describe('getUserByUsernameSearch(反向索引优化)', () => {
  test('命中场景:仅 2 次 db.get 即返回用户,不再扫描全表', async () => {
    const mock = createMockDb();
    const userRecord = {
      uid: 'uid-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      role: 'admin',
      userGroup: 'default',
    };
    mock.store.set('user:username:alice', 'uid-1');
    mock.store.set('user:uid:uid-1', JSON.stringify(userRecord));

    const result = await getUserByUsernameSearch(mock.db, 'alice');

    expect(result).toEqual({
      uid: 'uid-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      role: 'admin',
      userGroup: 'default',
    });
    // 关键断言:只有 2 次 db.get(1 次查反向索引,1 次查用户主记录)
    expect(mock.getCallCount).toBe(2);
    expect(mock.getCallKeys).toEqual(['user:username:alice', 'user:uid:uid-1']);
  });

  test('未命中:反向索引缺失时返回 null,且只读取 1 次', async () => {
    const mock = createMockDb();

    const result = await getUserByUsernameSearch(mock.db, 'nonexistent');

    expect(result).toBeNull();
    expect(mock.getCallCount).toBe(1);
    expect(mock.getCallKeys).toEqual(['user:username:nonexistent']);
  });

  test('反向索引指向的 uid 在主表中缺失时返回 null,读取 2 次', async () => {
    const mock = createMockDb();
    mock.store.set('user:username:ghost', 'uid-ghost');

    const result = await getUserByUsernameSearch(mock.db, 'ghost');

    expect(result).toBeNull();
    expect(mock.getCallCount).toBe(2);
  });
});
