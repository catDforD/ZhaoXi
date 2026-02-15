import { useEffect, useMemo, useState } from 'react';
import { Bot, Send, RefreshCw, Wrench, PlugZap, Trash2, Check, X, Settings2 } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentStore } from '@/stores/agentStore';

export function AgentPage() {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const {
    messages,
    pendingActions,
    auditLog,
    settings,
    capabilities,
    mcpServers,
    isSending,
    isExecuting,
    sendMessage,
    executeAction,
    dismissAction,
    clearSession,
    setProvider,
    updateProviderConfig,
    updateReminderConfig,
    loadCapabilities,
    reloadSkills,
    loadMcpServers,
  } = useAgentStore();

  const activeProviderConfig = settings[settings.provider];

  useEffect(() => {
    loadCapabilities();
    loadMcpServers();
  }, [loadCapabilities, loadMcpServers]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;
    const content = input.trim();
    if (!content) return;
    setInput('');
    await sendMessage(content);
  };

  const actionCountText = useMemo(() => {
    if (pendingActions.length === 0) return '暂无待确认动作';
    return `待确认动作 ${pendingActions.length} 条`;
  }, [pendingActions.length]);

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
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.nativeEvent as KeyboardEvent).isComposing) {
                  e.preventDefault();
                }
              }}
              placeholder="例如：帮我把今天的重点任务排优先级并拆分成可执行步骤"
              className="bg-white/5 border-white/15 text-white"
            />
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={reloadSkills}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Skills
              </Button>
            </div>
          </div>

          <div className="space-y-3 overflow-auto flex-1 pr-1">
            <GlassCard className="p-3 bg-white/5">
              <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
                <Settings2 className="w-4 h-4" />
                Provider 设置
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button
                  variant="outline"
                  className={settings.provider === 'openai' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-white/5 border-white/10 text-white'}
                  onClick={() => setProvider('openai')}
                >
                  OpenAI
                </Button>
                <Button
                  variant="outline"
                  className={settings.provider === 'anthropic' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-white/5 border-white/10 text-white'}
                  onClick={() => setProvider('anthropic')}
                >
                  Anthropic
                </Button>
                <Button
                  variant="outline"
                  className={settings.provider === 'minimax' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-white/5 border-white/10 text-white'}
                  onClick={() => setProvider('minimax')}
                >
                  MiniMax
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  value={activeProviderConfig.baseUrl}
                  onChange={(e) => updateProviderConfig(settings.provider, { baseUrl: e.target.value })}
                  placeholder="Base URL"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  value={activeProviderConfig.model}
                  onChange={(e) => updateProviderConfig(settings.provider, { model: e.target.value })}
                  placeholder="Model"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  type="password"
                  value={activeProviderConfig.apiKey}
                  onChange={(e) => updateProviderConfig(settings.provider, { apiKey: e.target.value })}
                  placeholder="API Key"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </GlassCard>

            <GlassCard className="p-3 bg-white/5">
              <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
                <Wrench className="w-4 h-4" />
                能力概览
              </div>
              <p className="text-xs text-white/50">内置工具: {capabilities?.builtinTools.join(', ') || '加载中'}</p>
              <p className="text-xs text-white/50 mt-1">Skills: {capabilities?.skills.join(', ') || '无'}</p>
              <p className="text-xs text-white/50 mt-1">MCP: {mcpServers.join(', ') || '无'}</p>
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
