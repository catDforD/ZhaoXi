import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { TodoPage } from '@/pages/TodoPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { PersonalPage } from '@/pages/PersonalPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { JournalPage } from '@/pages/JournalPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { AppsPage } from '@/pages/AppsPage';
import { useAppStore } from '@/stores/appStore';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const { currentPage, backgroundImage, initializeData } = useAppStore();

  useEffect(() => {
    // Initialize data from database on app start
    initializeData();
  }, [initializeData]);

  const renderPage = () => {
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
      case 'journal':
        return <JournalPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'apps':
        return <AppsPage />;
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
