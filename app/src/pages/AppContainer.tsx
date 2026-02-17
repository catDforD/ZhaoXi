import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { DynamicIcon } from '@/components/features/DynamicIcon';
import type { UserApp } from '@/types';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, resolve } from '@tauri-apps/api/path';
import { openExternalLink } from '@/lib/api';

interface AppContainerProps {
  appId: string;
}

export function AppContainer({ appId }: AppContainerProps) {
  const { userApps, setCurrentPage, closeUserApp } = useAppStore();
  const [app, setApp] = useState<UserApp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 解析应用 URL
  useEffect(() => {
    const resolveAppUrl = async () => {
      const foundApp = userApps.find((a) => a.id === appId);
      if (!foundApp) {
        setLoadError(`应用 "${appId}" 不存在`);
        setIsLoading(false);
        return;
      }

      setApp(foundApp);
      setLoadError(null);

      if (foundApp.type === 'web') {
        setResolvedUrl(foundApp.url);
      } else if (foundApp.localPath) {
        // 本地应用路径处理
        if (foundApp.localPath.startsWith('/apps/')) {
          // 内置本地应用 - 使用 Vite 开发服务器或生产环境路径
          if (import.meta.env.DEV) {
            setResolvedUrl(`http://localhost:5173${foundApp.localPath}`);
          } else {
            // 生产环境：使用 convertFileSrc 转换文件路径
            try {
              const dataDir = await appDataDir();
              const fullPath = await resolve(dataDir, '..', 'apps', foundApp.localPath.replace('/apps/', ''));
              setResolvedUrl(convertFileSrc(fullPath));
            } catch {
              // 如果失败，尝试相对路径
              setResolvedUrl(foundApp.localPath);
            }
          }
        } else {
          // 用户自定义本地路径
          setResolvedUrl(convertFileSrc(foundApp.localPath));
        }
      }
    };

    resolveAppUrl();
  }, [appId, userApps]);

  // 检测加载超时
  useEffect(() => {
    if (!app || !isLoading) return;

    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 10000); // 10秒超时

    return () => clearTimeout(timer);
  }, [app, isLoading]);

  const handleBack = () => {
    setCurrentPage('apps');
  };

  const handleClose = () => {
    closeUserApp(appId);
    setCurrentPage('apps');
  };

  const handleOpenExternal = async () => {
    if (app?.url) {
      try {
        await openExternalLink(app.url);
      } catch (error) {
        console.error('Failed to open external URL:', error);
        window.open(app.url, '_blank');
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError('应用加载失败，该网站可能禁止在 iframe 中显示');
  };

  if (!app && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">出错了</h3>
        <p className="text-sm text-white/50 mb-6">应用不存在或已被删除</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回应用列表
        </Button>
      </div>
    );
  }


  if (!resolvedUrl && app) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">无法加载应用</h3>
        <p className="text-sm text-white/50 mb-6">
          {app.type === 'web' ? '该应用没有配置有效的 URL' : '该应用没有配置有效的本地路径'}
        </p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回应用列表
        </Button>
      </div>
    );
  }

  // 检测是否可能是无法 iframe 加载的网站
  const isBlockedSite = app?.type === 'web' && app?.url && (
    app.url.includes('github.com') ||
    app.url.includes('notion.so') ||
    app.url.includes('figma.com') ||
    app.url.includes('claude.ai') ||
    app.url.includes('chat.deepseek.com')
  );

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${app?.color}`}>
              <DynamicIcon name={app?.icon || 'Grid3X3'} className="w-4 h-4" />
            </div>
            <div>
              <span className="font-medium text-white">{app?.name}</span>
              {app?.description && (
                <span className="ml-2 text-xs text-white/40">{app.description}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {app?.url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenExternal}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              外部打开
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white/70 hover:text-white hover:bg-red-500/20 hover:text-red-400"
          >
            <X className="w-4 h-4 mr-1" />
            关闭
          </Button>
        </div>
      </div>

      {/* iframe 内容区 */}
      <div className="flex-1 relative">
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
            <span className="text-white/60 text-sm">正在加载应用...</span>
            {loadTimeout && (
              <div className="mt-4 text-center max-w-md">
                <p className="text-white/40 text-xs mb-3">
                  加载时间较长，该网站可能禁止在 iframe 中显示
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenExternal}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在外部浏览器打开
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {(loadError || (loadTimeout && !isLoading)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">无法在此加载应用</h3>
            <p className="text-sm text-white/50 mb-2 max-w-md text-center">
              {isBlockedSite
                ? '该网站设置了安全策略，禁止在 iframe 中显示。这是网站的正常安全行为。'
                : '该网站可能设置了安全策略，阻止了 iframe 加载。'}
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              {app?.url && (
                <Button
                  onClick={handleOpenExternal}
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在外部浏览器打开
                </Button>
              )}
            </div>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={resolvedUrl}
          className="w-full h-full border-none"
          title={app?.name}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="fullscreen; clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
}
