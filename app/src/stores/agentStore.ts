import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import * as agentApi from '@/lib/agentApi';
import { useAppStore } from '@/stores/appStore';
import type {
  AgentActionProposal,
  AgentCapabilities,
  AgentCommand,
  AgentMessage,
  AgentSettings,
  ExecutionAuditRecord,
  LlmProvider,
  McpServerConfig,
  SkillConfig,
} from '@/types/agent';

interface AgentState {
  messages: AgentMessage[];
  pendingActions: AgentActionProposal[];
  auditLog: ExecutionAuditRecord[];
  settings: AgentSettings;
  capabilities: AgentCapabilities | null;
  mcpServers: string[];
  mcpConfigs: McpServerConfig[];
  skills: SkillConfig[];
  commands: AgentCommand[];
  toolingLoading: boolean;
  isSending: boolean;
  isExecuting: boolean;
  sendMessage: (content: string) => Promise<void>;
  executeAction: (action: AgentActionProposal) => Promise<void>;
  dismissAction: (actionId: string) => void;
  clearSession: () => void;
  setProvider: (provider: LlmProvider) => void;
  setSlashMode: (mode: 'insert' | 'execute') => void;
  updateProviderConfig: (
    provider: LlmProvider,
    updates: Partial<AgentSettings['openai']>
  ) => void;
  updateReminderConfig: (morningBriefTime: string, leadMinutes: number) => void;
  loadCapabilities: () => Promise<void>;
  reloadSkills: () => Promise<void>;
  loadMcpServers: () => Promise<void>;
  loadToolingConfig: () => Promise<void>;
  upsertMcpServer: (server: McpServerConfig) => Promise<void>;
  deleteMcpServer: (name: string) => Promise<void>;
  importSkill: (path: string) => Promise<void>;
  toggleSkill: (id: string, enabled: boolean) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  upsertCommand: (command: AgentCommand) => Promise<void>;
  importCommandMarkdown: (path: string) => Promise<void>;
  deleteCommand: (slug: string) => Promise<void>;
}

const DEFAULT_SETTINGS: AgentSettings = {
  enabled: true,
  defaultLayout: 'split',
  morningBriefTime: '08:30',
  eventReminderLeadMinutes: 30,
  slashMode: 'insert',
  provider: 'openai',
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-3-5-sonnet-latest',
    apiVersion: '2023-06-01',
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    model: 'MiniMax-M2.1',
  },
};

function createMessage(role: AgentMessage['role'], content: string): AgentMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function isReminderDue(reminderTime: string): boolean {
  const now = new Date();
  const [hour, minute] = reminderTime.split(':').map(Number);
  return now.getHours() === hour && now.getMinutes() < minute + 5;
}

function buildMorningSummary(): string {
  const state = useAppStore.getState();
  const pendingTodos = state.todos.filter((todo) => !todo.completed).length;
  const activeProjects = state.projects.filter((project) => project.status === 'active').length;
  const today = new Date().toISOString().split('T')[0];
  const todaysEvents = state.events.filter((event) => event.date === today).length;
  return `早安。你今天有 ${pendingTodos} 个待办、${activeProjects} 个进行中项目、${todaysEvents} 个日程事件。`;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '未知错误';
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      messages: [
        createMessage(
          'assistant',
          '我是你的工作台 Agent。你可以直接告诉我你的安排目标，我会先给出可执行计划，再由你确认执行。'
        ),
      ],
      pendingActions: [],
      auditLog: [],
      settings: DEFAULT_SETTINGS,
      capabilities: null,
      mcpServers: [],
      mcpConfigs: [],
      skills: [],
      commands: [],
      toolingLoading: false,
      isSending: false,
      isExecuting: false,

      sendMessage: async (content) => {
        const trimmed = content.trim();
        if (!trimmed || get().isSending) return;

        const userMessage = createMessage('user', trimmed);
        set((state) => ({
          messages: [...state.messages, userMessage],
          isSending: true,
        }));

        try {
          const state = get();
          const response = await agentApi.agentChat({
            messages: state.messages,
            settings: state.settings,
          });

          const assistantMessage = createMessage('assistant', response.reply);
          set((prev) => ({
            messages: [...prev.messages, assistantMessage],
            pendingActions: response.actions,
            isSending: false,
          }));
        } catch (error) {
          console.error('Failed to chat with agent:', error);
          set((state) => ({
            messages: [
              ...state.messages,
              createMessage('assistant', '我暂时无法连接模型服务，已切换为本地建议模式。'),
            ],
            isSending: false,
          }));
          toast.error('Agent 请求失败，请检查 Provider 配置');
        }
      },

      executeAction: async (action) => {
        if (get().isExecuting) return;
        set({ isExecuting: true });

        try {
          const result = await agentApi.agentExecuteAction({ action });
          const auditItem: ExecutionAuditRecord = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            actionId: action.id,
            success: result.success,
            message: result.message,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            pendingActions: state.pendingActions.filter((item) => item.id !== action.id),
            auditLog: [auditItem, ...state.auditLog].slice(0, 50),
            isExecuting: false,
          }));

          if (result.success) {
            const appState = useAppStore.getState();
            await Promise.all([
              appState.fetchTodos(),
              appState.fetchProjects(),
              appState.fetchEvents(),
              appState.fetchPersonalTasks(),
            ]);
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        } catch (error) {
          console.error('Failed to execute agent action:', error);
          toast.error('执行失败，请稍后重试');
          set({ isExecuting: false });
        }
      },

      dismissAction: (actionId) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter((item) => item.id !== actionId),
        }));
      },

      clearSession: () => {
        set({
          messages: [
            createMessage(
              'assistant',
              '会话已清空。你可以继续告诉我新的安排目标。'
            ),
          ],
          pendingActions: [],
        });
      },

      setProvider: (provider) => {
        set((state) => ({
          settings: {
            ...state.settings,
            provider,
          },
        }));
      },

      setSlashMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            slashMode: mode,
          },
        }));
      },

      updateProviderConfig: (provider, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [provider]: {
              ...state.settings[provider],
              ...updates,
            },
          },
        }));
      },

      updateReminderConfig: (morningBriefTime, leadMinutes) => {
        set((state) => ({
          settings: {
            ...state.settings,
            morningBriefTime,
            eventReminderLeadMinutes: leadMinutes,
          },
        }));
      },

      loadCapabilities: async () => {
        try {
          const capabilities = await agentApi.agentListCapabilities();
          set({ capabilities });
        } catch (error) {
          console.error('Failed to load agent capabilities:', error);
        }
      },

      reloadSkills: async () => {
        try {
          const result = await agentApi.agentReloadSkills();
          toast.success(`Skills 已重载 (${result.reloaded})`);
          await get().loadToolingConfig();
          await get().loadCapabilities();
        } catch (error) {
          console.error('Failed to reload skills:', error);
          toast.error('Skills 重载失败');
        }
      },

      loadMcpServers: async () => {
        try {
          const servers = await agentApi.agentListMcpServers();
          set({ mcpServers: servers });
        } catch (error) {
          console.error('Failed to load MCP servers:', error);
          set({ mcpServers: [] });
        }
      },

      loadToolingConfig: async () => {
        set({ toolingLoading: true });
        try {
          const tooling = await agentApi.agentGetToolingConfig();
          set({
            mcpConfigs: tooling.mcpServers,
            skills: tooling.skills,
            commands: tooling.commands,
            toolingLoading: false,
          });
          await get().loadMcpServers();
        } catch (error) {
          console.error('Failed to load tooling config:', error);
          set({ toolingLoading: false });
        }
      },

      upsertMcpServer: async (server) => {
        try {
          await agentApi.agentUpsertMcpServer(server);
          await get().loadToolingConfig();
          await get().loadCapabilities();
          toast.success('MCP 配置已保存');
        } catch (error) {
          console.error('Failed to save MCP config:', error);
          toast.error('保存 MCP 配置失败');
        }
      },

      deleteMcpServer: async (name) => {
        try {
          await agentApi.agentDeleteMcpServer(name);
          await get().loadToolingConfig();
          await get().loadCapabilities();
          toast.success('MCP 已删除');
        } catch (error) {
          console.error('Failed to delete MCP config:', error);
          toast.error('删除 MCP 失败');
        }
      },

      importSkill: async (path) => {
        try {
          const imported = await agentApi.agentImportSkill(path);
          await get().loadToolingConfig();
          await get().loadCapabilities();
          toast.success(`Skill 已导入: ${imported.id}`);
        } catch (error) {
          console.error('Failed to import skill:', error);
          toast.error(`导入 Skill 失败: ${getErrorMessage(error)}`);
        }
      },

      toggleSkill: async (id, enabled) => {
        try {
          await agentApi.agentToggleSkill(id, enabled);
          await get().loadToolingConfig();
          await get().loadCapabilities();
        } catch (error) {
          console.error('Failed to toggle skill:', error);
          toast.error('更新 Skill 状态失败');
        }
      },

      deleteSkill: async (id) => {
        try {
          await agentApi.agentDeleteSkill(id);
          await get().loadToolingConfig();
          await get().loadCapabilities();
          toast.success('Skill 已删除');
        } catch (error) {
          console.error('Failed to delete skill:', error);
          toast.error('删除 Skill 失败');
        }
      },

      upsertCommand: async (command) => {
        try {
          await agentApi.agentUpsertCommand(command);
          await get().loadToolingConfig();
          toast.success('Command 已保存');
        } catch (error) {
          console.error('Failed to upsert command:', error);
          toast.error('保存 Command 失败');
        }
      },

      importCommandMarkdown: async (path) => {
        try {
          const imported = await agentApi.agentImportCommandMarkdown(path);
          await get().loadToolingConfig();
          toast.success(`Command 已导入: /${imported.slug}`);
        } catch (error) {
          console.error('Failed to import command markdown:', error);
          toast.error(`导入 Command 失败: ${getErrorMessage(error)}`);
        }
      },

      deleteCommand: async (slug) => {
        try {
          await agentApi.agentDeleteCommand(slug);
          await get().loadToolingConfig();
          toast.success('Command 已删除');
        } catch (error) {
          console.error('Failed to delete command:', error);
          toast.error('删除 Command 失败');
        }
      },
    }),
    {
      name: 'workbench-agent-storage',
      partialize: (state) => ({
        settings: state.settings,
        messages: state.messages.slice(-20),
        auditLog: state.auditLog.slice(0, 20),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.settings = {
          ...DEFAULT_SETTINGS,
          ...state.settings,
          openai: {
            ...DEFAULT_SETTINGS.openai,
            ...state.settings?.openai,
          },
          anthropic: {
            ...DEFAULT_SETTINGS.anthropic,
            ...state.settings?.anthropic,
          },
          minimax: {
            ...DEFAULT_SETTINGS.minimax,
            ...state.settings?.minimax,
          },
        };
        if (state.settings.enabled && isReminderDue(state.settings.morningBriefTime)) {
          state.messages = [
            ...state.messages,
            createMessage('assistant', buildMorningSummary()),
          ];
        }
      },
    }
  )
);
