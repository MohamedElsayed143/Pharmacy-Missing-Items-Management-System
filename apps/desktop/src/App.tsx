import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/common/Navbar';
import { Sidebar, TabType } from './components/common/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { RequestsListPage } from './pages/RequestsListPage';
import { ReceivingPage } from './pages/ReceivingPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ActivityLogPage } from './pages/ActivityLogPage';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Keyboard shortcut listener: Ctrl+N opens new request
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('create-request');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-300">جاري تشغيل محطة العمل...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace: Sidebar + Dynamic Page Content */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Right Sidebar (in RTL layout) */}
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

        {/* Dynamic Content Area - Primary Scroll Container for Mouse Wheel & Touchpad */}
        <main tabIndex={-1} className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6 focus:outline-none">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'create-request' && (
            <CreateRequestPage onCreated={() => setActiveTab('requests')} />
          )}
          {activeTab === 'requests' && <RequestsListPage />}
          {activeTab === 'receiving' && <ReceivingPage />}
          {activeTab === 'employees' && <EmployeesPage />}
          {activeTab === 'activity' && <ActivityLogPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
