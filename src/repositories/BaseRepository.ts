import { db } from '../database';

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected execute(query: string, params: unknown[] = []) {
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    try {
      return db.runSync(query, sanitizedParams as never[]); // Using never[] for sqlite binding generic matching
    } catch (error) {
      console.error("Execute failed on query:", query.trim());
      console.error("Sanitized params details:");
      sanitizedParams.forEach((p, idx) => {
        console.error(`  [${idx}] type=${typeof p} constructor=${p?.constructor?.name} val=`, p);
      });
      throw error;
    }
  }

  protected query<R>(query: string, params: unknown[] = []): R[] {
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    try {
      return db.getAllSync(query, sanitizedParams as never[]) as R[];
    } catch (error) {
      console.error("Query failed on query:", query.trim());
      console.error("Sanitized params details:");
      sanitizedParams.forEach((p, idx) => {
        console.error(`  [${idx}] type=${typeof p} constructor=${p?.constructor?.name} val=`, p);
      });
      throw error;
    }
  }
}
