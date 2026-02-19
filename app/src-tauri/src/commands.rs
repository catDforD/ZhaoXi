use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Column, Row};
use std::cmp::Ordering;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{command, AppHandle, Emitter, Manager};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

use crate::database::get_db_pool;

// ============= Types =============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub priority: String,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub deadline: Option<String>,
    pub progress: i32,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub date: String,
    pub color: String,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalTask {
    pub id: String,
    pub title: String,
    pub budget: Option<f64>,
    pub date: Option<String>,
    pub location: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Inspiration {
    pub id: String,
    pub content: String,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InfoSource {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub url: String,
    pub enabled: bool,
    pub is_preset: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InfoSettings {
    pub push_time: String,
    pub include_keywords: Vec<String>,
    pub exclude_keywords: Vec<String>,
    pub max_items_per_day: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InfoItem {
    pub id: String,
    pub source_id: String,
    pub title: String,
    pub link: String,
    pub summary: Option<String>,
    pub published_at: Option<String>,
    pub score: f64,
    pub matched_keywords: Vec<String>,
    pub fetched_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfoRefreshResponse {
    pub success: bool,
    pub fetched_count: i32,
    pub kept_count: i32,
    pub message: String,
    pub refreshed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InfoRefreshStatus {
    pub last_refresh_at: Option<String>,
    pub last_success: bool,
    pub message: String,
    pub today_count: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeocodeCityRequest {
    pub city: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeocodeCityResponse {
    pub city: String,
    pub lat: f64,
    pub lon: f64,
    pub country: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCurrentWeatherRequest {
    pub lat: f64,
    pub lon: f64,
    pub city: String,
    pub location_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WeatherData {
    pub temperature: i32,
    pub condition: String,
    pub humidity: i32,
    pub wind_level: String,
    pub city: String,
    pub updated_at: String,
    pub source: String,
    pub location_name: String,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoGeocodingResponse {
    results: Option<Vec<OpenMeteoGeocodingItem>>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoGeocodingItem {
    name: String,
    latitude: f64,
    longitude: f64,
    country: Option<String>,
    timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoForecastResponse {
    current: OpenMeteoCurrent,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoCurrent {
    temperature_2m: f64,
    relative_humidity_2m: f64,
    wind_speed_10m: f64,
    weather_code: i32,
}

const BACKUP_SCHEMA_VERSION: &str = "zhaoxi-backup/v1";
const SQLITE_BACKUP_TABLES: [&str; 12] = [
    "todos",
    "projects",
    "events",
    "personal_tasks",
    "inspirations",
    "info_sources",
    "info_settings",
    "info_items_daily",
    "info_refresh_logs",
    "agent_sessions",
    "agent_events",
    "agent_action_audits",
];

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupLocalState {
    pub workbench_storage: Value,
    pub workbench_agent_storage: Value,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupTextFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupSkillDir {
    pub id: String,
    pub files: Vec<BackupTextFile>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupAgentFiles {
    pub mcp_servers: Vec<McpServerConfig>,
    pub user_commands: Vec<BackupTextFile>,
    pub user_skills: Vec<BackupSkillDir>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupSqliteData {
    pub todos: Vec<Value>,
    pub projects: Vec<Value>,
    pub events: Vec<Value>,
    pub personal_tasks: Vec<Value>,
    pub inspirations: Vec<Value>,
    pub info_sources: Vec<Value>,
    pub info_settings: Vec<Value>,
    pub info_items_daily: Vec<Value>,
    pub info_refresh_logs: Vec<Value>,
    pub agent_sessions: Vec<Value>,
    pub agent_events: Vec<Value>,
    pub agent_action_audits: Vec<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupPayload {
    pub sqlite: BackupSqliteData,
    pub local_state: BackupLocalState,
    pub agent_files: BackupAgentFiles,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupMeta {
    pub app: String,
    pub exported_at: String,
    pub platform: String,
    pub include_secrets: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupEnvelope {
    pub schema_version: String,
    pub meta: BackupMeta,
    pub payload: BackupPayload,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBackupRequest {
    pub path: String,
    pub include_secrets: Option<bool>,
    pub local_state: Option<BackupLocalState>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBackupResponse {
    pub path: String,
    pub created_at: String,
    pub schema_version: String,
    pub table_counts: HashMap<String, usize>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateBackupRequest {
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateBackupResponse {
    pub valid: bool,
    pub schema_version: Option<String>,
    pub issues: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBackupRequest {
    pub path: String,
    pub mode: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBackupResponse {
    pub restored_at: String,
    pub rollback_path: String,
    pub table_counts: HashMap<String, usize>,
    pub warnings: Vec<String>,
    pub local_state: BackupLocalState,
}

// ============= Backup Commands =============

#[command]
pub async fn validate_backup(request: ValidateBackupRequest) -> Result<ValidateBackupResponse, String> {
    let path = PathBuf::from(request.path.trim());
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取备份文件失败 ({}): {}", path.display(), e))?;
    let parsed: BackupEnvelope = serde_json::from_str(&content)
        .map_err(|e| format!("备份文件 JSON 解析失败: {}", e))?;

    let mut issues = Vec::new();
    if parsed.schema_version != BACKUP_SCHEMA_VERSION {
        issues.push(format!(
            "不支持的 schemaVersion: {} (期望 {})",
            parsed.schema_version, BACKUP_SCHEMA_VERSION
        ));
    }

    if parsed.payload.sqlite.todos.is_empty()
        && parsed.payload.sqlite.projects.is_empty()
        && parsed.payload.sqlite.events.is_empty()
        && parsed.payload.sqlite.personal_tasks.is_empty()
    {
        issues.push("备份中核心业务数据为空".to_string());
    }

    Ok(ValidateBackupResponse {
        valid: issues.is_empty(),
        schema_version: Some(parsed.schema_version),
        issues,
    })
}

#[command]
pub async fn export_backup(
    app: AppHandle,
    request: ExportBackupRequest,
) -> Result<ExportBackupResponse, String> {
    let include_secrets = request.include_secrets.unwrap_or(false);
    let (mut envelope, mut warnings, table_counts) =
        build_backup_envelope(&app, request.local_state, include_secrets).await?;
    if !include_secrets {
        sanitize_backup_envelope(&mut envelope);
    }

    let output_path = PathBuf::from(request.path.trim());
    if output_path.as_os_str().is_empty() {
        return Err("导出路径不能为空".to_string());
    }
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建导出目录失败 ({}): {}", parent.display(), e))?;
    }

    fs::write(
        &output_path,
        serde_json::to_string_pretty(&envelope)
            .map_err(|e| format!("序列化备份内容失败: {}", e))?,
    )
    .map_err(|e| format!("写入备份文件失败 ({}): {}", output_path.display(), e))?;

    if !include_secrets {
        warnings.push("敏感字段已按默认策略脱敏".to_string());
    }

    Ok(ExportBackupResponse {
        path: output_path.to_string_lossy().to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        schema_version: BACKUP_SCHEMA_VERSION.to_string(),
        table_counts,
        warnings,
    })
}

#[command]
pub async fn import_backup(
    app: AppHandle,
    request: ImportBackupRequest,
) -> Result<ImportBackupResponse, String> {
    if request.mode.trim().to_lowercase() != "replace" {
        return Err("当前仅支持 replace 导入模式".to_string());
    }
    let input_path = PathBuf::from(request.path.trim());
    let input_content = fs::read_to_string(&input_path)
        .map_err(|e| format!("读取导入文件失败 ({}): {}", input_path.display(), e))?;
    let envelope: BackupEnvelope = serde_json::from_str(&input_content)
        .map_err(|e| format!("导入文件解析失败: {}", e))?;
    if envelope.schema_version != BACKUP_SCHEMA_VERSION {
        return Err(format!(
            "不支持的备份版本: {} (期望 {})",
            envelope.schema_version, BACKUP_SCHEMA_VERSION
        ));
    }

    let (rollback_path, rollback_warnings) = create_rollback_backup(&app).await?;
    restore_sqlite_data(&envelope.payload.sqlite).await?;
    restore_agent_files(&app, &envelope.payload.agent_files)?;

    let table_counts = sqlite_table_counts_from_backup(&envelope.payload.sqlite);
    let mut warnings = rollback_warnings;
    if !envelope.meta.include_secrets {
        warnings.push("导入文件为脱敏备份，敏感配置需手动补全".to_string());
    }

    Ok(ImportBackupResponse {
        restored_at: chrono::Utc::now().to_rfc3339(),
        rollback_path,
        table_counts,
        warnings,
        local_state: envelope.payload.local_state,
    })
}

// ============= Weather Commands =============

#[command]
pub async fn geocode_city(request: GeocodeCityRequest) -> Result<GeocodeCityResponse, String> {
    let city = request.city.trim();
    if city.is_empty() {
        return Err("城市名称不能为空".to_string());
    }

    let endpoint = "https://geocoding-api.open-meteo.com/v1/search";
    let client = reqwest::Client::new();
    let response = client
        .get(endpoint)
        .query(&[
            ("name", city),
            ("count", "1"),
            ("language", "zh"),
            ("format", "json"),
        ])
        .send()
        .await
        .map_err(|e| format!("地理编码请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("地理编码服务异常: HTTP {}", response.status()));
    }

    let payload = response
        .json::<OpenMeteoGeocodingResponse>()
        .await
        .map_err(|e| format!("地理编码响应解析失败: {}", e))?;

    let result = payload
        .results
        .and_then(|items| items.into_iter().next())
        .ok_or_else(|| "未找到匹配城市".to_string())?;

    Ok(GeocodeCityResponse {
        city: result.name,
        lat: result.latitude,
        lon: result.longitude,
        country: result.country,
        timezone: result.timezone,
    })
}

#[command]
pub async fn get_current_weather(request: GetCurrentWeatherRequest) -> Result<WeatherData, String> {
    let city = request.city.trim();
    if city.is_empty() {
        return Err("城市名称不能为空".to_string());
    }

    let endpoint = "https://api.open-meteo.com/v1/forecast";
    let client = reqwest::Client::new();
    let response = client
        .get(endpoint)
        .query(&[
            ("latitude", request.lat.to_string()),
            ("longitude", request.lon.to_string()),
            (
                "current",
                "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code".to_string(),
            ),
            ("forecast_days", "1".to_string()),
            ("timezone", "auto".to_string()),
        ])
        .send()
        .await
        .map_err(|e| format!("天气请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("天气服务异常: HTTP {}", response.status()));
    }

    let payload = response
        .json::<OpenMeteoForecastResponse>()
        .await
        .map_err(|e| format!("天气响应解析失败: {}", e))?;

    Ok(WeatherData {
        temperature: payload.current.temperature_2m.round() as i32,
        humidity: payload.current.relative_humidity_2m.round() as i32,
        wind_level: wind_speed_to_level(payload.current.wind_speed_10m),
        condition: weather_code_to_condition(payload.current.weather_code).to_string(),
        city: city.to_string(),
        updated_at: chrono::Local::now().to_rfc3339(),
        source: "open-meteo".to_string(),
        location_name: request
            .location_name
            .unwrap_or_else(|| city.to_string()),
    })
}

// ============= Todo Commands =============

#[command]
pub async fn get_todos() -> Result<Vec<Todo>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query(
        "SELECT id, title, completed, priority, created_at FROM todos ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch todos: {}", e))?;

    let todos: Vec<Todo> = rows
        .into_iter()
        .map(|row| Todo {
            id: row.get("id"),
            title: row.get("title"),
            completed: row.get::<i32, _>("completed") != 0,
            priority: row.get("priority"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(todos)
}

#[derive(Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    #[serde(default)]
    pub priority: Option<String>,
}

#[command]
pub async fn create_todo(request: CreateTodoRequest) -> Result<Todo, String> {
    let pool = get_db_pool()?;
    let id = chrono::Utc::now().timestamp_millis().to_string();
    let priority = request.priority.unwrap_or_else(|| "normal".to_string());

    sqlx::query("INSERT INTO todos (id, title, priority) VALUES (?1, ?2, ?3)")
        .bind(&id)
        .bind(&request.title)
        .bind(&priority)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create todo: {}", e))?;

    let row =
        sqlx::query("SELECT id, title, completed, priority, created_at FROM todos WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch created todo: {}", e))?;

    Ok(Todo {
        id: row.get("id"),
        title: row.get("title"),
        completed: row.get::<i32, _>("completed") != 0,
        priority: row.get("priority"),
        created_at: row.get("created_at"),
    })
}

#[derive(Deserialize)]
pub struct UpdateTodoRequest {
    pub id: String,
    pub title: Option<String>,
    pub completed: Option<bool>,
    pub priority: Option<String>,
}

#[command]
pub async fn update_todo(request: UpdateTodoRequest) -> Result<Todo, String> {
    let pool = get_db_pool()?;

    // Build dynamic update query
    let mut updates: Vec<String> = Vec::new();

    if request.title.is_some() {
        updates.push("title = ?".to_string());
    }
    if request.completed.is_some() {
        updates.push("completed = ?".to_string());
    }
    if request.priority.is_some() {
        updates.push("priority = ?".to_string());
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    let query = format!("UPDATE todos SET {} WHERE id = ?", updates.join(", "));
    let mut query_builder = sqlx::query(&query);

    if let Some(title) = &request.title {
        query_builder = query_builder.bind(title);
    }
    if let Some(completed) = request.completed {
        query_builder = query_builder.bind(if completed { 1 } else { 0 });
    }
    if let Some(priority) = &request.priority {
        query_builder = query_builder.bind(priority);
    }
    query_builder = query_builder.bind(&request.id);

    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update todo: {}", e))?;

    let row =
        sqlx::query("SELECT id, title, completed, priority, created_at FROM todos WHERE id = ?1")
            .bind(&request.id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch updated todo: {}", e))?;

    Ok(Todo {
        id: row.get("id"),
        title: row.get("title"),
        completed: row.get::<i32, _>("completed") != 0,
        priority: row.get("priority"),
        created_at: row.get("created_at"),
    })
}

#[command]
pub async fn delete_todo(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM todos WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete todo: {}", e))?;
    Ok(())
}

// ============= Project Commands =============

#[command]
pub async fn get_projects() -> Result<Vec<Project>, String> {
    let pool = get_db_pool()?;
    let rows =
        sqlx::query("SELECT id, title, deadline, progress, status FROM projects ORDER BY deadline")
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch projects: {}", e))?;

    let projects: Vec<Project> = rows
        .into_iter()
        .map(|row| Project {
            id: row.get("id"),
            title: row.get("title"),
            deadline: row.get("deadline"),
            progress: row.get("progress"),
            status: row.get("status"),
        })
        .collect();

    Ok(projects)
}

#[derive(Deserialize)]
pub struct CreateProjectRequest {
    pub title: String,
    pub deadline: String,
}

#[command]
pub async fn create_project(request: CreateProjectRequest) -> Result<Project, String> {
    let pool = get_db_pool()?;
    let id = chrono::Utc::now().timestamp_millis().to_string();

    sqlx::query(
        "INSERT INTO projects (id, title, deadline, progress, status) VALUES (?1, ?2, ?3, 0, 'active')"
    )
    .bind(&id)
    .bind(&request.title)
    .bind(&request.deadline)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create project: {}", e))?;

    let row =
        sqlx::query("SELECT id, title, deadline, progress, status FROM projects WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch created project: {}", e))?;

    Ok(Project {
        id: row.get("id"),
        title: row.get("title"),
        deadline: row.get("deadline"),
        progress: row.get("progress"),
        status: row.get("status"),
    })
}

#[derive(Deserialize)]
pub struct UpdateProjectRequest {
    pub id: String,
    pub title: Option<String>,
    pub deadline: Option<String>,
    pub progress: Option<i32>,
    pub status: Option<String>,
}

#[command]
pub async fn update_project(request: UpdateProjectRequest) -> Result<Project, String> {
    let pool = get_db_pool()?;

    let mut updates: Vec<String> = Vec::new();

    if request.title.is_some() {
        updates.push("title = ?".to_string());
    }
    if request.deadline.is_some() {
        updates.push("deadline = ?".to_string());
    }
    if request.progress.is_some() {
        updates.push("progress = ?".to_string());
    }
    if request.status.is_some() {
        updates.push("status = ?".to_string());
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    let query = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
    let mut query_builder = sqlx::query(&query);

    if let Some(title) = &request.title {
        query_builder = query_builder.bind(title);
    }
    if let Some(deadline) = &request.deadline {
        query_builder = query_builder.bind(deadline);
    }
    if let Some(progress) = request.progress {
        query_builder = query_builder.bind(progress);
    }
    if let Some(status) = &request.status {
        query_builder = query_builder.bind(status);
    }
    query_builder = query_builder.bind(&request.id);

    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update project: {}", e))?;

    let row =
        sqlx::query("SELECT id, title, deadline, progress, status FROM projects WHERE id = ?1")
            .bind(&request.id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to fetch updated project: {}", e))?;

    Ok(Project {
        id: row.get("id"),
        title: row.get("title"),
        deadline: row.get("deadline"),
        progress: row.get("progress"),
        status: row.get("status"),
    })
}

#[command]
pub async fn delete_project(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM projects WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    Ok(())
}

// ============= Event Commands =============

#[command]
pub async fn get_events() -> Result<Vec<CalendarEvent>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query("SELECT id, title, date, color, note FROM events ORDER BY date")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch events: {}", e))?;

    let events: Vec<CalendarEvent> = rows
        .into_iter()
        .map(|row| CalendarEvent {
            id: row.get("id"),
            title: row.get("title"),
            date: row.get("date"),
            color: row.get("color"),
            note: row.get("note"),
        })
        .collect();

    Ok(events)
}

#[command]
pub async fn get_events_by_date(date: String) -> Result<Vec<CalendarEvent>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query("SELECT id, title, date, color, note FROM events WHERE date = ?1")
        .bind(&date)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch events: {}", e))?;

    let events: Vec<CalendarEvent> = rows
        .into_iter()
        .map(|row| CalendarEvent {
            id: row.get("id"),
            title: row.get("title"),
            date: row.get("date"),
            color: row.get("color"),
            note: row.get("note"),
        })
        .collect();

    Ok(events)
}

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub date: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[command]
pub async fn create_event(request: CreateEventRequest) -> Result<CalendarEvent, String> {
    let pool = get_db_pool()?;
    let id = chrono::Utc::now().timestamp_millis().to_string();
    let color = request.color.unwrap_or_else(|| "blue".to_string());

    sqlx::query("INSERT INTO events (id, title, date, color, note) VALUES (?1, ?2, ?3, ?4, ?5)")
        .bind(&id)
        .bind(&request.title)
        .bind(&request.date)
        .bind(&color)
        .bind(&request.note)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create event: {}", e))?;

    let row = sqlx::query("SELECT id, title, date, color, note FROM events WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch created event: {}", e))?;

    Ok(CalendarEvent {
        id: row.get("id"),
        title: row.get("title"),
        date: row.get("date"),
        color: row.get("color"),
        note: row.get("note"),
    })
}

#[derive(Deserialize)]
pub struct UpdateEventRequest {
    pub id: String,
    pub title: Option<String>,
    pub date: Option<String>,
    pub color: Option<String>,
    pub note: Option<String>,
}

#[command]
pub async fn update_event(request: UpdateEventRequest) -> Result<CalendarEvent, String> {
    let pool = get_db_pool()?;

    let mut updates: Vec<String> = Vec::new();

    if request.title.is_some() {
        updates.push("title = ?".to_string());
    }
    if request.date.is_some() {
        updates.push("date = ?".to_string());
    }
    if request.color.is_some() {
        updates.push("color = ?".to_string());
    }
    if request.note.is_some() {
        updates.push("note = ?".to_string());
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    let query = format!("UPDATE events SET {} WHERE id = ?", updates.join(", "));
    let mut query_builder = sqlx::query(&query);

    if let Some(title) = &request.title {
        query_builder = query_builder.bind(title);
    }
    if let Some(date) = &request.date {
        query_builder = query_builder.bind(date);
    }
    if let Some(color) = &request.color {
        query_builder = query_builder.bind(color);
    }
    if let Some(note) = &request.note {
        query_builder = query_builder.bind(note);
    }
    query_builder = query_builder.bind(&request.id);

    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update event: {}", e))?;

    let row = sqlx::query("SELECT id, title, date, color, note FROM events WHERE id = ?1")
        .bind(&request.id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to fetch updated event: {}", e))?;

    Ok(CalendarEvent {
        id: row.get("id"),
        title: row.get("title"),
        date: row.get("date"),
        color: row.get("color"),
        note: row.get("note"),
    })
}

#[command]
pub async fn delete_event(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM events WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete event: {}", e))?;
    Ok(())
}

// ============= Personal Task Commands =============

#[command]
pub async fn get_personal_tasks() -> Result<Vec<PersonalTask>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query(
        "SELECT id, title, budget, date, location, note FROM personal_tasks ORDER BY date",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch personal tasks: {}", e))?;

    let tasks: Vec<PersonalTask> = rows
        .into_iter()
        .map(|row| PersonalTask {
            id: row.get("id"),
            title: row.get("title"),
            budget: row.get("budget"),
            date: row.get("date"),
            location: row.get("location"),
            note: row.get("note"),
        })
        .collect();

    Ok(tasks)
}

#[derive(Deserialize)]
pub struct CreatePersonalTaskRequest {
    pub title: String,
    #[serde(default)]
    pub budget: Option<f64>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[command]
pub async fn create_personal_task(
    request: CreatePersonalTaskRequest,
) -> Result<PersonalTask, String> {
    let pool = get_db_pool()?;
    let id = chrono::Utc::now().timestamp_millis().to_string();

    sqlx::query(
        "INSERT INTO personal_tasks (id, title, budget, date, location, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    )
    .bind(&id)
    .bind(&request.title)
    .bind(request.budget)
    .bind(&request.date)
    .bind(&request.location)
    .bind(&request.note)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create personal task: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, budget, date, location, note FROM personal_tasks WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch created personal task: {}", e))?;

    Ok(PersonalTask {
        id: row.get("id"),
        title: row.get("title"),
        budget: row.get("budget"),
        date: row.get("date"),
        location: row.get("location"),
        note: row.get("note"),
    })
}

#[derive(Deserialize)]
pub struct UpdatePersonalTaskRequest {
    pub id: String,
    pub title: Option<String>,
    pub budget: Option<f64>,
    pub date: Option<String>,
    pub location: Option<String>,
    pub note: Option<String>,
}

#[command]
pub async fn update_personal_task(
    request: UpdatePersonalTaskRequest,
) -> Result<PersonalTask, String> {
    let pool = get_db_pool()?;

    let mut updates: Vec<String> = Vec::new();

    if request.title.is_some() {
        updates.push("title = ?".to_string());
    }
    if request.budget.is_some() {
        updates.push("budget = ?".to_string());
    }
    if request.date.is_some() {
        updates.push("date = ?".to_string());
    }
    if request.location.is_some() {
        updates.push("location = ?".to_string());
    }
    if request.note.is_some() {
        updates.push("note = ?".to_string());
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    let query = format!(
        "UPDATE personal_tasks SET {} WHERE id = ?",
        updates.join(", ")
    );
    let mut query_builder = sqlx::query(&query);

    if let Some(title) = &request.title {
        query_builder = query_builder.bind(title);
    }
    if let Some(budget) = request.budget {
        query_builder = query_builder.bind(budget);
    }
    if let Some(date) = &request.date {
        query_builder = query_builder.bind(date);
    }
    if let Some(location) = &request.location {
        query_builder = query_builder.bind(location);
    }
    if let Some(note) = &request.note {
        query_builder = query_builder.bind(note);
    }
    query_builder = query_builder.bind(&request.id);

    query_builder
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update personal task: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, budget, date, location, note FROM personal_tasks WHERE id = ?1",
    )
    .bind(&request.id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch updated personal task: {}", e))?;

    Ok(PersonalTask {
        id: row.get("id"),
        title: row.get("title"),
        budget: row.get("budget"),
        date: row.get("date"),
        location: row.get("location"),
        note: row.get("note"),
    })
}

#[command]
pub async fn delete_personal_task(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM personal_tasks WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete personal task: {}", e))?;
    Ok(())
}

// ============= Inspiration Commands =============

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateInspirationRequest {
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleInspirationArchivedRequest {
    pub id: String,
    pub is_archived: bool,
}

#[command]
pub async fn get_inspirations(include_archived: Option<bool>) -> Result<Vec<Inspiration>, String> {
    let pool = get_db_pool()?;
    let show_archived = include_archived.unwrap_or(true);

    let rows = if show_archived {
        sqlx::query(
            "SELECT id, content, is_archived, created_at, updated_at
             FROM inspirations
             ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch inspirations: {}", e))?
    } else {
        sqlx::query(
            "SELECT id, content, is_archived, created_at, updated_at
             FROM inspirations
             WHERE is_archived = 0
             ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch inspirations: {}", e))?
    };

    Ok(rows
        .into_iter()
        .map(|row| Inspiration {
            id: row.get("id"),
            content: row.get("content"),
            is_archived: row.get::<i32, _>("is_archived") != 0,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}

#[command]
pub async fn create_inspiration(request: CreateInspirationRequest) -> Result<Inspiration, String> {
    let pool = get_db_pool()?;
    let content = request.content.trim();
    if content.is_empty() {
        return Err("Inspiration content cannot be empty".to_string());
    }
    let id = chrono::Utc::now().timestamp_millis().to_string();

    sqlx::query(
        "INSERT INTO inspirations (id, content, is_archived, created_at, updated_at)
         VALUES (?1, ?2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    )
    .bind(&id)
    .bind(content)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create inspiration: {}", e))?;

    let row = sqlx::query(
        "SELECT id, content, is_archived, created_at, updated_at
         FROM inspirations
         WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch created inspiration: {}", e))?;

    Ok(Inspiration {
        id: row.get("id"),
        content: row.get("content"),
        is_archived: row.get::<i32, _>("is_archived") != 0,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn toggle_inspiration_archived(
    request: ToggleInspirationArchivedRequest,
) -> Result<Inspiration, String> {
    let pool = get_db_pool()?;

    sqlx::query(
        "UPDATE inspirations
         SET is_archived = ?1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?2",
    )
    .bind(if request.is_archived { 1 } else { 0 })
    .bind(&request.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update inspiration status: {}", e))?;

    let row = sqlx::query(
        "SELECT id, content, is_archived, created_at, updated_at
         FROM inspirations
         WHERE id = ?1",
    )
    .bind(&request.id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch updated inspiration: {}", e))?;

    Ok(Inspiration {
        id: row.get("id"),
        content: row.get("content"),
        is_archived: row.get::<i32, _>("is_archived") != 0,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn delete_inspiration(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM inspirations WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete inspiration: {}", e))?;
    Ok(())
}

// ============= Daily Info Center Commands =============

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertInfoSourceRequest {
    pub id: Option<String>,
    pub name: String,
    pub url: String,
    #[serde(default = "default_info_source_type")]
    pub r#type: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub is_preset: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfoSettingsRequest {
    pub push_time: String,
    #[serde(default)]
    pub include_keywords: Vec<String>,
    #[serde(default)]
    pub exclude_keywords: Vec<String>,
    pub max_items_per_day: i32,
}

#[command]
pub async fn get_info_sources() -> Result<Vec<InfoSource>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query(
        "SELECT id, name, type, url, enabled, is_preset, created_at, updated_at
         FROM info_sources
         ORDER BY is_preset DESC, created_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch info sources: {}", e))?;

    Ok(rows
        .into_iter()
        .map(|row| InfoSource {
            id: row.get("id"),
            name: row.get("name"),
            r#type: row.get("type"),
            url: row.get("url"),
            enabled: row.get::<i32, _>("enabled") != 0,
            is_preset: row.get::<i32, _>("is_preset") != 0,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}

#[command]
pub async fn upsert_info_source(request: UpsertInfoSourceRequest) -> Result<InfoSource, String> {
    let pool = get_db_pool()?;
    let source_id = request
        .id
        .clone()
        .unwrap_or_else(|| format!("source-{}", chrono::Utc::now().timestamp_millis()));
    let source_type = if request.r#type.trim().is_empty() {
        "rss".to_string()
    } else {
        request.r#type.trim().to_lowercase()
    };

    sqlx::query(
        "INSERT INTO info_sources (id, name, type, url, enabled, is_preset, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            url = excluded.url,
            enabled = excluded.enabled,
            updated_at = CURRENT_TIMESTAMP",
    )
    .bind(&source_id)
    .bind(request.name.trim())
    .bind(&source_type)
    .bind(request.url.trim())
    .bind(if request.enabled { 1 } else { 0 })
    .bind(if request.is_preset { 1 } else { 0 })
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to upsert info source: {}", e))?;

    let row = sqlx::query(
        "SELECT id, name, type, url, enabled, is_preset, created_at, updated_at
         FROM info_sources WHERE id = ?1",
    )
    .bind(&source_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch updated source: {}", e))?;

    Ok(InfoSource {
        id: row.get("id"),
        name: row.get("name"),
        r#type: row.get("type"),
        url: row.get("url"),
        enabled: row.get::<i32, _>("enabled") != 0,
        is_preset: row.get::<i32, _>("is_preset") != 0,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[command]
pub async fn delete_info_source(id: String) -> Result<(), String> {
    let pool = get_db_pool()?;
    sqlx::query("DELETE FROM info_sources WHERE id = ?1")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete info source: {}", e))?;
    Ok(())
}

#[command]
pub async fn get_info_settings() -> Result<InfoSettings, String> {
    load_info_settings().await
}

#[command]
pub async fn update_info_settings(
    request: UpdateInfoSettingsRequest,
) -> Result<InfoSettings, String> {
    let pool = get_db_pool()?;
    let include_keywords_json =
        serde_json::to_string(&normalize_keywords(request.include_keywords)).map_err(|e| {
            format!(
                "Failed to serialize include keywords for info settings: {}",
                e
            )
        })?;
    let exclude_keywords_json =
        serde_json::to_string(&normalize_keywords(request.exclude_keywords)).map_err(|e| {
            format!(
                "Failed to serialize exclude keywords for info settings: {}",
                e
            )
        })?;
    let max_items_per_day = request.max_items_per_day.clamp(1, 100);
    let push_time = normalize_push_time(&request.push_time);

    sqlx::query(
        "INSERT INTO info_settings (id, push_time, include_keywords_json, exclude_keywords_json, max_items_per_day, updated_at)
         VALUES ('default', ?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            push_time = excluded.push_time,
            include_keywords_json = excluded.include_keywords_json,
            exclude_keywords_json = excluded.exclude_keywords_json,
            max_items_per_day = excluded.max_items_per_day,
            updated_at = CURRENT_TIMESTAMP",
    )
    .bind(&push_time)
    .bind(include_keywords_json)
    .bind(exclude_keywords_json)
    .bind(max_items_per_day)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update info settings: {}", e))?;

    load_info_settings().await
}

#[command]
pub async fn get_today_info_items() -> Result<Vec<InfoItem>, String> {
    let pool = get_db_pool()?;
    let date = local_today_string();
    let rows = sqlx::query(
        "SELECT id, source_id, title, link, summary, published_at, score, matched_keywords_json, fetched_at
         FROM info_items_daily
         WHERE date = ?1
         ORDER BY score DESC, fetched_at DESC",
    )
    .bind(&date)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch today info items: {}", e))?;

    Ok(rows
        .into_iter()
        .map(row_to_info_item)
        .collect::<Result<Vec<_>, _>>()?)
}

#[command]
pub async fn refresh_info_now() -> Result<InfoRefreshResponse, String> {
    refresh_info_with_trigger("manual").await
}

#[command]
pub async fn get_info_refresh_status() -> Result<InfoRefreshStatus, String> {
    let pool = get_db_pool()?;
    let date = local_today_string();
    let today_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM info_items_daily WHERE date = ?1")
            .bind(&date)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Failed to count today info items: {}", e))?;

    let log_row = sqlx::query(
        "SELECT success, message, created_at
         FROM info_refresh_logs
         ORDER BY created_at DESC
         LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch refresh status: {}", e))?;

    if let Some(row) = log_row {
        return Ok(InfoRefreshStatus {
            last_refresh_at: row.get("created_at"),
            last_success: row.get::<i32, _>("success") != 0,
            message: row.get::<String, _>("message"),
            today_count,
        });
    }

    Ok(InfoRefreshStatus {
        last_refresh_at: None,
        last_success: true,
        message: "尚未刷新".to_string(),
        today_count,
    })
}

#[command]
pub async fn open_external_link(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err("Only http/https links are allowed".to_string());
    }
    webbrowser::open(trimmed).map_err(|e| format!("Failed to open link: {}", e))?;
    Ok(())
}

// ============= Agent Commands =============

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentProviderConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub api_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettings {
    pub provider: String,
    #[serde(default = "default_openai_provider")]
    pub openai: AgentProviderConfig,
    #[serde(default = "default_anthropic_provider")]
    pub anthropic: AgentProviderConfig,
    #[serde(default = "default_minimax_provider")]
    pub minimax: AgentProviderConfig,
    #[serde(default)]
    pub codex: AgentCodexConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentCodexConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub binary_path: Option<String>,
    #[serde(default = "default_true")]
    pub prefer_mcp: bool,
    #[serde(default = "default_codex_exec_args")]
    pub exec_args: Vec<String>,
    #[serde(default = "default_codex_mcp_args")]
    pub mcp_args: Vec<String>,
    #[serde(default = "default_codex_timeout_ms")]
    pub request_timeout_ms: u64,
}

impl Default for AgentCodexConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            binary_path: None,
            prefer_mcp: true,
            exec_args: default_codex_exec_args(),
            mcp_args: default_codex_mcp_args(),
            request_timeout_ms: default_codex_timeout_ms(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentChatRequest {
    pub request_id: Option<String>,
    pub messages: Vec<AgentMessage>,
    pub settings: AgentSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentActionProposal {
    pub id: String,
    pub r#type: String,
    pub title: String,
    pub reason: String,
    pub payload: Value,
    pub requires_approval: bool,
}

#[derive(Debug, Serialize)]
pub struct AgentChatResponse {
    pub reply: String,
    pub actions: Vec<AgentActionProposal>,
}

#[derive(Debug, Deserialize)]
pub struct AgentExecuteRequest {
    pub action: AgentActionProposal,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentExecuteActionsRequest {
    #[serde(default)]
    pub request_id: Option<String>,
    pub actions: Vec<AgentActionProposal>,
}

#[derive(Debug, Serialize)]
pub struct AgentExecuteResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentExecutionAuditRecord {
    pub id: String,
    pub batch_id: String,
    pub action_id: String,
    pub action_type: String,
    pub payload: Value,
    pub before_state: Option<Value>,
    pub after_state: Option<Value>,
    pub success: bool,
    pub error: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentExecuteActionsResponse {
    pub success: bool,
    pub batch_id: String,
    pub message: String,
    pub records: Vec<AgentExecutionAuditRecord>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentStreamEvent {
    pub request_id: String,
    pub stage: String,
    pub message: String,
    pub meta: Option<Value>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCodexHealth {
    pub found: bool,
    pub binary: Option<String>,
    pub mcp_available: bool,
    pub exec_available: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCapabilities {
    pub builtin_tools: Vec<String>,
    pub skills: Vec<String>,
    pub mcp_servers: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ReloadSkillsResponse {
    pub reloaded: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReloadToolingResponse {
    pub mcp_servers: usize,
    pub skills: usize,
    pub commands: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub name: String,
    #[serde(default = "default_stdio_transport")]
    pub transport: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    pub cwd: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct McpServerFile {
    servers: Vec<McpServerConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub path: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentCommandConfig {
    pub slug: String,
    pub title: String,
    pub description: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_insert_mode")]
    pub mode: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub body: String,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolingConfig {
    pub mcp_servers: Vec<McpServerConfig>,
    pub skills: Vec<SkillConfig>,
    pub commands: Vec<AgentCommandConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertMcpServerRequest {
    pub server: McpServerConfig,
}

#[derive(Debug, Deserialize)]
pub struct DeleteMcpServerRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportSkillRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleSkillRequest {
    pub id: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct DeleteSkillRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertCommandRequest {
    pub command: AgentCommandConfig,
}

#[derive(Debug, Deserialize)]
pub struct ImportCommandMarkdownRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteCommandRequest {
    pub slug: String,
}

#[command]
pub async fn agent_chat(
    app: AppHandle,
    request: AgentChatRequest,
) -> Result<AgentChatResponse, String> {
    let snapshot = build_context_snapshot().await?;
    let request_id = request
        .request_id
        .clone()
        .unwrap_or_else(|| format!("req-{}", chrono::Utc::now().timestamp_millis()));
    emit_agent_event(
        &app,
        &request_id,
        "runtime_detect",
        "正在选择 Agent 运行时",
        None,
    );

    match call_provider(&app, &request_id, &request, &snapshot).await {
        Ok(mut response) => {
            if !response.actions.is_empty() {
                emit_agent_event(
                    &app,
                    &request_id,
                    "executing",
                    "已生成动作，开始自动执行",
                    Some(json!({ "count": response.actions.len() })),
                );
                let execution = agent_execute_actions_atomic(
                    app.clone(),
                    AgentExecuteActionsRequest {
                        request_id: Some(request_id.clone()),
                        actions: response.actions.clone(),
                    },
                )
                .await?;

                if execution.success {
                    response.reply = format!(
                        "{}\n\n已自动执行 {} 条动作（batch: {}）。",
                        response.reply,
                        execution.records.len(),
                        execution.batch_id
                    );
                } else {
                    response.reply = format!(
                        "{}\n\n自动执行失败（batch: {}）：{}",
                        response.reply, execution.batch_id, execution.message
                    );
                }
                response.actions = vec![];
            }

            persist_agent_session(
                &request_id,
                &request.settings.provider,
                &request.messages,
                &response.reply,
            )
            .await;
            emit_agent_event(&app, &request_id, "completed", "已完成", None);
            Ok(response)
        }
        Err(error) => {
            emit_agent_event(
                &app,
                &request_id,
                "error",
                "模型服务调用失败，准备降级",
                Some(json!({ "reason": error.clone(), "retryable": true })),
            );
            emit_agent_event(&app, &request_id, "fallback", "已切换为本地建议模式", None);
            let response = local_fallback_response(&request.messages, &snapshot, Some(error));
            persist_agent_session(
                &request_id,
                &request.settings.provider,
                &request.messages,
                &response.reply,
            )
            .await;
            emit_agent_event(&app, &request_id, "completed", "已完成（fallback）", None);
            Ok(response)
        }
    }
}

#[command]
pub async fn agent_execute_action(
    request: AgentExecuteRequest,
) -> Result<AgentExecuteResponse, String> {
    let pool = get_db_pool()?;
    let action = request.action;
    validate_action(&action.r#type, &action.payload)?;
    let result = match action.r#type.as_str() {
        "todo.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let priority = get_optional_str(&action.payload, "priority").unwrap_or("normal");
            let id = chrono::Utc::now().timestamp_millis().to_string();
            sqlx::query("INSERT INTO todos (id, title, priority) VALUES (?1, ?2, ?3)")
                .bind(&id)
                .bind(title)
                .bind(priority)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to create todo: {}", e))?;
            "待办已创建".to_string()
        }
        "todo.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let completed = action
                .payload
                .get("completed")
                .and_then(|value| value.as_bool());
            let priority = get_optional_str(&action.payload, "priority");

            if title.is_none() && completed.is_none() && priority.is_none() {
                return Err("todo.update 缺少可更新字段".to_string());
            }

            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if completed.is_some() {
                updates.push("completed = ?".to_string());
            }
            if priority.is_some() {
                updates.push("priority = ?".to_string());
            }
            let query = format!("UPDATE todos SET {} WHERE id = ?", updates.join(", "));
            let mut query_builder = sqlx::query(&query);

            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = completed {
                query_builder = query_builder.bind(if value { 1 } else { 0 });
            }
            if let Some(value) = priority {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update todo: {}", e))?;
            "待办已更新".to_string()
        }
        "todo.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM todos WHERE id = ?1")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to delete todo: {}", e))?;
            "待办已删除".to_string()
        }
        "project.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let deadline = get_required_str(&action.payload, "deadline")?;
            let id = chrono::Utc::now().timestamp_millis().to_string();
            sqlx::query(
                "INSERT INTO projects (id, title, deadline, progress, status) VALUES (?1, ?2, ?3, 0, 'active')",
            )
            .bind(&id)
            .bind(title)
            .bind(deadline)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to create project: {}", e))?;
            "项目已创建".to_string()
        }
        "project.update_progress" => {
            let id = get_required_str(&action.payload, "id")?;
            let progress = action
                .payload
                .get("progress")
                .and_then(|value| value.as_i64())
                .ok_or("project.update_progress 缺少 progress")?;
            sqlx::query("UPDATE projects SET progress = ?1 WHERE id = ?2")
                .bind(progress as i32)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update project progress: {}", e))?;
            "项目进度已更新".to_string()
        }
        "project.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM projects WHERE id = ?1")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to delete project: {}", e))?;
            "项目已删除".to_string()
        }
        "event.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let date = get_required_str(&action.payload, "date")?;
            let color = get_optional_str(&action.payload, "color").unwrap_or("blue");
            let note = get_optional_str(&action.payload, "note");
            let id = chrono::Utc::now().timestamp_millis().to_string();
            sqlx::query(
                "INSERT INTO events (id, title, date, color, note) VALUES (?1, ?2, ?3, ?4, ?5)",
            )
            .bind(&id)
            .bind(title)
            .bind(date)
            .bind(color)
            .bind(note)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to create event: {}", e))?;
            "日程已创建".to_string()
        }
        "event.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let date = get_optional_str(&action.payload, "date");
            let color = get_optional_str(&action.payload, "color");
            let note = get_optional_str(&action.payload, "note");
            if title.is_none() && date.is_none() && color.is_none() && note.is_none() {
                return Err("event.update 缺少可更新字段".to_string());
            }
            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if date.is_some() {
                updates.push("date = ?".to_string());
            }
            if color.is_some() {
                updates.push("color = ?".to_string());
            }
            if note.is_some() {
                updates.push("note = ?".to_string());
            }
            let query = format!("UPDATE events SET {} WHERE id = ?", updates.join(", "));
            let mut query_builder = sqlx::query(&query);
            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = date {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = color {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = note {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update event: {}", e))?;
            "日程已更新".to_string()
        }
        "event.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM events WHERE id = ?1")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to delete event: {}", e))?;
            "日程已删除".to_string()
        }
        "personal.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let id = chrono::Utc::now().timestamp_millis().to_string();
            let budget = action
                .payload
                .get("budget")
                .and_then(|value| value.as_f64());
            let date = get_optional_str(&action.payload, "date");
            let location = get_optional_str(&action.payload, "location");
            let note = get_optional_str(&action.payload, "note");
            sqlx::query(
                "INSERT INTO personal_tasks (id, title, budget, date, location, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(&id)
            .bind(title)
            .bind(budget)
            .bind(date)
            .bind(location)
            .bind(note)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to create personal task: {}", e))?;
            "个人事务已创建".to_string()
        }
        "personal.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let budget = action
                .payload
                .get("budget")
                .and_then(|value| value.as_f64());
            let date = get_optional_str(&action.payload, "date");
            let location = get_optional_str(&action.payload, "location");
            let note = get_optional_str(&action.payload, "note");
            if title.is_none()
                && budget.is_none()
                && date.is_none()
                && location.is_none()
                && note.is_none()
            {
                return Err("personal.update 缺少可更新字段".to_string());
            }
            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if budget.is_some() {
                updates.push("budget = ?".to_string());
            }
            if date.is_some() {
                updates.push("date = ?".to_string());
            }
            if location.is_some() {
                updates.push("location = ?".to_string());
            }
            if note.is_some() {
                updates.push("note = ?".to_string());
            }
            let query = format!(
                "UPDATE personal_tasks SET {} WHERE id = ?",
                updates.join(", ")
            );
            let mut query_builder = sqlx::query(&query);
            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = budget {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = date {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = location {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = note {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to update personal task: {}", e))?;
            "个人事务已更新".to_string()
        }
        "personal.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM personal_tasks WHERE id = ?1")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| format!("Failed to delete personal task: {}", e))?;
            "个人事务已删除".to_string()
        }
        "query.snapshot" => "当前快照已生成".to_string(),
        _ => return Err(format!("Unsupported action type: {}", action.r#type)),
    };

    Ok(AgentExecuteResponse {
        success: true,
        message: result,
    })
}

#[command]
pub async fn agent_execute_actions_atomic(
    app: AppHandle,
    request: AgentExecuteActionsRequest,
) -> Result<AgentExecuteActionsResponse, String> {
    let pool = get_db_pool()?;
    let batch_id = format!("batch-{}", chrono::Utc::now().timestamp_millis());
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut records: Vec<AgentExecutionAuditRecord> = vec![];
    let now = chrono::Utc::now().to_rfc3339();
    let total = request.actions.len();
    let mut completed = 0usize;
    let mut success = 0usize;
    let mut failed = 0usize;

    if let Some(request_id) = &request.request_id {
        emit_agent_event(
            &app,
            request_id,
            "executing",
            "开始执行动作",
            Some(json!({
                "total": total,
                "completed": completed,
                "success": success,
                "failed": failed
            })),
        );
    }

    for action in &request.actions {
        validate_action(&action.r#type, &action.payload)?;
        let before_state = None;
        let result = execute_action_with_transaction(&mut tx, action).await;
        match result {
            Ok(message) => {
                completed += 1;
                success += 1;
                records.push(AgentExecutionAuditRecord {
                    id: format!(
                        "audit-{}",
                        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
                    ),
                    batch_id: batch_id.clone(),
                    action_id: action.id.clone(),
                    action_type: action.r#type.clone(),
                    payload: action.payload.clone(),
                    before_state,
                    after_state: Some(json!({ "message": message })),
                    success: true,
                    error: None,
                    created_at: now.clone(),
                });
                if let Some(request_id) = &request.request_id {
                    emit_agent_event(
                        &app,
                        request_id,
                        "executing",
                        "动作执行成功",
                        Some(json!({
                            "total": total,
                            "completed": completed,
                            "success": success,
                            "failed": failed,
                            "actionType": action.r#type,
                            "actionId": action.id
                        })),
                    );
                }
            }
            Err(error) => {
                completed += 1;
                failed += 1;
                tx.rollback()
                    .await
                    .map_err(|e| format!("Failed to rollback transaction: {}", e))?;
                if let Some(request_id) = &request.request_id {
                    emit_agent_event(
                        &app,
                        request_id,
                        "executing",
                        "动作执行失败，事务已回滚",
                        Some(json!({
                            "total": total,
                            "completed": completed,
                            "success": success,
                            "failed": failed,
                            "actionType": action.r#type,
                            "actionId": action.id
                        })),
                    );
                    emit_agent_event(
                        &app,
                        request_id,
                        "error",
                        "批量动作执行失败",
                        Some(json!({ "reason": error.clone(), "retryable": true })),
                    );
                }
                let failed = AgentExecutionAuditRecord {
                    id: format!(
                        "audit-{}",
                        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
                    ),
                    batch_id: batch_id.clone(),
                    action_id: action.id.clone(),
                    action_type: action.r#type.clone(),
                    payload: action.payload.clone(),
                    before_state: None,
                    after_state: None,
                    success: false,
                    error: Some(error.clone()),
                    created_at: now,
                };
                persist_audit_records(&[failed.clone()]).await;
                return Ok(AgentExecuteActionsResponse {
                    success: false,
                    batch_id,
                    message: error,
                    records: vec![failed],
                });
            }
        }
    }

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    persist_audit_records(&records).await;

    Ok(AgentExecuteActionsResponse {
        success: true,
        batch_id,
        message: "批量动作已执行".to_string(),
        records,
    })
}

#[command]
pub async fn agent_list_capabilities(app: AppHandle) -> Result<AgentCapabilities, String> {
    let tooling = load_tooling_config(&app)?;
    let skills = tooling
        .skills
        .into_iter()
        .filter(|item| item.enabled)
        .map(|item| item.id)
        .collect::<Vec<String>>();
    let mcp_servers = tooling
        .mcp_servers
        .into_iter()
        .filter(|item| item.enabled)
        .map(|item| item.name)
        .collect::<Vec<String>>();
    Ok(AgentCapabilities {
        builtin_tools: vec![
            "todo.create".to_string(),
            "todo.update".to_string(),
            "todo.delete".to_string(),
            "project.create".to_string(),
            "project.update_progress".to_string(),
            "project.delete".to_string(),
            "event.create".to_string(),
            "event.update".to_string(),
            "event.delete".to_string(),
            "personal.create".to_string(),
            "personal.update".to_string(),
            "personal.delete".to_string(),
            "query.snapshot".to_string(),
        ],
        skills,
        mcp_servers,
    })
}

#[command]
pub async fn agent_reload_skills(app: AppHandle) -> Result<ReloadSkillsResponse, String> {
    let reloaded = load_tooling_config(&app)?.skills.len();
    Ok(ReloadSkillsResponse { reloaded })
}

#[command]
pub async fn agent_list_mcp_servers(app: AppHandle) -> Result<Vec<String>, String> {
    Ok(load_tooling_config(&app)?
        .mcp_servers
        .into_iter()
        .filter(|item| item.enabled)
        .map(|item| item.name)
        .collect::<Vec<String>>())
}

#[command]
pub async fn agent_get_tooling_config(app: AppHandle) -> Result<AgentToolingConfig, String> {
    load_tooling_config(&app)
}

#[command]
pub async fn agent_reload_tooling(app: AppHandle) -> Result<ReloadToolingResponse, String> {
    let tooling = load_tooling_config(&app)?;
    Ok(ReloadToolingResponse {
        mcp_servers: tooling.mcp_servers.len(),
        skills: tooling.skills.len(),
        commands: tooling.commands.len(),
    })
}

#[command]
pub async fn agent_upsert_mcp_server(
    app: AppHandle,
    request: UpsertMcpServerRequest,
) -> Result<(), String> {
    validate_mcp_server(&request.server)?;
    let mut servers = load_user_mcp_servers(&app)?;
    let key = request.server.name.to_lowercase();
    if let Some(index) = servers
        .iter()
        .position(|item| item.name.to_lowercase() == key)
    {
        servers[index] = request.server;
    } else {
        servers.push(request.server);
    }
    write_user_mcp_servers(&app, &servers)
}

#[command]
pub async fn agent_delete_mcp_server(
    app: AppHandle,
    request: DeleteMcpServerRequest,
) -> Result<(), String> {
    let mut servers = load_user_mcp_servers(&app)?;
    servers.retain(|item| item.name != request.name);
    write_user_mcp_servers(&app, &servers)
}

#[command]
pub async fn agent_import_skill(
    app: AppHandle,
    request: ImportSkillRequest,
) -> Result<SkillConfig, String> {
    let src = PathBuf::from(request.path);
    if !src.exists() || !src.is_dir() {
        return Err("Skill path does not exist or is not a directory".to_string());
    }

    let skill = read_skill_manifest(&src, "user")?;
    let user_skills_root = ensure_user_skills_dir(&app)?;
    let dst = user_skills_root.join(&skill.id);
    if dst.exists() {
        fs::remove_dir_all(&dst).map_err(|e| format!("Failed to replace skill: {}", e))?;
    }
    copy_dir_recursive(&src, &dst)?;
    read_skill_manifest(&dst, "user")
}

#[command]
pub async fn agent_toggle_skill(app: AppHandle, request: ToggleSkillRequest) -> Result<(), String> {
    let user_skills_root = ensure_user_skills_dir(&app)?;
    let manifest_path = user_skills_root.join(&request.id).join("manifest.json");
    if !manifest_path.exists() {
        return Err("Only imported user skills can be toggled".to_string());
    }
    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read skill manifest: {}", e))?;
    let mut manifest: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse skill manifest: {}", e))?;
    manifest["enabled"] = Value::Bool(request.enabled);
    fs::write(
        &manifest_path,
        serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Failed to serialize skill manifest: {}", e))?,
    )
    .map_err(|e| format!("Failed to write skill manifest: {}", e))?;
    Ok(())
}

#[command]
pub async fn agent_delete_skill(app: AppHandle, request: DeleteSkillRequest) -> Result<(), String> {
    let user_skills_root = ensure_user_skills_dir(&app)?;
    let dir = user_skills_root.join(request.id);
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| format!("Failed to delete skill: {}", e))?;
    }
    Ok(())
}

#[command]
pub async fn agent_list_commands(app: AppHandle) -> Result<Vec<AgentCommandConfig>, String> {
    Ok(load_tooling_config(&app)?.commands)
}

#[command]
pub async fn agent_upsert_command(
    app: AppHandle,
    request: UpsertCommandRequest,
) -> Result<(), String> {
    validate_agent_command(&request.command)?;
    let user_commands_root = ensure_user_commands_dir(&app)?;
    let file_name = format!("{}.md", sanitize_slug(&request.command.slug));
    let command_file = user_commands_root.join(file_name);
    fs::write(command_file, build_command_markdown(&request.command))
        .map_err(|e| format!("Failed to write command file: {}", e))?;
    Ok(())
}

#[command]
pub async fn agent_import_command_markdown(
    app: AppHandle,
    request: ImportCommandMarkdownRequest,
) -> Result<AgentCommandConfig, String> {
    let src_path = PathBuf::from(request.path);
    if !src_path.exists() {
        return Err("Command markdown path does not exist".to_string());
    }
    if src_path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Only .md command files are supported".to_string());
    }
    let mut parsed = parse_command_markdown(&src_path, "user")?;
    parsed.source = "user".to_string();
    validate_agent_command(&parsed)?;

    let user_commands_root = ensure_user_commands_dir(&app)?;
    let file_name = format!("{}.md", sanitize_slug(&parsed.slug));
    let command_file = user_commands_root.join(file_name);
    fs::write(command_file, build_command_markdown(&parsed))
        .map_err(|e| format!("Failed to write imported command file: {}", e))?;
    Ok(parsed)
}

#[command]
pub async fn agent_delete_command(
    app: AppHandle,
    request: DeleteCommandRequest,
) -> Result<(), String> {
    let user_commands_root = ensure_user_commands_dir(&app)?;
    let file_name = format!("{}.md", sanitize_slug(&request.slug));
    let command_file = user_commands_root.join(file_name);
    if command_file.exists() {
        fs::remove_file(command_file)
            .map_err(|e| format!("Failed to delete command file: {}", e))?;
    }
    Ok(())
}

#[command]
pub async fn agent_codex_health(request: AgentChatRequest) -> Result<AgentCodexHealth, String> {
    let binary = resolve_codex_binary(request.settings.codex.binary_path.as_deref());
    let Ok(binary) = binary else {
        return Ok(AgentCodexHealth {
            found: false,
            binary: None,
            mcp_available: false,
            exec_available: false,
            message: "未找到 codex 可执行文件".to_string(),
        });
    };

    let mcp_available = probe_codex_mcp(&binary, &request.settings.codex)
        .await
        .is_ok();
    let exec_available = probe_codex_exec(&binary, &request.settings.codex)
        .await
        .is_ok();

    Ok(AgentCodexHealth {
        found: true,
        binary: Some(binary),
        mcp_available,
        exec_available,
        message: if mcp_available || exec_available {
            "Codex 本地运行时可用".to_string()
        } else {
            "Codex 已找到，但 mcp/exec 探测均失败".to_string()
        },
    })
}

fn get_required_str<'a>(payload: &'a Value, key: &str) -> Result<&'a str, String> {
    payload
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("Missing required field: {}", key))
}

fn get_optional_str<'a>(payload: &'a Value, key: &str) -> Option<&'a str> {
    payload
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
}

fn validate_action(action_type: &str, payload: &Value) -> Result<(), String> {
    let allowed = [
        "todo.create",
        "todo.update",
        "todo.delete",
        "project.create",
        "project.update_progress",
        "project.delete",
        "event.create",
        "event.update",
        "event.delete",
        "personal.create",
        "personal.update",
        "personal.delete",
        "query.snapshot",
    ];
    if !allowed.contains(&action_type) {
        return Err(format!("Action is not allowed: {}", action_type));
    }
    if !payload.is_object() {
        return Err("Action payload must be an object".to_string());
    }
    Ok(())
}

async fn execute_action_with_transaction(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    action: &AgentActionProposal,
) -> Result<String, String> {
    match action.r#type.as_str() {
        "todo.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let priority = get_optional_str(&action.payload, "priority").unwrap_or("normal");
            let id = action
                .payload
                .get("id")
                .and_then(|item| item.as_str())
                .unwrap_or(&chrono::Utc::now().timestamp_millis().to_string())
                .to_string();
            sqlx::query("INSERT INTO todos (id, title, priority) VALUES (?1, ?2, ?3)")
                .bind(&id)
                .bind(title)
                .bind(priority)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to create todo: {}", e))?;
            Ok("待办已创建".to_string())
        }
        "todo.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let completed = action
                .payload
                .get("completed")
                .and_then(|value| value.as_bool());
            let priority = get_optional_str(&action.payload, "priority");
            if title.is_none() && completed.is_none() && priority.is_none() {
                return Err("todo.update 缺少可更新字段".to_string());
            }
            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if completed.is_some() {
                updates.push("completed = ?".to_string());
            }
            if priority.is_some() {
                updates.push("priority = ?".to_string());
            }
            let query = format!("UPDATE todos SET {} WHERE id = ?", updates.join(", "));
            let mut query_builder = sqlx::query(&query);
            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = completed {
                query_builder = query_builder.bind(if value { 1 } else { 0 });
            }
            if let Some(value) = priority {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to update todo: {}", e))?;
            Ok("待办已更新".to_string())
        }
        "todo.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM todos WHERE id = ?1")
                .bind(id)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to delete todo: {}", e))?;
            Ok("待办已删除".to_string())
        }
        "project.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let deadline = get_required_str(&action.payload, "deadline")?;
            let id = action
                .payload
                .get("id")
                .and_then(|item| item.as_str())
                .unwrap_or(&chrono::Utc::now().timestamp_millis().to_string())
                .to_string();
            sqlx::query(
                "INSERT INTO projects (id, title, deadline, progress, status) VALUES (?1, ?2, ?3, 0, 'active')",
            )
            .bind(&id)
            .bind(title)
            .bind(deadline)
            .execute(&mut **tx)
            .await
            .map_err(|e| format!("Failed to create project: {}", e))?;
            Ok("项目已创建".to_string())
        }
        "project.update_progress" => {
            let id = get_required_str(&action.payload, "id")?;
            let progress = action
                .payload
                .get("progress")
                .and_then(|value| value.as_i64())
                .ok_or("project.update_progress 缺少 progress")?;
            sqlx::query("UPDATE projects SET progress = ?1 WHERE id = ?2")
                .bind(progress as i32)
                .bind(id)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to update project progress: {}", e))?;
            Ok("项目进度已更新".to_string())
        }
        "project.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM projects WHERE id = ?1")
                .bind(id)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to delete project: {}", e))?;
            Ok("项目已删除".to_string())
        }
        "event.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let date = get_required_str(&action.payload, "date")?;
            let color = get_optional_str(&action.payload, "color").unwrap_or("blue");
            let note = get_optional_str(&action.payload, "note");
            let id = action
                .payload
                .get("id")
                .and_then(|item| item.as_str())
                .unwrap_or(&chrono::Utc::now().timestamp_millis().to_string())
                .to_string();
            sqlx::query(
                "INSERT INTO events (id, title, date, color, note) VALUES (?1, ?2, ?3, ?4, ?5)",
            )
            .bind(&id)
            .bind(title)
            .bind(date)
            .bind(color)
            .bind(note)
            .execute(&mut **tx)
            .await
            .map_err(|e| format!("Failed to create event: {}", e))?;
            Ok("日程已创建".to_string())
        }
        "event.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let date = get_optional_str(&action.payload, "date");
            let color = get_optional_str(&action.payload, "color");
            let note = get_optional_str(&action.payload, "note");
            if title.is_none() && date.is_none() && color.is_none() && note.is_none() {
                return Err("event.update 缺少可更新字段".to_string());
            }
            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if date.is_some() {
                updates.push("date = ?".to_string());
            }
            if color.is_some() {
                updates.push("color = ?".to_string());
            }
            if note.is_some() {
                updates.push("note = ?".to_string());
            }
            let query = format!("UPDATE events SET {} WHERE id = ?", updates.join(", "));
            let mut query_builder = sqlx::query(&query);
            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = date {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = color {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = note {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to update event: {}", e))?;
            Ok("日程已更新".to_string())
        }
        "event.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM events WHERE id = ?1")
                .bind(id)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to delete event: {}", e))?;
            Ok("日程已删除".to_string())
        }
        "personal.create" => {
            let title = get_required_str(&action.payload, "title")?;
            let id = action
                .payload
                .get("id")
                .and_then(|item| item.as_str())
                .unwrap_or(&chrono::Utc::now().timestamp_millis().to_string())
                .to_string();
            let budget = action
                .payload
                .get("budget")
                .and_then(|value| value.as_f64());
            let date = get_optional_str(&action.payload, "date");
            let location = get_optional_str(&action.payload, "location");
            let note = get_optional_str(&action.payload, "note");
            sqlx::query(
                "INSERT INTO personal_tasks (id, title, budget, date, location, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(&id)
            .bind(title)
            .bind(budget)
            .bind(date)
            .bind(location)
            .bind(note)
            .execute(&mut **tx)
            .await
            .map_err(|e| format!("Failed to create personal task: {}", e))?;
            Ok("个人事务已创建".to_string())
        }
        "personal.update" => {
            let id = get_required_str(&action.payload, "id")?;
            let title = get_optional_str(&action.payload, "title");
            let budget = action
                .payload
                .get("budget")
                .and_then(|value| value.as_f64());
            let date = get_optional_str(&action.payload, "date");
            let location = get_optional_str(&action.payload, "location");
            let note = get_optional_str(&action.payload, "note");
            if title.is_none()
                && budget.is_none()
                && date.is_none()
                && location.is_none()
                && note.is_none()
            {
                return Err("personal.update 缺少可更新字段".to_string());
            }
            let mut updates: Vec<String> = Vec::new();
            if title.is_some() {
                updates.push("title = ?".to_string());
            }
            if budget.is_some() {
                updates.push("budget = ?".to_string());
            }
            if date.is_some() {
                updates.push("date = ?".to_string());
            }
            if location.is_some() {
                updates.push("location = ?".to_string());
            }
            if note.is_some() {
                updates.push("note = ?".to_string());
            }
            let query = format!(
                "UPDATE personal_tasks SET {} WHERE id = ?",
                updates.join(", ")
            );
            let mut query_builder = sqlx::query(&query);
            if let Some(value) = title {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = budget {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = date {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = location {
                query_builder = query_builder.bind(value);
            }
            if let Some(value) = note {
                query_builder = query_builder.bind(value);
            }
            query_builder = query_builder.bind(id);
            query_builder
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to update personal task: {}", e))?;
            Ok("个人事务已更新".to_string())
        }
        "personal.delete" => {
            let id = get_required_str(&action.payload, "id")?;
            sqlx::query("DELETE FROM personal_tasks WHERE id = ?1")
                .bind(id)
                .execute(&mut **tx)
                .await
                .map_err(|e| format!("Failed to delete personal task: {}", e))?;
            Ok("个人事务已删除".to_string())
        }
        "query.snapshot" => Ok("当前快照已生成".to_string()),
        _ => Err(format!("Unsupported action type: {}", action.r#type)),
    }
}

async fn build_context_snapshot() -> Result<Value, String> {
    let pool = get_db_pool()?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let pending_todos = sqlx::query("SELECT id, title, priority FROM todos WHERE completed = 0 ORDER BY created_at DESC LIMIT 8")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch todos snapshot: {}", e))?;
    let active_projects = sqlx::query("SELECT id, title, deadline, progress FROM projects WHERE status = 'active' ORDER BY deadline LIMIT 8")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch projects snapshot: {}", e))?;
    let today_events = sqlx::query(
        "SELECT id, title, date, color, note FROM events WHERE date = ?1 ORDER BY date LIMIT 10",
    )
    .bind(&today)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch events snapshot: {}", e))?;
    let personal_tasks =
        sqlx::query("SELECT id, title, date, budget FROM personal_tasks ORDER BY date LIMIT 8")
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Failed to fetch personal snapshot: {}", e))?;

    Ok(json!({
        "today": today,
        "pendingTodos": pending_todos.into_iter().map(|row| json!({
            "id": row.get::<String, _>("id"),
            "title": row.get::<String, _>("title"),
            "priority": row.get::<String, _>("priority"),
        })).collect::<Vec<Value>>(),
        "activeProjects": active_projects.into_iter().map(|row| json!({
            "id": row.get::<String, _>("id"),
            "title": row.get::<String, _>("title"),
            "deadline": row.get::<Option<String>, _>("deadline"),
            "progress": row.get::<i32, _>("progress"),
        })).collect::<Vec<Value>>(),
        "todayEvents": today_events.into_iter().map(|row| json!({
            "id": row.get::<String, _>("id"),
            "title": row.get::<String, _>("title"),
            "date": row.get::<String, _>("date"),
            "color": row.get::<String, _>("color"),
            "note": row.get::<Option<String>, _>("note"),
        })).collect::<Vec<Value>>(),
        "personalTasks": personal_tasks.into_iter().map(|row| json!({
            "id": row.get::<String, _>("id"),
            "title": row.get::<String, _>("title"),
            "date": row.get::<Option<String>, _>("date"),
            "budget": row.get::<Option<f64>, _>("budget"),
        })).collect::<Vec<Value>>(),
    }))
}

fn local_fallback_response(
    messages: &[AgentMessage],
    snapshot: &Value,
    error: Option<String>,
) -> AgentChatResponse {
    let latest_user = messages
        .iter()
        .rev()
        .find(|message| message.role == "user")
        .map(|message| message.content.as_str())
        .unwrap_or("请根据当前工作台数据给出建议");

    let pending_todos = snapshot
        .get("pendingTodos")
        .and_then(|value| value.as_array())
        .map(|value| value.len())
        .unwrap_or(0);
    let today_events = snapshot
        .get("todayEvents")
        .and_then(|value| value.as_array())
        .map(|value| value.len())
        .unwrap_or(0);

    let mut reply = format!(
        "我已读取当前工作台数据。你刚才说的是“{}”。当前未完成待办 {} 项、今日日程 {} 项。",
        latest_user, pending_todos, today_events
    );

    if let Some(reason) = error {
        reply.push_str(&format!(
            " 模型服务暂不可用（{}），已切换为本地建议模式。",
            reason
        ));
    }

    AgentChatResponse {
        reply,
        actions: vec![AgentActionProposal {
            id: format!("snapshot-{}", chrono::Utc::now().timestamp_millis()),
            r#type: "query.snapshot".to_string(),
            title: "生成当前快照".to_string(),
            reason: "用于后续进一步规划和动作确认".to_string(),
            payload: json!({}),
            requires_approval: true,
        }],
    }
}

async fn call_provider(
    app: &AppHandle,
    request_id: &str,
    request: &AgentChatRequest,
    snapshot: &Value,
) -> Result<AgentChatResponse, String> {
    let provider = request.settings.provider.as_str();
    match provider {
        "openai" => call_openai(request, snapshot).await,
        "anthropic" => call_anthropic(request, snapshot).await,
        "minimax" => call_minimax(request, snapshot).await,
        "codex_local" => call_codex_local(app, request_id, request, snapshot).await,
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn call_openai(
    request: &AgentChatRequest,
    snapshot: &Value,
) -> Result<AgentChatResponse, String> {
    let config = &request.settings.openai;
    if config.api_key.trim().is_empty() {
        return Err("OpenAI API key is empty".to_string());
    }

    let endpoint = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));

    let messages = request
        .messages
        .iter()
        .map(|message| {
            json!({
                "role": if message.role == "assistant" { "assistant" } else { "user" },
                "content": message.content,
            })
        })
        .collect::<Vec<Value>>();

    let mut request_messages = vec![json!({
        "role": "system",
        "content": build_system_prompt(snapshot),
    })];
    request_messages.extend(messages);

    let client = reqwest::Client::new();
    let response = client
        .post(endpoint)
        .bearer_auth(config.api_key.trim())
        .json(&json!({
            "model": config.model,
            "temperature": 0.2,
            "messages": request_messages,
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "no body".to_string());
        return Err(format!("OpenAI error {}: {}", status, body));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("OpenAI parse failed: {}", e))?;
    let content = body
        .get("choices")
        .and_then(|value| value.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .ok_or("OpenAI response missing content".to_string())?;

    parse_llm_response(content)
}

async fn call_anthropic(
    request: &AgentChatRequest,
    snapshot: &Value,
) -> Result<AgentChatResponse, String> {
    let config = &request.settings.anthropic;
    if config.api_key.trim().is_empty() {
        return Err("Anthropic API key is empty".to_string());
    }

    let endpoint = format!("{}/messages", config.base_url.trim_end_matches('/'));
    let anthropic_version = config
        .api_version
        .clone()
        .unwrap_or_else(|| "2023-06-01".to_string());

    let messages = request
        .messages
        .iter()
        .filter_map(|message| {
            let role = if message.role == "assistant" {
                Some("assistant")
            } else if message.role == "user" || message.role == "system" {
                Some("user")
            } else {
                None
            }?;
            Some(json!({
                "role": role,
                "content": message.content,
            }))
        })
        .collect::<Vec<Value>>();

    let client = reqwest::Client::new();
    let response = client
        .post(endpoint)
        .header("x-api-key", config.api_key.trim())
        .header("anthropic-version", anthropic_version)
        .json(&json!({
            "model": config.model,
            "max_tokens": 1200,
            "temperature": 0.2,
            "system": build_system_prompt(snapshot),
            "messages": messages,
        }))
        .send()
        .await
        .map_err(|e| format!("Anthropic request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "no body".to_string());
        return Err(format!("Anthropic error {}: {}", status, body));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("Anthropic parse failed: {}", e))?;
    let content = body
        .get("content")
        .and_then(|value| value.as_array())
        .and_then(|content| content.first())
        .and_then(|block| block.get("text"))
        .and_then(|value| value.as_str())
        .ok_or("Anthropic response missing text".to_string())?;

    parse_llm_response(content)
}

async fn call_minimax(
    request: &AgentChatRequest,
    snapshot: &Value,
) -> Result<AgentChatResponse, String> {
    let config = &request.settings.minimax;
    if config.api_key.trim().is_empty() {
        return Err("MiniMax API key is empty".to_string());
    }

    let endpoint = format!(
        "{}/text/chatcompletion_v2",
        config.base_url.trim_end_matches('/')
    );

    let mut request_messages = vec![json!({
        "role": "system",
        "content": build_system_prompt(snapshot),
    })];
    request_messages.extend(
        request
            .messages
            .iter()
            .map(|message| {
                json!({
                    "role": if message.role == "assistant" { "assistant" } else { "user" },
                    "content": message.content,
                })
            })
            .collect::<Vec<Value>>(),
    );

    let client = reqwest::Client::new();
    let response = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", config.api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": config.model,
            "messages": request_messages,
            "stream": false,
            "temperature": 0.2,
            "max_tokens": 1200,
        }))
        .send()
        .await
        .map_err(|e| format!("MiniMax request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "no body".to_string());
        return Err(format!("MiniMax error {}: {}", status, body));
    }

    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("MiniMax parse failed: {}", e))?;
    let content = body
        .get("choices")
        .and_then(|value| value.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .ok_or("MiniMax response missing content".to_string())?;

    parse_llm_response(content)
}

async fn call_codex_local(
    app: &AppHandle,
    request_id: &str,
    request: &AgentChatRequest,
    snapshot: &Value,
) -> Result<AgentChatResponse, String> {
    if !request.settings.codex.enabled {
        return Err("Codex local runtime is disabled".to_string());
    }

    let binary = resolve_codex_binary(request.settings.codex.binary_path.as_deref())?;
    emit_agent_event(
        app,
        request_id,
        "runtime_detect",
        "已检测到 codex 本地运行时",
        Some(json!({ "binary": binary })),
    );

    if request.settings.codex.prefer_mcp {
        emit_agent_event(
            app,
            request_id,
            "mcp_connect",
            "尝试连接 Codex MCP 通道",
            None,
        );
        if let Err(error) = probe_codex_mcp(&binary, &request.settings.codex).await {
            emit_agent_event(
                app,
                request_id,
                "exec_fallback",
                "MCP 通道不可用，降级到 exec",
                Some(json!({ "reason": error })),
            );
        }
    }

    emit_agent_event(app, request_id, "planning", "通过 Codex 生成执行计划", None);

    let prompt = build_codex_prompt(request, snapshot);
    let content = run_codex_exec(&binary, &request.settings.codex, &prompt).await?;
    let mut parsed = parse_llm_response(&content)?;

    if is_generic_identity_reply(&parsed.reply) && parsed.actions.is_empty() {
        let retry_prompt = format!(
            "{}\n\n请注意：不要做身份介绍，也不要回复固定模板。请直接回答用户最后一个问题，并给出可执行动作（如果需要）。",
            prompt
        );
        let retry_content = run_codex_exec(&binary, &request.settings.codex, &retry_prompt).await?;
        parsed = parse_llm_response(&retry_content)?;
    }

    Ok(parsed)
}

fn build_codex_prompt(request: &AgentChatRequest, snapshot: &Value) -> String {
    let latest_user = request
        .messages
        .iter()
        .rev()
        .find(|item| item.role == "user")
        .map(|item| item.content.clone())
        .unwrap_or_else(|| "请根据当前工作台快照给出建议".to_string());
    let conversation = request
        .messages
        .iter()
        .map(|item| format!("{}: {}", item.role, item.content))
        .collect::<Vec<String>>()
        .join("\n");
    format!(
        "{}\n\n用户最后一条消息:\n{}\n\n上下文快照:\n{}\n\n历史消息:\n{}\n\n请严格按 JSON 返回，并且回复内容必须针对“用户最后一条消息”，禁止固定模板。",
        build_system_prompt(snapshot),
        latest_user,
        snapshot,
        conversation
    )
}

async fn run_codex_exec(
    binary: &str,
    config: &AgentCodexConfig,
    prompt: &str,
) -> Result<String, String> {
    let mut args = if config.exec_args.is_empty() {
        default_codex_exec_args()
    } else {
        config.exec_args.clone()
    };
    args.push(prompt.to_string());

    let mut cmd = Command::new(binary);
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    let duration = Duration::from_millis(config.request_timeout_ms.max(1000));
    let output = timeout(duration, cmd.output())
        .await
        .map_err(|_| "Codex exec timed out".to_string())?
        .map_err(|e| format!("Failed to run codex exec: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            return Err("Codex exec returned empty output".to_string());
        }
        Ok(extract_codex_last_message(&stdout))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!(
            "Codex exec failed (status {}): {}",
            output.status,
            if stderr.is_empty() {
                "no stderr".to_string()
            } else {
                stderr
            }
        ))
    }
}

fn extract_codex_last_message(stdout: &str) -> String {
    let mut candidate: Option<String> = None;
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with('{') {
            continue;
        }
        let Ok(value) = serde_json::from_str::<Value>(trimmed) else {
            continue;
        };

        if let Some(payload_reply) = value
            .get("payload")
            .and_then(|payload| payload.get("reply"))
            .and_then(|reply| reply.as_str())
        {
            return json!({
                "reply": payload_reply,
                "actions": value
                    .get("payload")
                    .and_then(|payload| payload.get("actions"))
                    .cloned()
                    .unwrap_or_else(|| Value::Array(vec![]))
            })
            .to_string();
        }

        let item_type = value
            .get("item")
            .and_then(|item| item.get("type"))
            .and_then(|item_type| item_type.as_str());
        if item_type == Some("agent_message") {
            if let Some(text) = value
                .get("item")
                .and_then(|item| item.get("text"))
                .and_then(|text| text.as_str())
            {
                candidate = Some(text.to_string());
            }
        }
    }

    candidate.unwrap_or_else(|| stdout.to_string())
}

fn is_generic_identity_reply(reply: &str) -> bool {
    let text = reply.trim().to_lowercase();
    text.contains("基于 codex")
        || text.contains("gpt-5")
        || text == "我是 zhaoxi workbench agent。你可以直接告诉我你的安排目标，我会先给出可执行计划，再由你确认执行。"
}

fn resolve_codex_binary(path_override: Option<&str>) -> Result<String, String> {
    if let Some(path) = path_override {
        let candidate = PathBuf::from(path);
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
        return Err(format!(
            "Configured codex binary path does not exist: {}",
            path
        ));
    }

    let path_env = env::var_os("PATH").ok_or("PATH is not set".to_string())?;
    for segment in env::split_paths(&path_env) {
        let candidate = segment.join("codex");
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
        #[cfg(windows)]
        {
            let candidate_exe = segment.join("codex.exe");
            if candidate_exe.exists() {
                return Ok(candidate_exe.to_string_lossy().to_string());
            }
        }
    }

    Err("codex was not found in PATH".to_string())
}

async fn probe_codex_mcp(binary: &str, config: &AgentCodexConfig) -> Result<(), String> {
    let mut args = if config.mcp_args.is_empty() {
        default_codex_mcp_args()
    } else {
        config.mcp_args.clone()
    };
    args.push("--help".to_string());
    run_codex_probe(binary, args, config.request_timeout_ms).await
}

async fn probe_codex_exec(binary: &str, config: &AgentCodexConfig) -> Result<(), String> {
    let mut args = if config.exec_args.is_empty() {
        default_codex_exec_args()
    } else {
        config.exec_args.clone()
    };
    args.push("--help".to_string());
    run_codex_probe(binary, args, config.request_timeout_ms).await
}

async fn run_codex_probe(binary: &str, args: Vec<String>, timeout_ms: u64) -> Result<(), String> {
    let mut cmd = Command::new(binary);
    cmd.args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null());
    timeout(Duration::from_millis(timeout_ms.max(1000)), cmd.output())
        .await
        .map_err(|_| "Codex probe timed out".to_string())?
        .map_err(|e| format!("Codex probe failed: {}", e))?;
    Ok(())
}

fn build_system_prompt(snapshot: &Value) -> String {
    format!(
        "你是 ZhaoXi Workbench Agent。你必须基于上下文数据给出清晰建议，并且仅输出 JSON，结构为: {{\"reply\":\"string\",\"actions\":[{{\"id\":\"string\",\"type\":\"string\",\"title\":\"string\",\"reason\":\"string\",\"payload\":{{}},\"requiresApproval\":false}}]}}。\
        action type 只能使用: todo.create,todo.update,todo.delete,project.create,project.update_progress,project.delete,event.create,event.update,event.delete,personal.create,personal.update,personal.delete,query.snapshot。\
        你必须直接回答用户问题，禁止固定自我介绍或与问题无关的模板句。\
        如果不需要动作，actions 返回空数组。\
        当前上下文: {}",
        snapshot
    )
}

fn parse_llm_response(content: &str) -> Result<AgentChatResponse, String> {
    let normalized = extract_json_block(content);
    if let Ok(value) = serde_json::from_str::<Value>(&normalized) {
        let reply = value
            .get("reply")
            .and_then(|item| item.as_str())
            .unwrap_or("已生成建议。")
            .to_string();

        let actions = value
            .get("actions")
            .cloned()
            .unwrap_or_else(|| Value::Array(vec![]));
        let parsed_actions: Vec<AgentActionProposal> = serde_json::from_value(actions)
            .map_err(|e| format!("LLM actions parse failed: {}", e))?;

        return Ok(AgentChatResponse {
            reply,
            actions: parsed_actions,
        });
    }

    let plain_reply = content.trim();
    if plain_reply.is_empty() {
        return Err("LLM returned empty content".to_string());
    }

    Ok(AgentChatResponse {
        reply: plain_reply.to_string(),
        actions: vec![],
    })
}

fn extract_json_block(content: &str) -> String {
    if let Some(start) = content.find("```json") {
        if let Some(end) = content[start + 7..].find("```") {
            return content[start + 7..start + 7 + end].trim().to_string();
        }
    }
    if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            return content[start..=end].to_string();
        }
    }
    content.trim().to_string()
}

fn emit_agent_event(
    app: &AppHandle,
    request_id: &str,
    stage: &str,
    message: &str,
    meta: Option<Value>,
) {
    let event = AgentStreamEvent {
        request_id: request_id.to_string(),
        stage: stage.to_string(),
        message: message.to_string(),
        meta: meta.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let _ = app.emit("agent_stream", &event);
    let request_id = request_id.to_string();
    let stage = stage.to_string();
    let message = message.to_string();
    tokio::spawn(async move {
        persist_agent_event(&request_id, &stage, &message, meta).await;
    });
}

async fn persist_agent_event(request_id: &str, stage: &str, message: &str, meta: Option<Value>) {
    let Ok(pool) = get_db_pool() else {
        return;
    };
    let _ = sqlx::query(
        "INSERT INTO agent_events (id, request_id, stage, message, meta_json) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(format!("evt-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)))
    .bind(request_id)
    .bind(stage)
    .bind(message)
    .bind(meta.map(|item| item.to_string()))
    .execute(pool)
    .await;
}

async fn persist_agent_session(
    request_id: &str,
    provider: &str,
    messages: &[AgentMessage],
    reply: &str,
) {
    let Ok(pool) = get_db_pool() else {
        return;
    };
    let latest_user = messages
        .iter()
        .rev()
        .find(|item| item.role == "user")
        .map(|item| item.content.clone());
    let _ = sqlx::query(
        "INSERT INTO agent_sessions (id, request_id, provider, user_message, reply) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(format!("sess-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)))
    .bind(request_id)
    .bind(provider)
    .bind(latest_user)
    .bind(reply)
    .execute(pool)
    .await;
}

async fn persist_audit_records(records: &[AgentExecutionAuditRecord]) {
    let Ok(pool) = get_db_pool() else {
        return;
    };
    for record in records {
        let _ = sqlx::query(
            "INSERT INTO agent_action_audits (id, batch_id, action_id, action_type, payload_json, before_state_json, after_state_json, success, error_message) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        )
        .bind(&record.id)
        .bind(&record.batch_id)
        .bind(&record.action_id)
        .bind(&record.action_type)
        .bind(record.payload.to_string())
        .bind(record.before_state.as_ref().map(|item| item.to_string()))
        .bind(record.after_state.as_ref().map(|item| item.to_string()))
        .bind(if record.success { 1 } else { 0 })
        .bind(record.error.clone())
        .execute(pool)
        .await;
    }
}

async fn load_info_settings() -> Result<InfoSettings, String> {
    let pool = get_db_pool()?;
    let row = sqlx::query(
        "SELECT push_time, include_keywords_json, exclude_keywords_json, max_items_per_day
         FROM info_settings
         WHERE id = 'default'
         LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to query info settings: {}", e))?;

    if let Some(row) = row {
        let include_keywords = parse_keywords_json(row.get("include_keywords_json"))?;
        let exclude_keywords = parse_keywords_json(row.get("exclude_keywords_json"))?;
        return Ok(InfoSettings {
            push_time: normalize_push_time(&row.get::<String, _>("push_time")),
            include_keywords,
            exclude_keywords,
            max_items_per_day: row.get::<i32, _>("max_items_per_day").clamp(1, 100),
        });
    }

    Ok(InfoSettings {
        push_time: "09:00".to_string(),
        include_keywords: vec![],
        exclude_keywords: vec![],
        max_items_per_day: 20,
    })
}

async fn refresh_info_with_trigger(trigger_type: &str) -> Result<InfoRefreshResponse, String> {
    let pool = get_db_pool()?;
    let settings = load_info_settings().await?;
    let sources = get_info_sources().await?;
    let enabled_sources: Vec<InfoSource> = sources
        .into_iter()
        .filter(|source| source.enabled)
        .collect();
    let refreshed_at = chrono::Local::now().to_rfc3339();
    let today = local_today_string();

    sqlx::query("DELETE FROM info_items_daily WHERE date != ?1")
        .bind(&today)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to cleanup stale info items: {}", e))?;

    if enabled_sources.is_empty() {
        let message = "没有启用的信息源".to_string();
        insert_info_refresh_log(trigger_type, true, &message, 0, 0).await;
        return Ok(InfoRefreshResponse {
            success: true,
            fetched_count: 0,
            kept_count: 0,
            message,
            refreshed_at,
        });
    }

    let mut fetched_count = 0;
    let mut link_seen = HashSet::new();
    let mut aggregate: HashMap<String, InfoItem> = HashMap::new();
    let mut errors = Vec::new();

    for source in enabled_sources {
        match fetch_source_items(&source, &settings).await {
            Ok(items) => {
                fetched_count += items.len() as i32;
                for item in items {
                    if !link_seen.insert(item.link.clone()) {
                        if let Some(existing) = aggregate.get_mut(&item.link) {
                            if item.score > existing.score {
                                *existing = item;
                            }
                        }
                        continue;
                    }
                    aggregate.insert(item.link.clone(), item);
                }
            }
            Err(error) => {
                errors.push(format!("{}: {}", source.name, error));
            }
        }
    }

    let mut final_items: Vec<InfoItem> = aggregate.into_values().collect();
    final_items.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
    final_items.truncate(settings.max_items_per_day as usize);

    sqlx::query("DELETE FROM info_items_daily WHERE date = ?1")
        .bind(&today)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to clear current day info items: {}", e))?;

    for (index, item) in final_items.iter().enumerate() {
        let matched_keywords_json = serde_json::to_string(&item.matched_keywords)
            .map_err(|e| format!("Failed to serialize matched keywords: {}", e))?;
        sqlx::query(
            "INSERT INTO info_items_daily
             (id, date, source_id, title, link, summary, published_at, score, matched_keywords_json, fetched_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        )
        .bind(format!("info-{}-{}", chrono::Utc::now().timestamp_millis(), index))
        .bind(&today)
        .bind(&item.source_id)
        .bind(&item.title)
        .bind(&item.link)
        .bind(&item.summary)
        .bind(&item.published_at)
        .bind(item.score)
        .bind(matched_keywords_json)
        .bind(&item.fetched_at)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to store info item: {}", e))?;
    }

    let success = errors.is_empty();
    let message = if success {
        format!("已更新 {} 条信息", final_items.len())
    } else {
        format!(
            "已更新 {} 条信息，{} 个信息源失败",
            final_items.len(),
            errors.len()
        )
    };
    insert_info_refresh_log(
        trigger_type,
        success,
        &format!(
            "{}{}",
            message,
            if errors.is_empty() {
                String::new()
            } else {
                format!("（{}）", errors.join("; "))
            }
        ),
        fetched_count,
        final_items.len() as i32,
    )
    .await;

    Ok(InfoRefreshResponse {
        success,
        fetched_count,
        kept_count: final_items.len() as i32,
        message,
        refreshed_at,
    })
}

async fn fetch_source_items(
    source: &InfoSource,
    settings: &InfoSettings,
) -> Result<Vec<InfoItem>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&source.url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    let feed =
        feed_rs::parser::parse(bytes.as_ref()).map_err(|e| format!("解析 RSS/Atom 失败: {}", e))?;

    let include = normalize_keywords(settings.include_keywords.clone());
    let exclude = normalize_keywords(settings.exclude_keywords.clone());
    let now = chrono::Utc::now();
    let fetched_at = chrono::Local::now().to_rfc3339();
    let mut items = Vec::new();

    for (index, entry) in feed.entries.into_iter().enumerate() {
        let title = entry
            .title
            .as_ref()
            .map(|item| item.content.trim().to_string())
            .unwrap_or_default();
        if title.is_empty() {
            continue;
        }
        let summary = entry
            .summary
            .as_ref()
            .map(|item| item.content.trim().to_string());
        let link = entry
            .links
            .first()
            .map(|item| item.href.clone())
            .unwrap_or_default();
        if link.is_empty() {
            continue;
        }

        let haystack = format!(
            "{} {}",
            title.to_lowercase(),
            summary.clone().unwrap_or_default().to_lowercase()
        );
        if exclude.iter().any(|keyword| haystack.contains(keyword)) {
            continue;
        }

        let matched_keywords = if include.is_empty() {
            Vec::new()
        } else {
            include
                .iter()
                .filter(|keyword| haystack.contains(keyword.as_str()))
                .cloned()
                .collect::<Vec<String>>()
        };
        if !include.is_empty() && matched_keywords.is_empty() {
            continue;
        }

        let published_at = entry
            .published
            .or(entry.updated)
            .map(|item| item.to_rfc3339());
        let mut score = matched_keywords.len() as f64;
        if let Some(published) = entry.published.or(entry.updated) {
            let hours = (now - published.with_timezone(&chrono::Utc)).num_hours();
            if hours <= 24 {
                score += 1.0;
            } else if hours <= 72 {
                score += 0.5;
            }
        }
        if include.is_empty() {
            score += 0.1;
        }

        items.push(InfoItem {
            id: format!("temp-{}-{}", source.id, index),
            source_id: source.id.clone(),
            title,
            link,
            summary,
            published_at,
            score,
            matched_keywords,
            fetched_at: fetched_at.clone(),
        });
    }

    Ok(items)
}

fn row_to_info_item(row: sqlx::sqlite::SqliteRow) -> Result<InfoItem, String> {
    let matched_keywords = parse_keywords_json(row.get("matched_keywords_json"))?;
    Ok(InfoItem {
        id: row.get("id"),
        source_id: row.get("source_id"),
        title: row.get("title"),
        link: row.get("link"),
        summary: row.get("summary"),
        published_at: row.get("published_at"),
        score: row.get("score"),
        matched_keywords,
        fetched_at: row.get("fetched_at"),
    })
}

fn parse_keywords_json(raw: String) -> Result<Vec<String>, String> {
    serde_json::from_str::<Vec<String>>(&raw)
        .map(normalize_keywords)
        .map_err(|e| format!("Failed to parse keywords json: {}", e))
}

fn normalize_keywords(keywords: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    keywords
        .into_iter()
        .map(|item| item.trim().to_lowercase())
        .filter(|item| !item.is_empty())
        .filter(|item| seen.insert(item.clone()))
        .collect()
}

fn normalize_push_time(input: &str) -> String {
    let trimmed = input.trim();
    if let Some((h_raw, m_raw)) = trimmed.split_once(':') {
        let hour = h_raw.parse::<u32>().unwrap_or(9).min(23);
        let minute = m_raw.parse::<u32>().unwrap_or(0).min(59);
        return format!("{:02}:{:02}", hour, minute);
    }
    "09:00".to_string()
}

fn weather_code_to_condition(code: i32) -> &'static str {
    match code {
        0 => "clear",
        1 | 2 | 3 => "cloudy",
        45 | 48 => "fog",
        51 | 53 | 55 | 56 | 57 | 61 | 63 | 65 | 66 | 67 | 80 | 81 | 82 => "rain",
        71 | 73 | 75 | 77 | 85 | 86 => "snow",
        95 | 96 | 99 => "thunder",
        _ => "unknown",
    }
}

fn wind_speed_to_level(speed_ms: f64) -> String {
    let level = if speed_ms < 0.3 {
        0
    } else if speed_ms < 1.6 {
        1
    } else if speed_ms < 3.4 {
        2
    } else if speed_ms < 5.5 {
        3
    } else if speed_ms < 8.0 {
        4
    } else if speed_ms < 10.8 {
        5
    } else if speed_ms < 13.9 {
        6
    } else if speed_ms < 17.2 {
        7
    } else if speed_ms < 20.8 {
        8
    } else if speed_ms < 24.5 {
        9
    } else if speed_ms < 28.5 {
        10
    } else if speed_ms < 32.7 {
        11
    } else {
        12
    };
    format!("{}级", level)
}

fn local_today_string() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn default_info_source_type() -> String {
    "rss".to_string()
}

async fn insert_info_refresh_log(
    trigger_type: &str,
    success: bool,
    message: &str,
    fetched_count: i32,
    kept_count: i32,
) {
    let Ok(pool) = get_db_pool() else {
        return;
    };
    let _ = sqlx::query(
        "INSERT INTO info_refresh_logs (id, trigger_type, success, message, fetched_count, kept_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(format!(
        "info-log-{}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default()
    ))
    .bind(trigger_type)
    .bind(if success { 1 } else { 0 })
    .bind(message)
    .bind(fetched_count)
    .bind(kept_count)
    .execute(pool)
    .await;
}

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))
}

fn backup_work_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_root(app)?.join("backups");
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create backup dir ({}): {}", dir.display(), e))?;
    Ok(dir)
}

async fn build_backup_envelope(
    app: &AppHandle,
    local_state: Option<BackupLocalState>,
    include_secrets: bool,
) -> Result<(BackupEnvelope, Vec<String>, HashMap<String, usize>), String> {
    let sqlite = collect_sqlite_backup().await?;
    let table_counts = sqlite_table_counts_from_backup(&sqlite);
    let mut warnings = Vec::new();
    let agent_files = collect_agent_files(app, &mut warnings)?;
    let payload = BackupPayload {
        sqlite,
        local_state: local_state.unwrap_or_default(),
        agent_files,
    };
    let envelope = BackupEnvelope {
        schema_version: BACKUP_SCHEMA_VERSION.to_string(),
        meta: BackupMeta {
            app: "ZhaoXi OS".to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            platform: env::consts::OS.to_string(),
            include_secrets,
        },
        payload,
    };
    Ok((envelope, warnings, table_counts))
}

async fn collect_sqlite_backup() -> Result<BackupSqliteData, String> {
    Ok(BackupSqliteData {
        todos: query_table_rows("todos").await?,
        projects: query_table_rows("projects").await?,
        events: query_table_rows("events").await?,
        personal_tasks: query_table_rows("personal_tasks").await?,
        inspirations: query_table_rows("inspirations").await?,
        info_sources: query_table_rows("info_sources").await?,
        info_settings: query_table_rows("info_settings").await?,
        info_items_daily: query_table_rows("info_items_daily").await?,
        info_refresh_logs: query_table_rows("info_refresh_logs").await?,
        agent_sessions: query_table_rows("agent_sessions").await?,
        agent_events: query_table_rows("agent_events").await?,
        agent_action_audits: query_table_rows("agent_action_audits").await?,
    })
}

fn sqlite_table_counts_from_backup(sqlite: &BackupSqliteData) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    counts.insert("todos".to_string(), sqlite.todos.len());
    counts.insert("projects".to_string(), sqlite.projects.len());
    counts.insert("events".to_string(), sqlite.events.len());
    counts.insert("personal_tasks".to_string(), sqlite.personal_tasks.len());
    counts.insert("inspirations".to_string(), sqlite.inspirations.len());
    counts.insert("info_sources".to_string(), sqlite.info_sources.len());
    counts.insert("info_settings".to_string(), sqlite.info_settings.len());
    counts.insert("info_items_daily".to_string(), sqlite.info_items_daily.len());
    counts.insert("info_refresh_logs".to_string(), sqlite.info_refresh_logs.len());
    counts.insert("agent_sessions".to_string(), sqlite.agent_sessions.len());
    counts.insert("agent_events".to_string(), sqlite.agent_events.len());
    counts.insert(
        "agent_action_audits".to_string(),
        sqlite.agent_action_audits.len(),
    );
    counts
}

async fn query_table_rows(table: &str) -> Result<Vec<Value>, String> {
    let pool = get_db_pool()?;
    let sql = format!("SELECT * FROM {}", quote_ident(table));
    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to query table {}: {}", table, e))?;
    Ok(rows.into_iter().map(sqlite_row_to_json).collect())
}

fn sqlite_row_to_json(row: sqlx::sqlite::SqliteRow) -> Value {
    let mut map = serde_json::Map::new();
    for column in row.columns() {
        let name = column.name();
        if let Ok(value) = row.try_get::<Option<String>, _>(name) {
            map.insert(
                name.to_string(),
                value.map(Value::String).unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<i64>, _>(name) {
            map.insert(
                name.to_string(),
                value.map(Value::from).unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<f64>, _>(name) {
            map.insert(
                name.to_string(),
                value.map(Value::from).unwrap_or(Value::Null),
            );
            continue;
        }
        if let Ok(value) = row.try_get::<Option<Vec<u8>>, _>(name) {
            let json_value = match value {
                Some(bytes) => match String::from_utf8(bytes.clone()) {
                    Ok(text) => Value::String(text),
                    Err(_) => Value::Array(bytes.into_iter().map(Value::from).collect()),
                },
                None => Value::Null,
            };
            map.insert(name.to_string(), json_value);
            continue;
        }
        map.insert(name.to_string(), Value::Null);
    }
    Value::Object(map)
}

fn collect_agent_files(
    app: &AppHandle,
    warnings: &mut Vec<String>,
) -> Result<BackupAgentFiles, String> {
    let mcp_servers = load_user_mcp_servers(app).unwrap_or_default();
    let user_commands = collect_user_commands(app, warnings)?;
    let user_skills = collect_user_skills(app, warnings)?;
    Ok(BackupAgentFiles {
        mcp_servers,
        user_commands,
        user_skills,
    })
}

fn collect_user_commands(
    app: &AppHandle,
    warnings: &mut Vec<String>,
) -> Result<Vec<BackupTextFile>, String> {
    let root = ensure_user_commands_dir(app)?;
    let mut files = Vec::new();
    let entries = fs::read_dir(&root)
        .map_err(|e| format!("Failed to read user commands dir ({}): {}", root.display(), e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }
        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        match fs::read_to_string(&path) {
            Ok(content) => files.push(BackupTextFile {
                path: file_name.to_string(),
                content,
            }),
            Err(error) => warnings.push(format!(
                "跳过命令文件 {}: {}",
                path.display(),
                error
            )),
        }
    }
    Ok(files)
}

fn collect_user_skills(
    app: &AppHandle,
    warnings: &mut Vec<String>,
) -> Result<Vec<BackupSkillDir>, String> {
    let skills_root = ensure_user_skills_dir(app)?;
    let mut result = Vec::new();
    let entries = fs::read_dir(&skills_root).map_err(|e| {
        format!(
            "Failed to read user skills dir ({}): {}",
            skills_root.display(),
            e
        )
    })?;
    for entry in entries.flatten() {
        let skill_dir = entry.path();
        if !skill_dir.is_dir() {
            continue;
        }
        let Some(skill_id) = skill_dir.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let mut files = Vec::new();
        collect_text_files_recursive(&skill_dir, &skill_dir, &mut files, warnings)?;
        result.push(BackupSkillDir {
            id: skill_id.to_string(),
            files,
        });
    }
    Ok(result)
}

fn collect_text_files_recursive(
    root: &Path,
    current: &Path,
    out: &mut Vec<BackupTextFile>,
    warnings: &mut Vec<String>,
) -> Result<(), String> {
    let entries = fs::read_dir(current)
        .map_err(|e| format!("Failed to read {}: {}", current.display(), e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_text_files_recursive(root, &path, out, warnings)?;
            continue;
        }
        let Ok(relative) = path.strip_prefix(root) else {
            continue;
        };
        let relative_str = relative.to_string_lossy().to_string();
        match fs::read_to_string(&path) {
            Ok(content) => out.push(BackupTextFile {
                path: relative_str,
                content,
            }),
            Err(error) => warnings.push(format!("跳过非文本文件 {}: {}", path.display(), error)),
        }
    }
    Ok(())
}

fn sanitize_backup_envelope(envelope: &mut BackupEnvelope) {
    envelope.meta.include_secrets = false;
    sanitize_json_value(&mut envelope.payload.local_state.workbench_storage);
    sanitize_json_value(&mut envelope.payload.local_state.workbench_agent_storage);
    for server in &mut envelope.payload.agent_files.mcp_servers {
        for (key, value) in &mut server.env {
            if is_sensitive_key(key) {
                *value = String::new();
            }
        }
    }
}

fn sanitize_json_value(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, entry) in map {
                if is_sensitive_key(key) {
                    *entry = Value::String(String::new());
                } else {
                    sanitize_json_value(entry);
                }
            }
        }
        Value::Array(items) => {
            for item in items {
                sanitize_json_value(item);
            }
        }
        _ => {}
    }
}

fn is_sensitive_key(key: &str) -> bool {
    let normalized = key.to_ascii_lowercase();
    normalized.contains("api_key")
        || normalized.contains("apikey")
        || normalized.contains("token")
        || normalized.contains("secret")
        || normalized.contains("password")
}

async fn create_rollback_backup(app: &AppHandle) -> Result<(String, Vec<String>), String> {
    let mut warnings = Vec::new();
    let (mut envelope, mut collect_warnings, _) = build_backup_envelope(app, None, false).await?;
    warnings.append(&mut collect_warnings);
    sanitize_backup_envelope(&mut envelope);

    let rollback_dir = backup_work_dir(app)?;
    let rollback_path = rollback_dir.join(format!(
        "rollback-{}.json",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    ));
    fs::write(
        &rollback_path,
        serde_json::to_string_pretty(&envelope)
            .map_err(|e| format!("Failed to serialize rollback backup: {}", e))?,
    )
    .map_err(|e| format!("Failed to write rollback backup: {}", e))?;
    Ok((rollback_path.to_string_lossy().to_string(), warnings))
}

async fn restore_sqlite_data(sqlite: &BackupSqliteData) -> Result<(), String> {
    let pool = get_db_pool()?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to start import transaction: {}", e))?;

    for table in SQLITE_BACKUP_TABLES {
        let delete_sql = format!("DELETE FROM {}", quote_ident(table));
        sqlx::query(&delete_sql)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to clear table {}: {}", table, e))?;
    }

    insert_json_rows(&mut tx, "todos", &sqlite.todos).await?;
    insert_json_rows(&mut tx, "projects", &sqlite.projects).await?;
    insert_json_rows(&mut tx, "events", &sqlite.events).await?;
    insert_json_rows(&mut tx, "personal_tasks", &sqlite.personal_tasks).await?;
    insert_json_rows(&mut tx, "inspirations", &sqlite.inspirations).await?;
    insert_json_rows(&mut tx, "info_sources", &sqlite.info_sources).await?;
    insert_json_rows(&mut tx, "info_settings", &sqlite.info_settings).await?;
    insert_json_rows(&mut tx, "info_items_daily", &sqlite.info_items_daily).await?;
    insert_json_rows(&mut tx, "info_refresh_logs", &sqlite.info_refresh_logs).await?;
    insert_json_rows(&mut tx, "agent_sessions", &sqlite.agent_sessions).await?;
    insert_json_rows(&mut tx, "agent_events", &sqlite.agent_events).await?;
    insert_json_rows(&mut tx, "agent_action_audits", &sqlite.agent_action_audits).await?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit import transaction: {}", e))?;
    Ok(())
}

async fn insert_json_rows(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    table: &str,
    rows: &[Value],
) -> Result<(), String> {
    if rows.is_empty() {
        return Ok(());
    }

    let allowed_columns = get_table_columns(tx, table).await?;
    for row in rows {
        let Some(map) = row.as_object() else {
            continue;
        };

        let keys = map
            .keys()
            .filter(|key| allowed_columns.contains(*key))
            .cloned()
            .collect::<BTreeSet<String>>();
        if keys.is_empty() {
            continue;
        }

        let columns = keys
            .iter()
            .map(|key| quote_ident(key))
            .collect::<Vec<String>>()
            .join(", ");
        let placeholders = vec!["?"; keys.len()].join(", ");
        let sql = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            quote_ident(table),
            columns,
            placeholders
        );

        let mut query = sqlx::query(&sql);
        for key in &keys {
            let value = map.get(key).unwrap_or(&Value::Null);
            query = bind_json_value(query, value)?;
        }
        query
            .execute(&mut **tx)
            .await
            .map_err(|e| format!("Failed to insert row into {}: {}", table, e))?;
    }

    Ok(())
}

async fn get_table_columns(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    table: &str,
) -> Result<HashSet<String>, String> {
    let sql = format!("PRAGMA table_info({})", quote_ident(table));
    let rows = sqlx::query(&sql)
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| format!("Failed to query table_info {}: {}", table, e))?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("name").ok())
        .collect())
}

fn bind_json_value<'q>(
    query: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    value: &Value,
) -> Result<sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>, String> {
    Ok(match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(value) => query.bind(if *value { 1_i64 } else { 0_i64 }),
        Value::Number(number) => {
            if let Some(v) = number.as_i64() {
                query.bind(v)
            } else if let Some(v) = number.as_f64() {
                query.bind(v)
            } else {
                return Err("Unsupported number format in backup".to_string());
            }
        }
        Value::String(value) => query.bind(value.clone()),
        Value::Array(_) | Value::Object(_) => query.bind(
            serde_json::to_string(value)
                .map_err(|e| format!("Failed to serialize JSON cell value: {}", e))?,
        ),
    })
}

fn quote_ident(name: &str) -> String {
    format!("\"{}\"", name.replace('\"', "\"\""))
}

fn restore_agent_files(app: &AppHandle, agent_files: &BackupAgentFiles) -> Result<(), String> {
    write_user_mcp_servers(app, &agent_files.mcp_servers)?;
    restore_user_commands(app, &agent_files.user_commands)?;
    restore_user_skills(app, &agent_files.user_skills)?;
    Ok(())
}

fn restore_user_commands(app: &AppHandle, files: &[BackupTextFile]) -> Result<(), String> {
    let root = ensure_user_commands_dir(app)?;
    let entries = fs::read_dir(&root)
        .map_err(|e| format!("Failed to read commands dir ({}): {}", root.display(), e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") && path.is_file() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove command file {}: {}", path.display(), e))?;
        }
    }

    for file in files {
        let file_path = root.join(&file.path);
        if !is_safe_relative_path(&file.path) {
            return Err(format!("Unsafe command path in backup: {}", file.path));
        }
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create command parent dir: {}", e))?;
        }
        fs::write(&file_path, &file.content)
            .map_err(|e| format!("Failed to restore command file {}: {}", file_path.display(), e))?;
    }
    Ok(())
}

fn restore_user_skills(app: &AppHandle, skills: &[BackupSkillDir]) -> Result<(), String> {
    let root = ensure_user_skills_dir(app)?;
    if root.exists() {
        fs::remove_dir_all(&root)
            .map_err(|e| format!("Failed to clear user skills dir ({}): {}", root.display(), e))?;
    }
    fs::create_dir_all(&root)
        .map_err(|e| format!("Failed to recreate skills dir ({}): {}", root.display(), e))?;

    for skill in skills {
        if !is_safe_relative_path(&skill.id) {
            return Err(format!("Unsafe skill id in backup: {}", skill.id));
        }
        let skill_root = root.join(&skill.id);
        fs::create_dir_all(&skill_root)
            .map_err(|e| format!("Failed to create skill dir {}: {}", skill_root.display(), e))?;
        for file in &skill.files {
            if !is_safe_relative_path(&file.path) {
                return Err(format!(
                    "Unsafe skill file path in backup: {}/{}",
                    skill.id, file.path
                ));
            }
            let file_path = skill_root.join(&file.path);
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create skill parent dir: {}", e))?;
            }
            fs::write(&file_path, &file.content)
                .map_err(|e| format!("Failed to restore skill file {}: {}", file_path.display(), e))?;
        }
    }
    Ok(())
}

fn is_safe_relative_path(path: &str) -> bool {
    let candidate = Path::new(path);
    if candidate.is_absolute() {
        return false;
    }
    !candidate
        .components()
        .any(|part| matches!(part, std::path::Component::ParentDir))
}

fn default_true() -> bool {
    true
}

fn default_codex_exec_args() -> Vec<String> {
    vec![
        "exec".to_string(),
        "--json".to_string(),
        "--skip-git-repo-check".to_string(),
    ]
}

fn default_codex_mcp_args() -> Vec<String> {
    vec!["mcp-server".to_string()]
}

fn default_codex_timeout_ms() -> u64 {
    120_000
}

fn default_openai_provider() -> AgentProviderConfig {
    AgentProviderConfig {
        base_url: "https://api.openai.com/v1".to_string(),
        api_key: String::new(),
        model: "gpt-4o-mini".to_string(),
        api_version: None,
    }
}

fn default_anthropic_provider() -> AgentProviderConfig {
    AgentProviderConfig {
        base_url: "https://api.anthropic.com/v1".to_string(),
        api_key: String::new(),
        model: "claude-3-5-sonnet-latest".to_string(),
        api_version: Some("2023-06-01".to_string()),
    }
}

fn default_minimax_provider() -> AgentProviderConfig {
    AgentProviderConfig {
        base_url: "https://api.minimax.chat/v1".to_string(),
        api_key: String::new(),
        model: "MiniMax-M2.1".to_string(),
        api_version: None,
    }
}

fn default_stdio_transport() -> String {
    "stdio".to_string()
}

fn default_insert_mode() -> String {
    "insert".to_string()
}

fn get_user_agent_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?
        .join("agent");
    fs::create_dir_all(&root).map_err(|e| format!("Failed to create agent app data dir: {}", e))?;
    Ok(root)
}

fn ensure_user_skills_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = get_user_agent_root(app)?.join("skills");
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create skills dir: {}", e))?;
    Ok(path)
}

fn ensure_user_mcp_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = get_user_agent_root(app)?.join("mcp");
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create mcp dir: {}", e))?;
    Ok(path)
}

fn ensure_user_commands_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = get_user_agent_root(app)?.join("commands");
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create commands dir: {}", e))?;
    Ok(path)
}

fn load_tooling_config(app: &AppHandle) -> Result<AgentToolingConfig, String> {
    let mut mcp_map: HashMap<String, McpServerConfig> = HashMap::new();
    for item in load_builtin_mcp_servers() {
        mcp_map.insert(item.name.to_lowercase(), item);
    }
    for item in load_user_mcp_servers(app)? {
        mcp_map.insert(item.name.to_lowercase(), item);
    }

    let mut skill_map: HashMap<String, SkillConfig> = HashMap::new();
    for item in load_builtin_skills() {
        skill_map.insert(item.id.clone(), item);
    }
    for item in load_user_skills(app)? {
        skill_map.insert(item.id.clone(), item);
    }

    let mut command_map: HashMap<String, AgentCommandConfig> = HashMap::new();
    for item in load_builtin_commands() {
        command_map.insert(item.slug.clone(), item);
    }
    for item in load_user_commands(app)? {
        command_map.insert(item.slug.clone(), item);
    }

    let mut mcp_servers = mcp_map.into_values().collect::<Vec<McpServerConfig>>();
    mcp_servers.sort_by(|a, b| a.name.cmp(&b.name));

    let mut skills = skill_map.into_values().collect::<Vec<SkillConfig>>();
    skills.sort_by(|a, b| a.id.cmp(&b.id));

    let mut commands = command_map
        .into_values()
        .collect::<Vec<AgentCommandConfig>>();
    commands.sort_by(|a, b| a.slug.cmp(&b.slug));

    Ok(AgentToolingConfig {
        mcp_servers,
        skills,
        commands,
    })
}

fn load_builtin_skills() -> Vec<SkillConfig> {
    let Some(skill_root) = resolve_first_existing_path(&[
        "agent/skills",
        "../agent/skills",
        "../../agent/skills",
        "app/agent/skills",
    ]) else {
        return vec![];
    };
    load_skills_from_dir(&skill_root, "builtin")
}

fn load_user_skills(app: &AppHandle) -> Result<Vec<SkillConfig>, String> {
    let root = ensure_user_skills_dir(app)?;
    Ok(load_skills_from_dir(&root, "user"))
}

fn load_skills_from_dir(root: &Path, source: &str) -> Vec<SkillConfig> {
    let Ok(entries) = fs::read_dir(root) else {
        return vec![];
    };
    entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .filter_map(|entry| read_skill_manifest(&entry.path(), source).ok())
        .collect::<Vec<SkillConfig>>()
}

fn read_skill_manifest(path: &Path, source: &str) -> Result<SkillConfig, String> {
    let manifest_path = path.join("manifest.json");
    let content = fs::read_to_string(&manifest_path).map_err(|e| {
        format!(
            "Failed to read manifest at {}: {}",
            manifest_path.display(),
            e
        )
    })?;
    let value: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse manifest json: {}", e))?;
    let id = value
        .get("id")
        .and_then(|item| item.as_str())
        .ok_or("Skill manifest missing id".to_string())?
        .to_string();
    let name = value
        .get("name")
        .and_then(|item| item.as_str())
        .unwrap_or(&id)
        .to_string();
    let description = value
        .get("description")
        .and_then(|item| item.as_str())
        .unwrap_or("")
        .to_string();
    let version = value
        .get("version")
        .and_then(|item| item.as_str())
        .unwrap_or("0.1.0")
        .to_string();
    let enabled = value
        .get("enabled")
        .and_then(|item| item.as_bool())
        .unwrap_or(true);

    Ok(SkillConfig {
        id,
        name,
        description,
        version,
        enabled,
        path: path.to_string_lossy().to_string(),
        source: source.to_string(),
    })
}

fn load_builtin_mcp_servers() -> Vec<McpServerConfig> {
    let Some(config_path) = resolve_first_existing_path(&[
        "agent/mcp/servers.json",
        "../agent/mcp/servers.json",
        "../../agent/mcp/servers.json",
        "app/agent/mcp/servers.json",
    ]) else {
        return vec![];
    };
    read_mcp_servers_from_path(&config_path).unwrap_or_default()
}

fn load_user_mcp_servers(app: &AppHandle) -> Result<Vec<McpServerConfig>, String> {
    let config_path = ensure_user_mcp_dir(app)?.join("servers.json");
    if !config_path.exists() {
        return Ok(vec![]);
    }
    read_mcp_servers_from_path(&config_path)
}

fn read_mcp_servers_from_path(path: &Path) -> Result<Vec<McpServerConfig>, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read MCP config {}: {}", path.display(), e))?;
    let parsed: McpServerFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse MCP config {}: {}", path.display(), e))?;
    Ok(parsed.servers)
}

fn write_user_mcp_servers(app: &AppHandle, servers: &[McpServerConfig]) -> Result<(), String> {
    let config_path = ensure_user_mcp_dir(app)?.join("servers.json");
    let data = McpServerFile {
        servers: servers.to_vec(),
    };
    fs::write(
        config_path,
        serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Failed to serialize MCP config: {}", e))?,
    )
    .map_err(|e| format!("Failed to write MCP config: {}", e))?;
    Ok(())
}

fn load_builtin_commands() -> Vec<AgentCommandConfig> {
    let Some(commands_root) = resolve_first_existing_path(&[
        "agent/commands",
        "../agent/commands",
        "../../agent/commands",
        "app/agent/commands",
    ]) else {
        return vec![];
    };
    load_commands_from_dir(&commands_root, "builtin")
}

fn load_user_commands(app: &AppHandle) -> Result<Vec<AgentCommandConfig>, String> {
    let root = ensure_user_commands_dir(app)?;
    Ok(load_commands_from_dir(&root, "user"))
}

fn load_commands_from_dir(root: &Path, source: &str) -> Vec<AgentCommandConfig> {
    let Ok(entries) = fs::read_dir(root) else {
        return vec![];
    };
    entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|ext| ext.to_str()) == Some("md"))
        .filter_map(|path| parse_command_markdown(&path, source).ok())
        .collect::<Vec<AgentCommandConfig>>()
}

fn parse_command_markdown(path: &Path, source: &str) -> Result<AgentCommandConfig, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read command file {}: {}", path.display(), e))?;
    let (frontmatter, body) = split_frontmatter(&content)?;

    let slug = frontmatter.get("slug").cloned().unwrap_or_else(|| {
        path.file_stem()
            .and_then(|item| item.to_str())
            .unwrap_or("command")
            .to_string()
    });
    let title = frontmatter
        .get("title")
        .cloned()
        .unwrap_or_else(|| slug.clone());
    let description = frontmatter.get("description").cloned().unwrap_or_default();
    let enabled = frontmatter
        .get("enabled")
        .map(|value| value == "true")
        .unwrap_or(true);
    let mode = frontmatter
        .get("mode")
        .cloned()
        .unwrap_or_else(default_insert_mode);
    let tags = parse_frontmatter_list(frontmatter.get("tags"));
    let aliases = parse_frontmatter_list(frontmatter.get("aliases"));

    let command = AgentCommandConfig {
        slug: sanitize_slug(&slug),
        title,
        description,
        enabled,
        mode,
        tags,
        aliases,
        body: body.trim().to_string(),
        source: source.to_string(),
    };
    validate_agent_command(&command)?;
    Ok(command)
}

fn split_frontmatter(content: &str) -> Result<(HashMap<String, String>, String), String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---\n") {
        return Ok((HashMap::new(), trimmed.to_string()));
    }
    let rest = &trimmed[4..];
    let Some(end_idx) = rest.find("\n---\n") else {
        return Ok((HashMap::new(), trimmed.to_string()));
    };
    let frontmatter_block = &rest[..end_idx];
    let body = &rest[end_idx + 5..];
    let mut map = HashMap::new();
    for line in frontmatter_block.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((k, v)) = line.split_once(':') else {
            continue;
        };
        map.insert(k.trim().to_string(), v.trim().trim_matches('"').to_string());
    }
    Ok((map, body.to_string()))
}

fn parse_frontmatter_list(input: Option<&String>) -> Vec<String> {
    let Some(raw) = input else {
        return vec![];
    };
    let raw = raw.trim();
    if !raw.starts_with('[') || !raw.ends_with(']') {
        return vec![];
    }
    raw[1..raw.len() - 1]
        .split(',')
        .map(|item| item.trim().trim_matches('"').to_string())
        .filter(|item| !item.is_empty())
        .collect::<Vec<String>>()
}

fn build_command_markdown(command: &AgentCommandConfig) -> String {
    format!(
        "---\nslug: {}\ntitle: \"{}\"\ndescription: \"{}\"\nenabled: {}\nmode: {}\ntags: [{}]\naliases: [{}]\n---\n\n{}\n",
        sanitize_slug(&command.slug),
        command.title.replace('"', "\\\""),
        command.description.replace('"', "\\\""),
        if command.enabled { "true" } else { "false" },
        command.mode,
        command
            .tags
            .iter()
            .map(|item| format!("\"{}\"", item.replace('"', "\\\"")))
            .collect::<Vec<String>>()
            .join(", "),
        command
            .aliases
            .iter()
            .map(|item| format!("\"{}\"", item.replace('"', "\\\"")))
            .collect::<Vec<String>>()
            .join(", "),
        command.body
    )
}

fn sanitize_slug(slug: &str) -> String {
    slug.chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_')
        .collect::<String>()
        .trim_matches('_')
        .trim_matches('-')
        .to_lowercase()
}

fn validate_mcp_server(server: &McpServerConfig) -> Result<(), String> {
    if server.name.trim().is_empty() {
        return Err("MCP server name cannot be empty".to_string());
    }
    if server.transport != "stdio" {
        return Err("Only stdio transport is supported in this version".to_string());
    }
    if server.command.trim().is_empty() {
        return Err("MCP server command cannot be empty".to_string());
    }
    Ok(())
}

fn validate_agent_command(command: &AgentCommandConfig) -> Result<(), String> {
    if sanitize_slug(&command.slug).is_empty() {
        return Err("Command slug is invalid".to_string());
    }
    if command.title.trim().is_empty() {
        return Err("Command title cannot be empty".to_string());
    }
    if command.body.trim().is_empty() {
        return Err("Command body cannot be empty".to_string());
    }
    if command.mode != "insert" && command.mode != "execute" {
        return Err("Command mode must be insert or execute".to_string());
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Failed to create skill directory: {}", e))?;
    let entries =
        fs::read_dir(src).map_err(|e| format!("Failed to read skill source dir: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read skill entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path).map_err(|e| {
                format!(
                    "Failed to copy skill file {} -> {}: {}",
                    src_path.display(),
                    dst_path.display(),
                    e
                )
            })?;
        }
    }
    Ok(())
}

fn resolve_first_existing_path(candidates: &[&str]) -> Option<PathBuf> {
    for candidate in candidates {
        let path = Path::new(candidate);
        if path.exists() {
            return Some(path.to_path_buf());
        }
    }
    None
}
