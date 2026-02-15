import { invoke } from '@tauri-apps/api/core';
import type {
  AgentCapabilities,
  AgentChatRequest,
  AgentChatResponse,
  AgentExecuteRequest,
  AgentExecuteResponse,
} from '@/types/agent';

export async function agentChat(request: AgentChatRequest): Promise<AgentChatResponse> {
  return invoke('agent_chat', { request });
}

export async function agentExecuteAction(request: AgentExecuteRequest): Promise<AgentExecuteResponse> {
  return invoke('agent_execute_action', { request });
}

export async function agentListCapabilities(): Promise<AgentCapabilities> {
  return invoke('agent_list_capabilities');
}

export async function agentReloadSkills(): Promise<{ reloaded: number }> {
  return invoke('agent_reload_skills');
}

export async function agentListMcpServers(): Promise<string[]> {
  return invoke('agent_list_mcp_servers');
}
