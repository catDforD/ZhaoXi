import { invoke } from '@tauri-apps/api/core';
import type {
  Todo,
  Project,
  CalendarEvent,
  PersonalTask,
  Inspiration,
  InfoSource,
  InfoSettings,
  InfoItem,
  InfoRefreshResponse,
  InfoRefreshStatus,
} from '@/types';

// ============= Todo API =============

export async function getTodos(): Promise<Todo[]> {
  return invoke('get_todos');
}

export async function createTodo(title: string, priority: 'normal' | 'urgent'): Promise<Todo> {
  return invoke('create_todo', { request: { title, priority } });
}

export interface UpdateTodoRequest extends Record<string, unknown> {
  id: string;
  title?: string;
  completed?: boolean;
  priority?: string;
}

export async function updateTodo(request: UpdateTodoRequest): Promise<Todo> {
  return invoke('update_todo', { request });
}

export async function deleteTodo(id: string): Promise<void> {
  return invoke('delete_todo', { id });
}

// ============= Project API =============

export async function getProjects(): Promise<Project[]> {
  return invoke('get_projects');
}

export async function createProject(title: string, deadline: string): Promise<Project> {
  return invoke('create_project', { request: { title, deadline } });
}

export interface UpdateProjectRequest extends Record<string, unknown> {
  id: string;
  title?: string;
  deadline?: string;
  progress?: number;
  status?: string;
}

export async function updateProject(request: UpdateProjectRequest): Promise<Project> {
  return invoke('update_project', { request });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke('delete_project', { id });
}

// ============= Event API =============

export async function getEvents(): Promise<CalendarEvent[]> {
  return invoke('get_events');
}

export async function getEventsByDate(date: string): Promise<CalendarEvent[]> {
  return invoke('get_events_by_date', { date });
}

export async function createEvent(
  title: string,
  date: string,
  color: string = 'blue',
  note?: string
): Promise<CalendarEvent> {
  return invoke('create_event', { request: { title, date, color, note } });
}

export interface UpdateEventRequest extends Record<string, unknown> {
  id: string;
  title?: string;
  date?: string;
  color?: string;
  note?: string;
}

export async function updateEvent(request: UpdateEventRequest): Promise<CalendarEvent> {
  return invoke('update_event', { request });
}

export async function deleteEvent(id: string): Promise<void> {
  return invoke('delete_event', { id });
}

// ============= Personal Task API =============

export async function getPersonalTasks(): Promise<PersonalTask[]> {
  return invoke('get_personal_tasks');
}

export async function createPersonalTask(
  title: string,
  budget?: number,
  date?: string,
  location?: string,
  note?: string
): Promise<PersonalTask> {
  return invoke('create_personal_task', { request: { title, budget, date, location, note } });
}

export interface UpdatePersonalTaskRequest extends Record<string, unknown> {
  id: string;
  title?: string;
  budget?: number;
  date?: string;
  location?: string;
  note?: string;
}

export async function updatePersonalTask(request: UpdatePersonalTaskRequest): Promise<PersonalTask> {
  return invoke('update_personal_task', { request });
}

export async function deletePersonalTask(id: string): Promise<void> {
  return invoke('delete_personal_task', { id });
}

// ============= Inspiration API =============

export async function getInspirations(includeArchived: boolean = true): Promise<Inspiration[]> {
  return invoke('get_inspirations', { includeArchived });
}

export interface CreateInspirationRequest {
  content: string;
}

export async function createInspiration(content: string): Promise<Inspiration> {
  const request: CreateInspirationRequest = { content };
  return invoke('create_inspiration', { request });
}

export interface ToggleInspirationArchivedRequest {
  id: string;
  isArchived: boolean;
}

export async function toggleInspirationArchived(
  request: ToggleInspirationArchivedRequest
): Promise<Inspiration> {
  return invoke('toggle_inspiration_archived', { request });
}

export async function deleteInspiration(id: string): Promise<void> {
  return invoke('delete_inspiration', { id });
}

// ============= Daily Info Center API =============

export interface UpsertInfoSourceRequest {
  id?: string;
  name: string;
  url: string;
  type: 'rss';
  enabled: boolean;
  isPreset?: boolean;
}

export interface UpdateInfoSettingsRequest {
  pushTime: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  maxItemsPerDay: number;
}

export async function getInfoSources(): Promise<InfoSource[]> {
  return invoke('get_info_sources');
}

export async function upsertInfoSource(request: UpsertInfoSourceRequest): Promise<InfoSource> {
  return invoke('upsert_info_source', { request });
}

export async function deleteInfoSource(id: string): Promise<void> {
  return invoke('delete_info_source', { id });
}

export async function getInfoSettings(): Promise<InfoSettings> {
  return invoke('get_info_settings');
}

export async function updateInfoSettings(request: UpdateInfoSettingsRequest): Promise<InfoSettings> {
  return invoke('update_info_settings', { request });
}

export async function getTodayInfoItems(): Promise<InfoItem[]> {
  return invoke('get_today_info_items');
}

export async function refreshInfoNow(): Promise<InfoRefreshResponse> {
  return invoke('refresh_info_now');
}

export async function getInfoRefreshStatus(): Promise<InfoRefreshStatus> {
  return invoke('get_info_refresh_status');
}

export async function openExternalLink(url: string): Promise<void> {
  return invoke('open_external_link', { url });
}
