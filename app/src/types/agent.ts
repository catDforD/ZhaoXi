export type LlmProvider = 'openai' | 'anthropic' | 'minimax';

export interface LlmProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  apiVersion?: string;
}

export interface AgentSettings {
  enabled: boolean;
  defaultLayout: 'split' | 'single';
  morningBriefTime: string;
  eventReminderLeadMinutes: number;
  provider: LlmProvider;
  openai: LlmProviderConfig;
  anthropic: LlmProviderConfig;
  minimax: LlmProviderConfig;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export type AgentActionType =
  | 'todo.create'
  | 'todo.update'
  | 'todo.delete'
  | 'project.create'
  | 'project.update_progress'
  | 'project.delete'
  | 'event.create'
  | 'event.update'
  | 'event.delete'
  | 'personal.create'
  | 'personal.update'
  | 'personal.delete'
  | 'query.snapshot';

export interface AgentActionProposal {
  id: string;
  type: AgentActionType;
  title: string;
  reason: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
}

export interface AgentChatRequest {
  messages: AgentMessage[];
  settings: AgentSettings;
}

export interface AgentChatResponse {
  reply: string;
  actions: AgentActionProposal[];
}

export interface AgentExecuteRequest {
  action: AgentActionProposal;
}

export interface AgentExecuteResponse {
  success: boolean;
  message: string;
}

export interface AgentCapabilities {
  builtinTools: string[];
  skills: string[];
  mcpServers: string[];
}

export interface ExecutionAuditRecord {
  id: string;
  actionId: string;
  success: boolean;
  message: string;
  createdAt: string;
}
