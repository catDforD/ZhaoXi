use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

pub async fn init_database_async(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get the app data directory
    let app_dir: PathBuf = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("workbench.db");
    println!("Database path: {:?}", db_path);

    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    // Initialize tables
    init_tables(&pool).await?;

    // Insert default data if empty
    insert_default_data(&pool).await?;

    // Store the pool
    DB_POOL
        .set(pool)
        .map_err(|_| "Database already initialized")?;

    Ok(())
}

pub fn init_database(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // We need to block on the async function since setup is sync
    let runtime = tokio::runtime::Runtime::new()?;
    runtime.block_on(init_database_async(app_handle))?;
    Ok(())
}

pub fn get_db_pool() -> Result<&'static SqlitePool, String> {
    DB_POOL
        .get()
        .ok_or_else(|| "Database not initialized".to_string())
}

async fn init_tables(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Todos table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            priority TEXT DEFAULT 'normal',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Projects table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            deadline TEXT,
            progress INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Events table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            color TEXT DEFAULT 'blue',
            note TEXT
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Personal tasks table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS personal_tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            budget REAL,
            date TEXT,
            location TEXT,
            note TEXT
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS inspirations (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_inspirations_created_at
        ON inspirations(created_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_inspirations_is_archived_created_at
        ON inspirations(is_archived, created_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS info_sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'rss',
            url TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1,
            is_preset INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS info_settings (
            id TEXT PRIMARY KEY,
            push_time TEXT NOT NULL DEFAULT '09:00',
            include_keywords_json TEXT NOT NULL DEFAULT '[]',
            exclude_keywords_json TEXT NOT NULL DEFAULT '[]',
            max_items_per_day INTEGER NOT NULL DEFAULT 20,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS info_items_daily (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            source_id TEXT NOT NULL,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            summary TEXT,
            published_at TEXT,
            score REAL NOT NULL DEFAULT 0,
            matched_keywords_json TEXT NOT NULL DEFAULT '[]',
            fetched_at TEXT NOT NULL,
            UNIQUE(date, link)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS info_refresh_logs (
            id TEXT PRIMARY KEY,
            trigger_type TEXT NOT NULL,
            success INTEGER NOT NULL,
            message TEXT NOT NULL,
            fetched_count INTEGER NOT NULL DEFAULT 0,
            kept_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS agent_sessions (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            user_message TEXT,
            reply TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS agent_events (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            message TEXT NOT NULL,
            meta_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS agent_action_audits (
            id TEXT PRIMARY KEY,
            batch_id TEXT NOT NULL,
            action_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            before_state_json TEXT,
            after_state_json TEXT,
            success INTEGER NOT NULL,
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn insert_default_data(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check and insert default todos
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM todos")
        .fetch_one(pool)
        .await?;

    if count == 0 {
        sqlx::query(
            r#"
            INSERT INTO todos (id, title, completed, priority) VALUES
            ('1', '活动室ps出售', 0, 'normal'),
            ('2', '伙食费整理', 1, 'urgent')
            "#,
        )
        .execute(pool)
        .await?;
    }

    // Check and insert default projects
    let project_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects")
        .fetch_one(pool)
        .await?;

    if project_count == 0 {
        sqlx::query(
            r#"
            INSERT INTO projects (id, title, deadline, progress, status) VALUES
            ('1', '资料整理', '2025-12-31', 20, 'active')
            "#,
        )
        .execute(pool)
        .await?;
    }

    sqlx::query(
        r#"
        INSERT INTO info_settings (id, push_time, include_keywords_json, exclude_keywords_json, max_items_per_day)
        VALUES ('default', '09:00', '[]', '[]', 20)
        ON CONFLICT(id) DO NOTHING
        "#,
    )
    .execute(pool)
    .await?;

    let info_source_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM info_sources")
        .fetch_one(pool)
        .await?;

    if info_source_count == 0 {
        sqlx::query(
            r#"
            INSERT INTO info_sources (id, name, type, url, enabled, is_preset) VALUES
            ('preset-36kr', '36氪快讯', 'rss', 'https://36kr.com/feed', 1, 1),
            ('preset-huxiu', '虎嗅', 'rss', 'https://www.huxiu.com/rss/0.xml', 1, 1),
            ('preset-infoq', 'InfoQ 中文', 'rss', 'https://www.infoq.cn/feed', 1, 1),
            ('preset-geekpark', '极客公园', 'rss', 'https://www.geekpark.net/rss', 1, 1),
            ('preset-v2ex', 'V2EX 热点', 'rss', 'https://www.v2ex.com/index.xml', 1, 1),
            ('preset-juejin', '掘金', 'rss', 'https://juejin.cn/rss', 1, 1)
            "#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
