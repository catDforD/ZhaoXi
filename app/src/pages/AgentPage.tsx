import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Send,
  PlugZap,
  Trash2,
  Check,
  X,
  Settings2,
  Slash,
  FileUp,
} from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentCommand, AgentStreamEvent } from '@/types/agent';

export function AgentPage() {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  const [commandImportPath, setCommandImportPath] = useState('');

  const {
    messages,
    pendingActions,
    auditLog,
    settings,
    commands,
    isSending,
    isExecuting,
    sendMessage,
    executeAction,
    dismissAction,
    clearSession,
    setSlashMode,
    updateReminderConfig,
    updateCodexConfig,
    loadToolingConfig,
    importCommandMarkdown,
    deleteCommand,
  } = useAgentStore();

  useEffect(() => {
    loadToolingConfig();
  }, [loadToolingConfig]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<AgentStreamEvent>('agent_stream', (event) => {
      const raw = event.payload as AgentStreamEvent & {
        request_id?: string;
        created_at?: string;
      };
      const payload: AgentStreamEvent = {
        ...raw,
        requestId: raw.requestId ?? raw.request_id ?? '',
        createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
      };
      if (!payload?.message) return;
      if (payload.stage === 'error') toast.error(payload.message);
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const slashQuery = useMemo(() => {
    if (!input.startsWith('/')) return '';
    return input.slice(1).trimStart().toLowerCase();
  }, [input]);

  const slashCommands = useMemo(() => {
    const enabledCommands = commands.filter((item) => item.enabled);
    if (!input.startsWith('/')) return [];
    if (!slashQuery) return enabledCommands;

    return enabledCommands.filter((item) => {
      const searchSpace = [
        item.slug,
        item.title,
        item.description,
        ...item.tags,
        ...item.aliases,
      ]
        .join(' ')
        .toLowerCase();
      return searchSpace.includes(slashQuery);
    });
  }, [commands, input, slashQuery]);

  const slashOpen = input.startsWith('/') && slashCommands.length > 0;
  const selectedSlashIndex = slashCommands.length > 0
    ? Math.min(slashIndex, slashCommands.length - 1)
    : 0;

  const applySlashCommand = async (command: AgentCommand) => {
    const shouldExecute = settings.slashMode === 'execute' || command.mode === 'execute';
    if (shouldExecute) {
      setInput('');
      await sendMessage(command.body);
      return;
    }
    setInput(command.body);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    const content = input.trim();
    if (!content) return;
    setInput('');
    await sendMessage(content);
  };

  const onKeyDownInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (slashOpen && !isComposing) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % slashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + slashCommands.length) % slashCommands.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        const command = slashCommands[selectedSlashIndex];
        if (command) {
          e.preventDefault();
          await applySlashCommand(command);
          return;
        }
      }
    }

    if (e.key === 'Enter' && (e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault();
    }
  };

  const actionCountText = useMemo(() => {
    if (pendingActions.length === 0) return '暂无待确认动作';
    return `待确认动作 ${pendingActions.length} 条`;
  }, [pendingActions.length]);

  const handlePickCommandFile = async () => {
    const selected = await openDialog({
      directory: false,
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (!selected || Array.isArray(selected)) {
      toast.info('未选择命令文件');
      return;
    }
    setCommandImportPath(selected);
    await importCommandMarkdown(selected);
  };

  const handleImportCommandByPath = async () => {
    const path = commandImportPath.trim();
    if (!path) {
      toast.error('请先输入 .md 文件路径');
      return;
    }
    await importCommandMarkdown(path);
  };

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4 h-full">
        <GlassCard className="p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-white font-semibold">工作台 Agent</h2>
                <p className="text-xs text-white/50">自然语言规划与执行</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={clearSession}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清空会话
            </Button>
          </div>

          <div className="flex-1 overflow-auto rounded-lg bg-black/20 border border-white/10 p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={message.role === 'user'
                    ? 'max-w-[85%] rounded-xl px-3 py-2 bg-cyan-500/20 text-cyan-50 text-sm'
                    : 'max-w-[85%] rounded-xl px-3 py-2 bg-white/10 text-white text-sm'}
                >
                  <div className="markdown-body whitespace-pre-wrap break-words leading-6">
                    <ReactMarkdown
                      skipHtml
                      components={{
                        a: ({ ...props }) => (
                          <a {...props} className="text-cyan-300 underline break-all" target="_blank" rel="noreferrer" />
                        ),
                        code: ({ children, ...props }) => (
                          <code {...props} className="rounded bg-black/25 px-1 py-0.5 text-cyan-100">
                            {children}
                          </code>
                        ),
                        pre: ({ children, ...props }) => (
                          <pre {...props} className="my-2 overflow-auto rounded-md bg-black/30 p-2 text-xs">
                            {children}
                          </pre>
                        ),
                        ul: ({ children, ...props }) => <ul {...props} className="my-1 list-disc pl-5">{children}</ul>,
                        ol: ({ children, ...props }) => <ol {...props} className="my-1 list-decimal pl-5">{children}</ol>,
                        p: ({ children, ...props }) => <p {...props} className="my-1">{children}</p>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-3 flex gap-2 relative">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value.startsWith('/')) {
                    setSlashIndex(0);
                  }
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={onKeyDownInput}
                placeholder="输入 / 可快捷选择命令，例如 /plan-week"
                className="bg-white/5 border-white/15 text-white"
              />
              {input.startsWith('/') && (
                <div className="absolute left-0 right-0 bottom-12 z-20 rounded-md border border-white/15 bg-zinc-950/95 backdrop-blur-sm overflow-hidden">
                  <Command className="bg-transparent text-white">
                    <CommandList>
                      <CommandEmpty className="text-xs text-white/60 py-2">无匹配命令</CommandEmpty>
                      <CommandGroup heading="Commands">
                        {slashCommands.map((command, index) => (
                          <CommandItem
                            key={command.slug}
                            onSelect={() => void applySlashCommand(command)}
                            className={index === selectedSlashIndex ? 'bg-white/10 text-white' : 'text-white/80'}
                          >
                            <Slash className="w-4 h-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">/{command.slug} · {command.title}</p>
                              <p className="text-xs text-white/50 truncate">{command.description || '无描述'}</p>
                            </div>
                            <span className="text-[10px] text-white/40 uppercase">{command.mode}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSending}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/30"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? '发送中' : '发送'}
            </Button>
          </form>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-semibold">执行面板</h3>
              <p className="text-xs text-white/50">{actionCountText}</p>
            </div>
          </div>

          <div className="space-y-3 overflow-auto flex-1 pr-1">
            <GlassCard className="p-3 bg-white/5">
              <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
                <Settings2 className="w-4 h-4" />
                Codex 设置
              </div>
              <div className="space-y-2">
                <Input
                  value={settings.codex.binaryPath ?? ''}
                  onChange={(e) => updateCodexConfig({ binaryPath: e.target.value || undefined })}
                  placeholder="Codex Binary Path (optional)"
                  className="bg-white/5 border-white/10 text-white"
                />
                <div className="flex items-center justify-between rounded-md border border-white/10 p-2">
                  <span className="text-xs text-white/70">优先 MCP 通道</span>
                  <Switch
                    checked={settings.codex.preferMcp}
                    onCheckedChange={(checked) => updateCodexConfig({ preferMcp: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/10 p-2">
                  <span className="text-xs text-white/70">Slash 选择后直接执行</span>
                  <Switch
                    checked={settings.slashMode === 'execute'}
                    onCheckedChange={(checked) => setSlashMode(checked ? 'execute' : 'insert')}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-3 bg-white/5 space-y-2">
              <div className="flex items-center justify-between text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Slash className="w-4 h-4" />
                  Commands（上传 .md）
                </div>
                <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white" onClick={() => void handlePickCommandFile()}>
                  <FileUp className="w-4 h-4 mr-1" />
                  选择 .md
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={commandImportPath}
                  onChange={(e) => setCommandImportPath(e.target.value)}
                  placeholder="/path/to/command.md"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button size="sm" className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/30" onClick={() => void handleImportCommandByPath()}>
                  导入
                </Button>
              </div>
              <p className="text-[11px] text-white/50">命令文件需为 frontmatter + markdown 正文格式。</p>
              <div className="space-y-2 max-h-44 overflow-auto">
                {commands.map((item) => (
                  <div key={`${item.source}-${item.slug}`} className="rounded-md border border-white/10 p-2 text-xs text-white/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-medium">/{item.slug}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-white/40">{item.mode}</span>
                        {item.source === 'user' && (
                          <Button size="sm" variant="outline" className="h-7 bg-white/5 border-white/10 text-white" onClick={() => void deleteCommand(item.slug)}>
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-white/50 mt-1">{item.title} · {item.description || '无描述'} · {item.source}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-3 bg-white/5">
              <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
                <PlugZap className="w-4 h-4" />
                主动提醒
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={settings.morningBriefTime}
                  onChange={(e) => updateReminderConfig(e.target.value, settings.eventReminderLeadMinutes)}
                  placeholder="08:30"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  type="number"
                  value={settings.eventReminderLeadMinutes}
                  onChange={(e) => updateReminderConfig(settings.morningBriefTime, Number(e.target.value) || 30)}
                  placeholder="30"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </GlassCard>

            {pendingActions.map((action) => (
              <GlassCard key={action.id} className="p-3 bg-white/5">
                <div className="text-sm text-white font-medium">{action.title}</div>
                <div className="text-xs text-white/50 mt-1">{action.reason}</div>
                <div className="text-xs text-cyan-300 mt-2">{action.type}</div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    disabled={isExecuting}
                    className="bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30"
                    onClick={() => executeAction(action)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    确认执行
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    onClick={() => dismissAction(action.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    忽略
                  </Button>
                </div>
              </GlassCard>
            ))}

            {auditLog.length > 0 && (
              <GlassCard className="p-3 bg-white/5">
                <h4 className="text-sm text-white/80 mb-2">执行记录</h4>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {auditLog.map((item) => (
                    <div key={item.id} className="text-xs">
                      <span className={item.success ? 'text-green-300' : 'text-red-300'}>
                        {item.success ? '成功' : '失败'}
                      </span>
                      <span className="text-white/60 ml-2">{item.message}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
