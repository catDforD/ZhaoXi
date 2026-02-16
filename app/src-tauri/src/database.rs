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

    Ok(())
}
