import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  description: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Create users and game_results tables',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        elo_rating INTEGER DEFAULT 1200,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE game_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        opponent_name TEXT NOT NULL,
        opponent_user_id TEXT,
        result TEXT NOT NULL CHECK(result IN ('win','loss')),
        turns INTEGER NOT NULL,
        captures INTEGER DEFAULT 0,
        locks_formed INTEGER DEFAULT 0,
        game_mode TEXT DEFAULT 'online',
        player_count INTEGER DEFAULT 2,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX idx_game_results_user ON game_results(user_id);
      CREATE INDEX idx_game_results_created ON game_results(created_at);
    `,
  },
  {
    version: 2,
    description: 'Add email and password reset columns to users',
    sql: `
      ALTER TABLE users ADD COLUMN email TEXT;
      ALTER TABLE users ADD COLUMN password_reset_token TEXT;
      ALTER TABLE users ADD COLUMN password_reset_expires INTEGER;
      CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
    `,
  },
  {
    version: 3,
    description: 'Create friends table',
    sql: `
      CREATE TABLE friends (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        friend_user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, friend_user_id)
      );
      CREATE INDEX idx_friends_user ON friends(user_id);
      CREATE INDEX idx_friends_friend ON friends(friend_user_id);
    `,
  },
  {
    version: 4,
    description: 'Create friend_requests table for consent-based friendship',
    sql: `
      CREATE TABLE friend_requests (
        id TEXT PRIMARY KEY,
        requester_user_id TEXT NOT NULL REFERENCES users(id),
        recipient_user_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','canceled')),
        created_at INTEGER NOT NULL,
        responded_at INTEGER,
        UNIQUE(requester_user_id, recipient_user_id)
      );
      CREATE INDEX idx_friend_requests_requester ON friend_requests(requester_user_id);
      CREATE INDEX idx_friend_requests_recipient ON friend_requests(recipient_user_id);
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM _migrations').all()
      .map((row: any) => row.version as number)
  );

  const insert = db.prepare(
    'INSERT INTO _migrations (version, description, applied_at) VALUES (?, ?, ?)'
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    db.transaction(() => {
      db.exec(migration.sql);
      insert.run(migration.version, migration.description, Date.now());
    })();

    console.log(`Migration ${migration.version}: ${migration.description}`);
  }
}
