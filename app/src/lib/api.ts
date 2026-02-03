import { invoke } from '@tauri-apps/api/core';
import type { Todo, Project, CalendarEvent, PersonalTask } from '@/types';

// ============= Todo API =============

export async function getTodos(): Promise<Todo[]> {
  return invoke('get_todos');
}

export async function createTodo(title: string, priority: 'normal' | 'urgent'): Promise<Todo> {
  return invoke('create_todo', { title, priority });
}

export interface UpdateTodoRequest {
  id: string;
  title?: string;
  completed?: boolean;
  priority?: string;
}

export async function updateTodo(request: UpdateTodoRequest): Promise<Todo> {
  return invoke('update_todo', request);
}

export async function deleteTodo(id: string): Promise<void> {
  return invoke('delete_todo', { id });
}

// ============= Project API =============

export async function getProjects(): Promise<Project[]> {
  return invoke('get_projects');
}

export async function createProject(title: string, deadline: string): Promise<Project> {
  return invoke('create_project', { title, deadline });
}

export interface UpdateProjectRequest {
  id: string;
  title?: string;
  deadline?: string;
  progress?: number;
  status?: string;
}

export async function updateProject(request: UpdateProjectRequest): Promise<Project> {
  return invoke('update_project', request);
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
  return invoke('create_event', { title, date, color, note });
}

export interface UpdateEventRequest {
  id: string;
  title?: string;
  date?: string;
  color?: string;
  note?: string;
}

export async function updateEvent(request: UpdateEventRequest): Promise<CalendarEvent> {
  return invoke('update_event', request);
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
  return invoke('create_personal_task', { title, budget, date, location, note });
}

export interface UpdatePersonalTaskRequest {
  id: string;
  title?: string;
  budget?: number;
  date?: string;
  location?: string;
  note?: string;
}

export async function updatePersonalTask(request: UpdatePersonalTaskRequest): Promise<PersonalTask> {
  return invoke('update_personal_task', request);
}

export async function deletePersonalTask(id: string): Promise<void> {
  return invoke('delete_personal_task', { id });
}
