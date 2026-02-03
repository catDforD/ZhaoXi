use serde::{Deserialize, Serialize};
use sqlx::Row;
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
