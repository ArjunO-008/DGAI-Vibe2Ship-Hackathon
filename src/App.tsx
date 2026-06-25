import React, { useState, useEffect } from 'react';
import type { UserProfile, Goal, Task } from './types';
import { hasApiKey } from './services/gemini';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { GoalDetail } from './pages/GoalDetail';
import { Settings } from './pages/Settings';
import { Shield, AlertTriangle, Moon, Sun, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'goal-detail' | 'settings'>('onboarding');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // App Config State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [keyAvailable, setKeyAvailable] = useState(hasApiKey());

  // Load Initial Data from LocalStorage
  useEffect(() => {
    const storedProfile = localStorage.getItem('deadline_guardian_profile');
    const storedGoals = localStorage.getItem('deadline_guardian_goals');
    const storedTasks = localStorage.getItem('deadline_guardian_tasks');
    const storedTheme = localStorage.getItem('deadline_guardian_theme');

    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
      setView('dashboard');
    } else {
      setView('onboarding');
    }

    if (storedGoals) setGoals(JSON.parse(storedGoals));
    if (storedTasks) setTasks(JSON.parse(storedTasks));
    
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setIsDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  // Monitor API Key changes periodically
  useEffect(() => {
    const handleStorageChange = () => {
      setKeyAvailable(hasApiKey());
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000); // Poll local changes too
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Theme Handler
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('deadline_guardian_theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('deadline_guardian_theme', 'light');
    }
  };

  // State update helpers (with localStorage synchronization)
  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('deadline_guardian_profile', JSON.stringify(newProfile));
  };

  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    localStorage.setItem('deadline_guardian_goals', JSON.stringify(newGoals));
  };

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('deadline_guardian_tasks', JSON.stringify(newTasks));
  };

  // Handlers
  const handleOnboardingComplete = (userProfile: UserProfile, newGoals: Goal[], newTasks: Task[]) => {
    saveProfile(userProfile);
    saveGoals(newGoals);
    saveTasks(newTasks);
    setView('dashboard');
  };

  const handleCreateGoal = async (newGoal: Goal, newTasks: Task[]) => {
    const updatedGoals = [...goals, newGoal];
    const updatedTasks = [...tasks, ...newTasks];
    saveGoals(updatedGoals);
    saveTasks(updatedTasks);
  };

  const handleUpdateTaskStatus = (taskId: string, status: 'pending' | 'completed' | 'missed') => {
    const updatedTasks = tasks.map(t => (t.id === taskId ? { ...t, status } : t));
    saveTasks(updatedTasks);
  };

  const handleReplanGoal = (goalId: string, updatedGoalFields: Partial<Goal>, updatedTasks: Task[]) => {
    const updatedGoals = goals.map(g => (g.id === goalId ? { ...g, ...updatedGoalFields } : g));
    
    // Replace all tasks for this goal
    const otherTasks = tasks.filter(t => t.goalId !== goalId);
    const mergedTasks = [...otherTasks, ...updatedTasks];

    saveGoals(updatedGoals);
    saveTasks(mergedTasks);
  };

  const handleResetData = () => {
    localStorage.removeItem('deadline_guardian_profile');
    localStorage.removeItem('deadline_guardian_goals');
    localStorage.removeItem('deadline_guardian_tasks');
    setProfile(null);
    setGoals([]);
    setTasks([]);
    setView('onboarding');
  };

  const handleLoadDemoData = (demoData: { profile: UserProfile; goals: Goal[]; tasks: Task[] }) => {
    saveProfile(demoData.profile);
    saveGoals(demoData.goals);
    saveTasks(demoData.tasks);
    setView('dashboard');
  };

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setView('goal-detail');
  };

  // Render Page views
  const renderView = () => {
    switch (view) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      
      case 'dashboard':
        return (
          <Dashboard
            profile={profile || { name: '', profession: 'Student', dailyHours: 2 }}
            goals={goals}
            tasks={tasks}
            onSelectGoal={handleSelectGoal}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onCreateGoal={handleCreateGoal}
          />
        );
      
      case 'goal-detail':
        const currentGoal = goals.find(g => g.id === selectedGoalId);
        if (!currentGoal) {
          setView('dashboard');
          return null;
        }
        const goalTasks = tasks.filter(t => t.goalId === selectedGoalId);
        return (
          <GoalDetail
            goal={currentGoal}
            tasks={goalTasks}
            profile={profile || { name: '', profession: 'Student', dailyHours: 2 }}
            onBack={() => setView('dashboard')}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onReplanGoal={handleReplanGoal}
          />
        );
      
      case 'settings':
        return (
          <Settings
            profile={profile}
            onUpdateProfile={saveProfile}
            onResetData={handleResetData}
            onLoadDemoData={handleLoadDemoData}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />
        );
      
      default:
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* Floating Warnings Banner (Simulate Mode Alert) */}
      {!keyAvailable && view !== 'onboarding' && (
        <div className="api-key-banner" style={{ margin: 0, border: 'none', borderRadius: 0, borderBottom: '1px dashed var(--risk-medium-border)', background: 'rgba(245, 158, 11, 0.09)', padding: '0.65rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} style={{ color: 'var(--risk-medium)' }} />
            <span>
              <strong>Gemini API Key is not configured.</strong> Operating in local simulation sandbox.
            </span>
          </div>
          <button
            onClick={() => setView('settings')}
            style={{
              backgroundColor: 'var(--risk-medium)',
              fontSize: '0.75rem',
              padding: '0.25rem 0.75rem'
            }}
          >
            Configure Key
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <header className="navbar">
        <div onClick={() => profile && setView('dashboard')} className="navbar-brand">
          <Shield size={26} />
          <span>Deadline Guardian AI</span>
        </div>

        {profile && (
          <nav className="nav-actions">
            <button
              onClick={() => setView('dashboard')}
              className={`btn btn-ghost ${view === 'dashboard' ? 'active' : ''}`}
              style={{
                color: view === 'dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: view === 'dashboard' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setView('settings')}
              className={`btn btn-ghost ${view === 'settings' ? 'active' : ''}`}
              style={{
                color: view === 'settings' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: view === 'settings' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <SettingsIcon size={16} />
              Settings
            </button>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon-only"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        )}
      </header>

      {/* Primary Page Canvas */}
      <main className="main-content">
        {renderView()}
      </main>

    </div>
  );
};

export default App;
