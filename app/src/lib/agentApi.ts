import { invoke } from '@tauri-apps/api/core';
import type {
  AgentCommand,
  AgentCapabilities,
  AgentChatRequest,
  AgentChatResponse,
  AgentExecuteRequest,
  AgentExecuteResponse,
  AgentToolingConfig,
  McpServerConfig,
  SkillConfig,
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

export async function agentGetToolingConfig(): Promise<AgentToolingConfig> {
  return invoke('agent_get_tooling_config');
}

export async function agentReloadTooling(): Promise<{ mcpServers: number; skills: number; commands: number }> {
  return invoke('agent_reload_tooling');
}

export async function agentUpsertMcpServer(server: McpServerConfig): Promise<void> {
  return invoke('agent_upsert_mcp_server', { request: { server } });
}

export async function agentDeleteMcpServer(name: string): Promise<void> {
  return invoke('agent_delete_mcp_server', { request: { name } });
}

export async function agentImportSkill(path: string): Promise<SkillConfig> {
  return invoke('agent_import_skill', { request: { path } });
}

export async function agentToggleSkill(id: string, enabled: boolean): Promise<void> {
  return invoke('agent_toggle_skill', { request: { id, enabled } });
}

export async function agentDeleteSkill(id: string): Promise<void> {
  return invoke('agent_delete_skill', { request: { id } });
}

export async function agentListCommands(): Promise<AgentCommand[]> {
  return invoke('agent_list_commands');
}

export async function agentUpsertCommand(command: AgentCommand): Promise<void> {
  return invoke('agent_upsert_command', { request: { command } });
}

export async function agentImportCommandMarkdown(path: string): Promise<AgentCommand> {
  return invoke('agent_import_command_markdown', { request: { path } });
}

export async function agentDeleteCommand(slug: string): Promise<void> {
  return invoke('agent_delete_command', { request: { slug } });
}
