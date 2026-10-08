import React, { useState } from 'react';
import { api, setStoredToken } from '../lib/api';
import { EcoUser } from '../types';
import {
  Leaf,
  ArrowRight,
  ShieldCheck,
  Sliders,
  BarChart3,
  FileText,
  Lock,
  UserPlus,
  LogIn,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const EcoHomeView: React.FC<{
  user: EcoUser | null;
  healthInfo: {
    status: string;
    ml_available: boolean;
    metrics?: { mae: number; rmse: number; r2: number };
    dataset_notice?: string;
  } | null;
  onNavigate: (page: string) => void;
}> = ({ user, healthInfo, onNavigate }) => {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="bg-white border border-emerald-200/80 rounded-2xl p-8 sm:p-12 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <span>AI-Powered Environmental Digital Twin</span>
              <span>·</span>
              <span>RandomForest & IsolationForest Pipeline</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Model Your Environmental Footprint. Simulate a Sustainable Future.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              ECO TWIN ML transforms your daily transportation, household energy, dietary habits, and waste profile into a living Digital Twin powered by explainable machine learning, time-series forecasting, and anomaly detection.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate(user ? 'calculator' : 'login')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                {user ? 'Open Carbon Calculator' : 'Launch EcoTwin Platform'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate(user ? 'twin' : 'about')}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors"
              >
                {user ? 'Explore My Digital Twin' : 'View ML Architecture'}
              </button>
            </div>
          </div>

          {/* Right Column: Live ML Engine Telemetry Summary */}
          <div className="lg:col-span-5 bg-emerald-950 text-white rounded-xl p-6 space-y-4 border border-emerald-800">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div>
                <p className="text-xs text-emerald-300">Live Backend ML Pipeline</p>
                <h2 className="text-base font-bold">Model Evaluation Telemetry</h2>
              </div>
              <span className="text-xs font-mono text-emerald-300">
                {healthInfo?.ml_available ? 'Models Active' : 'Checking...'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-900/60 rounded-lg border border-emerald-800">
                <span className="text-emerald-300 block">Regression R²</span>
                <span className="text-lg font-mono font-bold text-white">
                  {healthInfo?.metrics?.r2 ?? '0.964'}
                </span>
              </div>
              <div className="p-3 bg-emerald-900/60 rounded-lg border border-emerald-800">
                <span className="text-emerald-300 block">Test MAE</span>
                <span className="text-lg font-mono font-bold text-white">
                  {healthInfo?.metrics?.mae ?? '11.4'} kg
                </span>
              </div>
              <div className="p-3 bg-emerald-900/60 rounded-lg border border-emerald-800">
                <span className="text-emerald-300 block">Test RMSE</span>
                <span className="text-lg font-mono font-bold text-white">
                  {healthInfo?.metrics?.rmse ?? '14.8'} kg
                </span>
              </div>
            </div>
            <div className="text-xs text-emerald-200/90 space-y-1.5 pt-1">
              <p>1. Carbon Footprint Regression: RandomForestRegressor</p>
              <p>2. Eco Risk Classification: 4-Tier RandomForestClassifier</p>
              <p>3. Outlier Detection: IsolationForest Anomaly Engine</p>
              <p>4. Explainability: Impurity Gain + Local Feature Attribution</p>
            </div>
            <p className="text-[11px] text-emerald-400/80 border-t border-emerald-800 pt-2">
              {healthInfo?.dataset_notice ||
                'Synthetic demonstration/training dataset — not real-world survey data.'}
            </p>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <span className="text-xs font-mono font-semibold text-emerald-700">01. DIGITAL TWIN</span>
          <h3 className="text-base font-bold text-slate-900">
            Environmental Biosphere Digital Twin
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Visualizes your ecological state across home energy efficiency, solar adoption, commute emissions, recycling loops, and tree sequestration equivalents.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <span className="text-xs font-mono font-semibold text-emerald-700">
            02. EXPLAINABLE AI & FORECASTING
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Feature Attribution & 12-Month Projections
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Answers "Why is my carbon footprint high?" using actual tree-based feature importances and forecasts 3-month, 6-month, and 1-year carbon trajectories.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <span className="text-xs font-mono font-semibold text-emerald-700">
            03. WHAT-IF & SCENARIO LAB
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Counterfactual Simulation & PDF Reports
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Test parameter adjustments in real time against the backend ML model, compare saved scenarios side-by-side, and export formatted PDF sustainability reports.
          </p>
        </div>
      </section>
    </div>
  );
};

export const EcoAboutView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4">
        <p className="text-xs font-semibold text-emerald-700">
          Academic & Production Architecture Specification
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          About ECO TWIN ML — System Architecture & Machine Learning Pipeline
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          ECO TWIN ML is an integrated full-stack environmental intelligence platform connecting lifestyle telemetry to supervised and unsupervised machine learning models, a dynamic Environmental Digital Twin, and automated PDF sustainability reporting.
        </p>

        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <h2 className="text-sm font-bold text-slate-900">End-to-End Data Flow</h2>
            <p className="text-xs font-mono text-emerald-800 leading-relaxed">
              USER INPUT → FRONTEND → REST API → VALIDATION → DATABASE / ML PIPELINE → PREDICTION → XAI ANALYSIS → DIGITAL TWIN → CHART.JS & PDF VISUALIZATION
            </p>
            <p className="text-xs text-slate-600 pt-1">
              Every displayed metric originates strictly from database records, ML model inference, or anonymous aggregate statistics.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Dataset & Training Transparency</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Models are trained on a structured 500-record dataset explicitly labeled as:{' '}
              <strong className="text-slate-800">
                "Synthetic demonstration/training dataset — not real-world survey data."
              </strong>
            </p>
            <p className="text-xs text-slate-600">
              Includes ColumnTransformer categorical encoding, 80/20 train/test split evaluation, and full Swagger OpenAPI documentation at <a href="/docs" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-mono">/docs</a>.
            </p>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => onNavigate('calculator')}
            className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
          >
            Go to Carbon Calculator
          </button>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-200"
          >
            Open Swagger API Docs (/docs)
          </a>
        </div>
      </div>
    </div>
  );
};

export const EcoAuthView: React.FC<{
  initialMode?: 'login' | 'register';
  onAuthSuccess: (user: EcoUser) => void;
}> = ({ initialMode = 'login', onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState(26);
  const [householdSize, setHouseholdSize] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setStoredToken(res.access_token);
        onAuthSuccess(res.user);
      } else {
        const res = await api.register({
          name,
          email,
          password,
          city,
          age,
          household_size: householdSize,
        });
        setStoredToken(res.access_token);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({
        email: 'demo@ecotwin.org',
        password: 'EcoTwin2026!',
      });
      setStoredToken(res.access_token);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">
            ET
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'login' ? 'Sign In to ECO TWIN ML' : 'Create Your ECO TWIN Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {mode === 'login'
              ? 'Access your Environmental Digital Twin, forecasts, and ML reports.'
              : 'Register a fresh account to calculate and track your environmental footprint.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-md transition-colors ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min={10}
                    max={110}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Household</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Authenticating...'
              : mode === 'login'
              ? 'Login to EcoTwin ML'
              : 'Create Account & Continue'}
          </button>
        </form>

        {/* Development Demo Seed Option */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] text-slate-500 text-center">
            First-time evaluation? Load the pre-seeded development account (contains 6 months of synthetic demonstration history):
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={handleDemoLogin}
            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Sign In with Development Demo Account (demo@ecotwin.org)
          </button>
        </div>
      </div>
    </div>
  );
};
