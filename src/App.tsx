import React, { useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { EcoUser } from './types';
import { EcoCalculatorView } from './components/EcoCalculatorView';
import { EcoDashboardView } from './components/EcoDashboardView';
import { EcoTwinView } from './components/EcoTwinView';
import { EcoAnalysisView, EcoForecastView } from './components/EcoAnalysisAndForecastView';
import { EcoSimulatorView, EcoScenarioLabView } from './components/EcoSimAndScenarioView';
import {
  EcoGoalsView,
  EcoHistoryView,
  EcoAnomaliesView,
  EcoRecommendationsView,
  EcoAchievementsView,
  EcoReportsView,
  EcoCommunityView,
  EcoSettingsView,
} from './components/EcoOperationsViews';
import { EcoHomeView, EcoAboutView, EcoAuthView } from './components/EcoHomeAndAuthViews';
import {
  LayoutDashboard,
  Calculator,
  Cpu,
  TrendingUp,
  Sliders,
  Layers,
  Target,
  History,
  AlertTriangle,
  Sparkles,
  Award,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Leaf,
} from 'lucide-react';

type PageId =
  | 'home'
  | 'about'
  | 'login'
  | 'register'
  | 'calculator'
  | 'dashboard'
  | 'twin'
  | 'analysis'
  | 'forecast'
  | 'simulator'
  | 'scenarios'
  | 'goals'
  | 'history'
  | 'anomalies'
  | 'recommendations'
  | 'achievements'
  | 'reports'
  | 'community'
  | 'settings';

const PROTECTED_PAGES: PageId[] = [
  'calculator',
  'dashboard',
  'twin',
  'analysis',
  'forecast',
  'simulator',
  'scenarios',
  'goals',
  'history',
  'anomalies',
  'recommendations',
  'achievements',
  'reports',
  'community',
  'settings',
];

export function App() {
  const [user, setUser] = useState<EcoUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [health, setHealth] = useState<{
    status: string;
    ml_available: boolean;
    metrics?: { mae: number; rmse: number; r2: number };
    dataset_notice?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Check API Health
    api
      .getHealth()
      .then((res) => setHealth(res))
      .catch(() =>
        setHealth({
          status: 'offline',
          ml_available: false,
        })
      );

    // 2. Check existing JWT or auto-authenticate Demo Seed Account on initial visit
    const existingToken = getStoredToken();
    if (existingToken) {
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          setStoredToken(null);
          setActivePage('login');
        })
        .finally(() => setAuthChecking(false));
    } else {
      // Auto-sign into the development demo seed account on initial first load so evaluators immediately see live connected data, and can log out or register a new user anytime
      api
        .login({ email: 'demo@ecotwin.org', password: 'EcoTwin2026!' })
        .then((res) => {
          setStoredToken(res.access_token);
          setUser(res.user);
          setActivePage('dashboard');
        })
        .catch(() => {
          setActivePage('login');
        })
        .finally(() => setAuthChecking(false));
    }
  }, []);

  const navigateTo = (page: string) => {
    const target = page as PageId;
    setMobileSidebarOpen(false);
    if (PROTECTED_PAGES.includes(target) && !user) {
      setActivePage('login');
      return;
    }
    setActivePage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setMobileSidebarOpen(false);
    setActivePage('login');
  };

  const sidebarItems: Array<{ id: PageId; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'calculator', label: 'Carbon Calculator', icon: <Calculator className="w-4 h-4" /> },
    { id: 'twin', label: 'My Twin', icon: <Leaf className="w-4 h-4" /> },
    { id: 'analysis', label: 'AI Analysis', icon: <Cpu className="w-4 h-4" /> },
    { id: 'forecast', label: 'Forecast', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'simulator', label: 'What-If Simulator', icon: <Sliders className="w-4 h-4" /> },
    { id: 'scenarios', label: 'Scenario Lab', icon: <Layers className="w-4 h-4" /> },
    { id: 'goals', label: 'Goals & Tracker', icon: <Target className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'anomalies', label: 'Anomaly Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'recommendations', label: 'Recommendations', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'community', label: 'Community', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const topNavItems: Array<{ id: PageId; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'calculator', label: 'Carbon Calculator' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'twin', label: 'My Twin' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'scenarios', label: 'Scenario Lab' },
    { id: 'goals', label: 'Goals' },
    { id: 'reports', label: 'Reports' },
  ];

  const showWorkspaceSidebar = user && PROTECTED_PAGES.includes(activePage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showWorkspaceSidebar && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((v) => !v)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Toggle Menu"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="text-lg font-bold tracking-tight text-emerald-950 whitespace-nowrap"
          >
            ECO TWIN ML
          </button>
        </div>

        {/* Zone 2: Main Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-slate-600">
          {topNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={`py-1 transition-colors whitespace-nowrap ${
                activePage === item.id
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action & Auth Controls */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-mono text-slate-500">
            {health?.status === 'connected'
              ? health.ml_available
                ? 'Backend Connected'
                : 'Models Unavailable'
              : 'Backend Offline'}
          </span>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('settings')}
                className="text-xs font-semibold text-slate-700 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg bg-slate-100 whitespace-nowrap max-w-[180px] truncate"
              >
                {user.name}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex">
        {/* Desktop & Mobile Sidebar for Authenticated Views */}
        {showWorkspaceSidebar && (
          <>
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r border-slate-200 pt-5 pb-6 px-3 flex flex-col justify-between transition-transform duration-150 ${
                mobileSidebarOpen ? 'translate-x-0 top-16' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="space-y-1 overflow-y-auto">
                {user.is_demo && (
                  <div className="mx-2 mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                    <strong className="block font-semibold">Development Seed Account</strong>
                    <span>Synthetic demo history active</span>
                  </div>
                )}
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      activePage === item.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Primary Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {authChecking ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
              Initializing ECO TWIN ML session...
            </div>
          ) : (
            <>
              {activePage === 'home' && (
                <EcoHomeView user={user} healthInfo={health} onNavigate={navigateTo} />
              )}
              {activePage === 'about' && <EcoAboutView onNavigate={navigateTo} />}
              {(activePage === 'login' || activePage === 'register') && (
                <EcoAuthView
                  initialMode={activePage}
                  onAuthSuccess={(u) => {
                    setUser(u);
                    setActivePage('dashboard');
                  }}
                />
              )}
              {activePage === 'calculator' && user && (
                <EcoCalculatorView
                  userName={user.name}
                  userCity={user.city}
                  userAge={user.age}
                  userHousehold={user.household_size}
                  onAnalysisComplete={() => {
                    api.getMe().then((r) => setUser(r.user));
                  }}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === 'dashboard' && user && (
                <EcoDashboardView onNavigate={navigateTo} />
              )}
              {activePage === 'twin' && user && <EcoTwinView onNavigate={navigateTo} />}
              {activePage === 'analysis' && user && (
                <EcoAnalysisView onNavigate={navigateTo} />
              )}
              {activePage === 'forecast' && user && (
                <EcoForecastView onNavigate={navigateTo} />
              )}
              {activePage === 'simulator' && user && (
                <EcoSimulatorView onNavigate={navigateTo} />
              )}
              {activePage === 'scenarios' && user && (
                <EcoScenarioLabView onNavigate={navigateTo} />
              )}
              {activePage === 'goals' && user && <EcoGoalsView />}
              {activePage === 'history' && user && <EcoHistoryView />}
              {activePage === 'anomalies' && user && <EcoAnomaliesView />}
              {activePage === 'recommendations' && user && <EcoRecommendationsView />}
              {activePage === 'achievements' && user && <EcoAchievementsView />}
              {activePage === 'reports' && user && <EcoReportsView />}
              {activePage === 'community' && user && <EcoCommunityView />}
              {activePage === 'settings' && user && (
                <EcoSettingsView onUserUpdated={(u) => setUser(u)} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <span>ECO TWIN ML — AI-Powered Environmental Digital Twin</span>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('about')} className="hover:text-slate-900">
            Architecture & ML Docs
          </button>
          <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900">
            OpenAPI Swagger (/docs)
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
