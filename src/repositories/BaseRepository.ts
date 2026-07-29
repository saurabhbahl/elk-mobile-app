import { db } from '../database';

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected execute(query: string, params: unknown[] = []) {
    return db.runSync(query, params as never[]); // Using never[] for sqlite binding generic matching
  }

  protected query<R>(query: string, params: unknown[] = []): R[] {
    return db.getAllSync(query, params as never[]) as R[];
  }
}
