import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import * as agentApi from '@/lib/agentApi';
import { useAppStore } from '@/stores/appStore';
import type {
  AgentActionProposal,
  AgentCapabilities,
  AgentMessage,
  AgentSettings,
  ExecutionAuditRecord,
  LlmProvider,
} from '@/types/agent';

interface AgentState {
  messages: AgentMessage[];
  pendingActions: AgentActionProposal[];
  auditLog: ExecutionAuditRecord[];
  settings: AgentSettings;
  capabilities: AgentCapabilities | null;
  mcpServers: string[];
  isSending: boolean;
  isExecuting: boolean;
  sendMessage: (content: string) => Promise<void>;
  executeAction: (action: AgentActionProposal) => Promise<void>;
  dismissAction: (actionId: string) => void;
  clearSession: () => void;
  setProvider: (provider: LlmProvider) => void;
  updateProviderConfig: (
    provider: LlmProvider,
    updates: Partial<AgentSettings['openai']>
  ) => void;
  updateReminderConfig: (morningBriefTime: string, leadMinutes: number) => void;
  loadCapabilities: () => Promise<void>;
  reloadSkills: () => Promise<void>;
  loadMcpServers: () => Promise<void>;
}

const DEFAULT_SETTINGS: AgentSettings = {
  enabled: true,
  defaultLayout: 'split',
  morningBriefTime: '08:30',
  eventReminderLeadMinutes: 30,
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
