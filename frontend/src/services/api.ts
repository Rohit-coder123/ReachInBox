import axios from 'axios';
import { ApiResponse, QueueStats, ScheduledEmail, SettingsData, SlackStatus, User } from '../types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token if present in localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('reachinbox_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  auth: {
    getMe: () => apiClient.get<ApiResponse<User>>('/auth/me').then((r) => r.data.data),
    devLogin: (email?: string, name?: string) =>
      apiClient.post<ApiResponse<{ user: User; token: string }>>('/auth/dev-login', { email, name }).then((r) => r.data.data),
    logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  },

  // Campaigns
  campaigns: {
    parseRecipients: (formData: FormData) =>
      apiClient.post('/campaigns/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data.data),
    create: (formData: FormData) =>
      apiClient.post('/campaigns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data.data),
    list: (page = 1, limit = 20) =>
      apiClient.get(`/campaigns?page=${page}&limit=${limit}`).then((r) => r.data),
    getById: (id: string) => apiClient.get(`/campaigns/${id}`).then((r) => r.data.data),
    cancel: (id: string) => apiClient.post(`/campaigns/${id}/cancel`).then((r) => r.data.data),
  },

  // Emails
  emails: {
    getScheduled: (params?: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string; sortOrder?: string }) =>
      apiClient.get<ApiResponse<ScheduledEmail[]>>('/emails/scheduled', { params }).then((r) => r.data),
    getSent: (params?: { page?: number; limit?: number; search?: string }) =>
      apiClient.get<ApiResponse<ScheduledEmail[]>>('/emails/sent', { params }).then((r) => r.data),
    getById: (id: string) => apiClient.get<ApiResponse<ScheduledEmail>>(`/emails/${id}`).then((r) => r.data.data),
    cancel: (id: string) => apiClient.post(`/emails/${id}/cancel`).then((r) => r.data.data),
    reschedule: (id: string, newScheduledAt: string) =>
      apiClient.post(`/emails/${id}/reschedule`, { newScheduledAt }).then((r) => r.data.data),
  },

  // Queue
  queue: {
    getStats: () => apiClient.get<ApiResponse<QueueStats>>('/queue/stats').then((r) => r.data.data),
    getLogs: (page = 1, limit = 20) => apiClient.get(`/queue/logs?page=${page}&limit=${limit}`).then((r) => r.data),
    pause: () => apiClient.post('/queue/pause').then((r) => r.data.data),
    resume: () => apiClient.post('/queue/resume').then((r) => r.data.data),
    retryFailed: () => apiClient.post('/queue/retry-failed').then((r) => r.data.data),
  },

  // Search
  search: {
    query: (params: { q?: string; status?: string; page?: number; limit?: number }) =>
      apiClient.get('/search', { params }).then((r) => r.data),
    autocomplete: (q: string) =>
      apiClient.get<{ success: boolean; data: { suggestions: string[] } }>(`/search/autocomplete?q=${encodeURIComponent(q)}`).then((r) => r.data.data.suggestions),
  },

  // Slack
  slack: {
    getStatus: () => apiClient.get<ApiResponse<SlackStatus>>('/slack/status').then((r) => r.data.data),
    configureWebhook: (webhookUrl: string, channelName?: string) =>
      apiClient.post('/slack/webhook', { webhookUrl, channelName }).then((r) => r.data.data),
    testNotification: () => apiClient.post('/slack/test').then((r) => r.data.data),
    disconnect: () => apiClient.post('/slack/disconnect').then((r) => r.data.data),
    connectDemo: () => apiClient.post('/slack/demo-connect').then((r) => r.data.data),
  },

  // Settings
  settings: {
    get: () => apiClient.get<ApiResponse<SettingsData>>('/settings').then((r) => r.data.data),
    update: (data: Partial<SettingsData['rateLimits'] & SettingsData['sender']>) =>
      apiClient.post('/settings', data).then((r) => r.data.data),
  },
};

export default api;
