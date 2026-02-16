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
  AgentRunState,
  AgentSettings,
  AgentStreamEvent,
  ExecutionAuditRecord,
} from '@/types/agent';

interface AgentState {
  messages: AgentMessage[];
  currentRun: AgentRunState | null;
  lastUserInput: string | null;
  pendingActions: AgentActionProposal[];
  auditLog: ExecutionAuditRecord[];
  settings: AgentSettings;
  capabilities: AgentCapabilities | null;
  commands: AgentCommand[];
  toolingLoading: boolean;
  isSending: boolean;
  isExecuting: boolean;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  consumeStreamEvent: (event: AgentStreamEvent) => void;
  executeAction: (action: AgentActionProposal) => Promise<void>;
  dismissAction: (actionId: string) => void;
  clearSession: () => void;
  setSlashMode: (mode: 'insert' | 'execute') => void;
  updateReminderConfig: (morningBriefTime: string, leadMinutes: number) => void;
  updateCodexConfig: (updates: Partial<AgentSettings['codex']>) => void;
  loadCapabilities: () => Promise<void>;
  loadToolingConfig: () => Promise<void>;
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
  provider: 'codex_local',
  codex: {
    enabled: true,
    preferMcp: true,
    execArgs: ['exec', '--json', '--skip-git-repo-check'],
    mcpArgs: ['mcp-server'],
    requestTimeoutMs: 120000,
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

const STAGE_PERCENT: Record<AgentStreamEvent['stage'], number> = {
  runtime_detect: 10,
  mcp_connect: 20,
  exec_fallback: 20,
  planning: 60,
  executing: 70,
  fallback: 90,
  completed: 100,
  error: 0,
};

function createRunState(requestId: string): AgentRunState {
  const startedAt = new Date().toISOString();
  return {
    requestId,
    status: 'running',
    stage: 'runtime_detect',
    percent: 0,
    message: '请求已发送',
    startedAt,
    actionProgress: {
      total: 0,
      completed: 0,
      success: 0,
      failed: 0,
    },
    events: [],
  };
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
      currentRun: null,
      lastUserInput: null,
      auditLog: [],
      settings: DEFAULT_SETTINGS,
      capabilities: null,
      commands: [],
      toolingLoading: false,
      isSending: false,
      isExecuting: false,

      sendMessage: async (content) => {
        const trimmed = content.trim();
        if (!trimmed || get().isSending) return;
        const requestId = `req-${Date.now()}`;

        const userMessage = createMessage('user', trimmed);
        set((state) => ({
          messages: [...state.messages, userMessage],
          currentRun: createRunState(requestId),
          lastUserInput: trimmed,
          isSending: true,
        }));

        try {
          const state = get();
          const response = await agentApi.agentChat({
            requestId,
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
            currentRun: state.currentRun
              ? {
                  ...state.currentRun,
                  status: 'error',
                  stage: 'error',
                  message: getErrorMessage(error),
                  endedAt: new Date().toISOString(),
                  durationMs:
                    new Date().getTime() - new Date(state.currentRun.startedAt).getTime(),
                  error: { reason: getErrorMessage(error), retryable: true },
                }
              : null,
            isSending: false,
          }));
          toast.error('Agent 请求失败，请检查 Provider 配置');
        }
      },

      retryLastMessage: async () => {
        const last = get().lastUserInput;
        if (!last || get().isSending) return;
        await get().sendMessage(last);
      },

      consumeStreamEvent: (event) => {
        const currentRun = get().currentRun;
        if (!currentRun) return;

        let current = currentRun;
        if (event.requestId && event.requestId !== current.requestId) {
          // Allow first incoming stream event to bind the canonical requestId
          // if backend generated/normalized a different id.
          if (current.events.length === 0 && current.status === 'running') {
            current = { ...current, requestId: event.requestId };
          } else {
            return;
          }
        }

        const actionProgress = { ...current.actionProgress };
        if (event.meta && typeof event.meta === 'object') {
          const total = event.meta.total;
          const completed = event.meta.completed;
          const success = event.meta.success;
          const failed = event.meta.failed;
          if (typeof total === 'number') actionProgress.total = total;
          if (typeof completed === 'number') actionProgress.completed = completed;
          if (typeof success === 'number') actionProgress.success = success;
          if (typeof failed === 'number') actionProgress.failed = failed;
        }

        let percent = STAGE_PERCENT[event.stage] ?? current.percent;
        if (event.stage === 'executing' && actionProgress.total > 0) {
          const ratio = Math.min(1, actionProgress.completed / actionProgress.total);
          percent = Math.round(60 + ratio * 35);
        } else if (event.stage === 'error') {
          percent = current.percent;
        }

        const nextRun: AgentRunState = {
          ...current,
          stage: event.stage,
          message: event.message,
          percent,
          actionProgress,
          events: [...current.events, event].slice(-80),
        };

        if (event.stage === 'fallback') {
          nextRun.status = 'fallback';
        } else if (event.stage === 'completed') {
          const endedAt = new Date().toISOString();
          nextRun.status = 'completed';
          nextRun.endedAt = endedAt;
          nextRun.durationMs = new Date(endedAt).getTime() - new Date(current.startedAt).getTime();
        } else if (event.stage === 'error') {
          const endedAt = new Date().toISOString();
          const reason =
            typeof event.meta?.reason === 'string' ? event.meta.reason : event.message;
          const retryable =
            typeof event.meta?.retryable === 'boolean' ? event.meta.retryable : true;
          nextRun.status = 'error';
          nextRun.endedAt = endedAt;
          nextRun.durationMs = new Date(endedAt).getTime() - new Date(current.startedAt).getTime();
          nextRun.error = { reason, retryable };
        } else {
          nextRun.status = 'running';
        }

        set({ currentRun: nextRun });
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
          currentRun: null,
          lastUserInput: null,
        });
      },

      setSlashMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            slashMode: mode,
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

      updateCodexConfig: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            codex: {
              ...state.settings.codex,
              ...updates,
            },
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

      loadToolingConfig: async () => {
        set({ toolingLoading: true });
        try {
          const tooling = await agentApi.agentGetToolingConfig();
          set({
            commands: tooling.commands,
            toolingLoading: false,
          });
        } catch (error) {
          console.error('Failed to load tooling config:', error);
          set({ toolingLoading: false });
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
          provider: 'codex_local',
          codex: {
            ...DEFAULT_SETTINGS.codex,
            ...state.settings?.codex,
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
