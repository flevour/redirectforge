/**
 * Minimal interface satisfied by pg.Pool, pg.Client, pg.PoolClient,
 * @vercel/postgres, @neondatabase/serverless, and similar libraries.
 */
export interface PgPool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}
