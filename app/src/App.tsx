import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { TodoPage } from '@/pages/TodoPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { PersonalPage } from '@/pages/PersonalPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { InspirationPage } from '@/pages/InspirationPage';
import { JournalPage } from '@/pages/JournalPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { AppsPage } from '@/pages/AppsPage';
import { AgentPage } from '@/pages/AgentPage';
import { AppContainer } from '@/pages/AppContainer';
import { useAppStore } from '@/stores/appStore';

function App() {
  const [isReady, setIsReady] = useState(false);
  const currentPage = useAppStore((state) => state.currentPage) ?? 'dashboard';
  const backgroundImage = useAppStore((state) => state.backgroundImage);
  const initializeData = useAppStore((state) => state.initializeData);
  const sidebarItems = useAppStore((state) => state.sidebarItems);

  useEffect(() => {
    // Initialize data from database on app start
    initializeData();
    // Give the store a moment to rehydrate
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, [initializeData]);

  // Show loading state until store is ready
  if (!isReady || !Array.isArray(sidebarItems)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#1a3a5c] to-[#0d2847]">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const renderPage = () => {
    // 检查是否是用户应用（以 "app:" 前缀标识）
    if (currentPage?.startsWith('app:')) {
      const appId = currentPage.slice(4);
      return <AppContainer appId={appId} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'todos':
        return <TodoPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'personal':
        return <PersonalPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'inspiration':
        return <InspirationPage />;
      case 'journal':
        return <JournalPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'apps':
        return <AppsPage />;
      case 'agent':
        return <AgentPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background Image Layer */}
      {backgroundImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
      {/* Overlay to maintain readability */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: backgroundImage
            ? 'rgba(13, 40, 71, 0.85)'
            : 'transparent',
        }}
      />
      <Sidebar className="relative z-10" />
      <main className="flex-1 overflow-auto relative z-10">
        <div className="h-full">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
