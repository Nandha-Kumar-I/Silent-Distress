/**
 * ECO TWIN ML — Centralized Frontend API Module (frontend/js/api.js)
 * Connects Vanilla JS frontend pages to FastAPI (http://localhost:8000/api)
 * or unified local server (/api).
 */

const API_BASE_URL =
  window.location.port === '5500'
    ? 'http://localhost:8000/api'
    : '/api';

const TOKEN_KEY = 'ecotwin_jwt_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    const error = new Error('Backend unavailable. Ensure the API server is running.');
    error.status = 0;
    throw error;
  }

  if (!response.ok) {
    let message = `API Error (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.error || data.message || message;
    } catch (_) {
      // ignore JSON parse error
    }
    if (response.status === 401) {
      setAuthToken(null);
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return await response.json();
}

export async function checkHealth() {
  return apiRequest('/health');
}

export async function registerUser(payload) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return apiRequest('/auth/me');
}

export async function getDashboard() {
  return apiRequest('/dashboard');
}

export async function getTwin() {
  return apiRequest('/twin');
}

export async function calculateFootprint(payload) {
  return apiRequest('/calculator/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function predictFootprint(payload) {
  return apiRequest('/calculator/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAnalysis() {
  return apiRequest('/analysis');
}

export async function getAnalysisExplanation() {
  return apiRequest('/analysis/explain');
}

export async function getForecast(months = 6) {
  return apiRequest(`/forecast?months=${months}`);
}

export async function runWhatIfSimulation(payload) {
  return apiRequest('/simulator/what-if', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createScenario(payload) {
  return apiRequest('/scenarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getScenarios() {
  return apiRequest('/scenarios');
}

export async function deleteScenario(id) {
  return apiRequest(`/scenarios/${id}`, {
    method: 'DELETE',
  });
}

export async function compareScenarios(scenarioIds) {
  return apiRequest('/scenarios/compare', {
    method: 'POST',
    body: JSON.stringify({ scenario_ids: scenarioIds }),
  });
}

export async function createGoal(payload) {
  return apiRequest('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getGoals() {
  return apiRequest('/goals');
}

export async function updateGoal(id, payload) {
  return apiRequest(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteGoal(id) {
  return apiRequest(`/goals/${id}`, {
    method: 'DELETE',
  });
}

export async function getHistory(filters = {}) {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  return apiRequest(`/history${qs ? `?${qs}` : ''}`);
}

export async function deleteHistoryRecord(id) {
  return apiRequest(`/history/${id}`, {
    method: 'DELETE',
  });
}

export async function getAnomalies() {
  return apiRequest('/anomalies');
}

export async function getRecommendations() {
  return apiRequest('/recommendations');
}

export async function getAchievements() {
  return apiRequest('/achievements');
}

export async function generateReport(reportType = 'Sustainability Report') {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ report_type: reportType }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate sustainability PDF report');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportType.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function getCommunity() {
  return apiRequest('/community');
}

export async function getSettings() {
  return apiRequest('/settings');
}

export async function updateSettings(payload) {
  return apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
