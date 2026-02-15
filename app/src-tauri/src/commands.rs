use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::Row;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

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

// ============= Todo Commands =============

#[command]
pub async fn get_todos() -> Result<Vec<Todo>, String> {
    let pool = get_db_pool()?;
    let rows = sqlx::query(
        "SELECT id, title, completed, priority, created_at FROM todos ORDER BY created_at DESC"
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

    sqlx::query(
        "INSERT INTO todos (id, title, priority) VALUES (?1, ?2, ?3)"
    )
    .bind(&id)
    .bind(&request.title)
    .bind(&priority)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create todo: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, completed, priority, created_at FROM todos WHERE id = ?1"
    )
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

    query_builder.execute(pool).await.map_err(|e| format!("Failed to update todo: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, completed, priority, created_at FROM todos WHERE id = ?1"
    )
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
    let rows = sqlx::query(
        "SELECT id, title, deadline, progress, status FROM projects ORDER BY deadline"
    )
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

    let row = sqlx::query(
        "SELECT id, title, deadline, progress, status FROM projects WHERE id = ?1"
    )
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

    query_builder.execute(pool).await.map_err(|e| format!("Failed to update project: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, deadline, progress, status FROM projects WHERE id = ?1"
    )
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
    let rows = sqlx::query(
        "SELECT id, title, date, color, note FROM events ORDER BY date"
    )
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
    let rows = sqlx::query(
        "SELECT id, title, date, color, note FROM events WHERE date = ?1"
    )
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

    sqlx::query(
        "INSERT INTO events (id, title, date, color, note) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(&id)
    .bind(&request.title)
    .bind(&request.date)
    .bind(&color)
    .bind(&request.note)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create event: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, date, color, note FROM events WHERE id = ?1"
    )
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

    query_builder.execute(pool).await.map_err(|e| format!("Failed to update event: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, date, color, note FROM events WHERE id = ?1"
    )
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
        "SELECT id, title, budget, date, location, note FROM personal_tasks ORDER BY date"
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
pub async fn create_personal_task(request: CreatePersonalTaskRequest) -> Result<PersonalTask, String> {
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
        "SELECT id, title, budget, date, location, note FROM personal_tasks WHERE id = ?1"
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
pub async fn update_personal_task(request: UpdatePersonalTaskRequest) -> Result<PersonalTask, String> {
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

    let query = format!("UPDATE personal_tasks SET {} WHERE id = ?", updates.join(", "));
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

    query_builder.execute(pool).await.map_err(|e| format!("Failed to update personal task: {}", e))?;

    let row = sqlx::query(
        "SELECT id, title, budget, date, location, note FROM personal_tasks WHERE id = ?1"
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
    pub openai: AgentProviderConfig,
    pub anthropic: AgentProviderConfig,
    pub minimax: AgentProviderConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentChatRequest {
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

#[derive(Debug, Serialize)]
pub struct AgentExecuteResponse {
    pub success: bool,
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

#[command]
pub async fn agent_chat(request: AgentChatRequest) -> Result<AgentChatResponse, String> {
    let snapshot = build_context_snapshot().await?;
    match call_provider(&request, &snapshot).await {
        Ok(response) => Ok(response),
        Err(error) => Ok(local_fallback_response(
            &request.messages,
            &snapshot,
            Some(error),
        )),
    }
}

#[command]
pub async fn agent_execute_action(request: AgentExecuteRequest) -> Result<AgentExecuteResponse, String> {
    let pool = get_db_pool()?;
    let action = request.action;
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
            let completed = action.payload.get("completed").and_then(|value| value.as_bool());
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
            sqlx::query("INSERT INTO events (id, title, date, color, note) VALUES (?1, ?2, ?3, ?4, ?5)")
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
            let budget = action.payload.get("budget").and_then(|value| value.as_f64());
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
            let budget = action.payload.get("budget").and_then(|value| value.as_f64());
            let date = get_optional_str(&action.payload, "date");
            let location = get_optional_str(&action.payload, "location");
            let note = get_optional_str(&action.payload, "note");
            if title.is_none() && budget.is_none() && date.is_none() && location.is_none() && note.is_none()
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
            let query = format!("UPDATE personal_tasks SET {} WHERE id = ?", updates.join(", "));
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
pub async fn agent_list_capabilities() -> Result<AgentCapabilities, String> {
    let skills = list_skill_ids();
    let mcp_servers = list_mcp_server_names();
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
pub async fn agent_reload_skills() -> Result<ReloadSkillsResponse, String> {
    let reloaded = list_skill_ids().len();
    Ok(ReloadSkillsResponse { reloaded })
}

#[command]
pub async fn agent_list_mcp_servers() -> Result<Vec<String>, String> {
    Ok(list_mcp_server_names())
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
    let today_events = sqlx::query("SELECT id, title, date, color, note FROM events WHERE date = ?1 ORDER BY date LIMIT 10")
        .bind(&today)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to fetch events snapshot: {}", e))?;
    let personal_tasks = sqlx::query("SELECT id, title, date, budget FROM personal_tasks ORDER BY date LIMIT 8")
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
        reply.push_str(&format!(" 模型服务暂不可用（{}），已切换为本地建议模式。", reason));
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

async fn call_provider(request: &AgentChatRequest, snapshot: &Value) -> Result<AgentChatResponse, String> {
    let provider = request.settings.provider.as_str();
    match provider {
        "openai" => call_openai(request, snapshot).await,
        "anthropic" => call_anthropic(request, snapshot).await,
        "minimax" => call_minimax(request, snapshot).await,
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn call_openai(request: &AgentChatRequest, snapshot: &Value) -> Result<AgentChatResponse, String> {
    let config = &request.settings.openai;
    if config.api_key.trim().is_empty() {
        return Err("OpenAI API key is empty".to_string());
    }

    let endpoint = format!(
        "{}/chat/completions",
        config.base_url.trim_end_matches('/')
    );

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

async fn call_anthropic(request: &AgentChatRequest, snapshot: &Value) -> Result<AgentChatResponse, String> {
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

async fn call_minimax(request: &AgentChatRequest, snapshot: &Value) -> Result<AgentChatResponse, String> {
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

fn build_system_prompt(snapshot: &Value) -> String {
    format!(
        "你是 ZhaoXi Workbench Agent。你必须基于上下文数据给出清晰建议，并且仅输出 JSON，结构为: {{\"reply\":\"string\",\"actions\":[{{\"id\":\"string\",\"type\":\"string\",\"title\":\"string\",\"reason\":\"string\",\"payload\":{{}},\"requiresApproval\":true}}]}}。\
        action type 只能使用: todo.create,todo.update,todo.delete,project.create,project.update_progress,project.delete,event.create,event.update,event.delete,personal.create,personal.update,personal.delete,query.snapshot。\
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

fn list_skill_ids() -> Vec<String> {
    let Some(skill_root) = resolve_first_existing_path(&[
        "agent/skills",
        "../agent/skills",
        "../../agent/skills",
        "app/agent/skills",
    ]) else {
        return vec![];
    };

    let Ok(entries) = fs::read_dir(skill_root) else {
        return vec![];
    };

    entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .filter_map(|entry| entry.file_name().into_string().ok())
        .collect::<Vec<String>>()
}

fn list_mcp_server_names() -> Vec<String> {
    let Some(config_path) = resolve_first_existing_path(&[
        "agent/mcp/servers.json",
        "../agent/mcp/servers.json",
        "../../agent/mcp/servers.json",
        "app/agent/mcp/servers.json",
    ]) else {
        return vec![];
    };

    let Ok(content) = fs::read_to_string(config_path) else {
        return vec![];
    };
    let Ok(json_value) = serde_json::from_str::<Value>(&content) else {
        return vec![];
    };
    json_value
        .get("servers")
        .and_then(|value| value.as_array())
        .map(|servers| {
            servers
                .iter()
                .filter_map(|item| item.get("name").and_then(|name| name.as_str()))
                .map(|name| name.to_string())
                .collect::<Vec<String>>()
        })
        .unwrap_or_default()
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
