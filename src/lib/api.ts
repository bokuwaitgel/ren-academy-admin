import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiError {
  detail: string | Record<string, unknown>;
  status: number;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

let isRefreshing = false;

async function request<T>(
  path: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token && !skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw { detail: "Request timed out after 30 seconds", status: 0 } as ApiError;
    }
    throw { detail: `Network error — could not reach ${API_BASE}`, status: 0 } as ApiError;
  } finally {
    clearTimeout(timeout);
  }

  // 401 interceptor — attempt token refresh
  if (res.status === 401 && !skipAuth && !isRefreshing) {
    const refresh = getRefreshToken();
    if (refresh) {
      isRefreshing = true;
      try {
        const refreshRes = await request<LoginResponse>(
          "/api/auth/refresh",
          { method: "POST", body: JSON.stringify({ refresh_token: refresh }) },
          true
        );
        setTokens(refreshRes.access_token, refreshRes.refresh_token);
        isRefreshing = false;
        // Retry original request with new token
        return request<T>(path, options, false);
      } catch {
        isRefreshing = false;
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw { detail: "Session expired. Please log in again.", status: 401 } as ApiError;
      }
    }
  }

  if (!res.ok) {
    let detail: string | Record<string, unknown> = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body;
    } catch {}
    const err: ApiError = { detail, status: res.status };
    throw err;
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "candidate" | "examiner" | "admin" | "super_admin" | "super-admin";
  is_active: boolean;
  created_at: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/api/auth/me"),
  refresh: (refresh_token: string) =>
    request<LoginResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),
  logout: () =>
    request<{ status: string }>("/api/auth/logout", {
      method: "POST",
    }),
};

// ── Paginated ────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Questions ────────────────────────────────

export interface Question {
  id: string;
  title: string;
  section: string;
  section_part: string;
  test_type: string;
  module_type: string;
  type: string;
  instruction: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  passage?: string;
  context?: string;
  audio_url?: string;
  image_url?: string;
  options?: { label: string; text: string }[];
  correct_option?: string;
  correct_options?: string[];
  [key: string]: unknown;
}

export const questions = {
  list: (params: Record<string, string | number>) =>
    request<Paginated<Question>>(
      `/api/questions/list?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      )}`
    ),
  get: (id: string) =>
    request<Question>(`/api/questions/get?question_id=${id}`),
  create: (data: Record<string, unknown>) =>
    request<Question>("/api/questions/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Question>("/api/questions/update", {
      method: "PUT",
      body: JSON.stringify({ question_id: id, ...data }),
    }),
  delete: (id: string) =>
    request<{ status: string }>("/api/questions/delete", {
      method: "DELETE",
      body: JSON.stringify({ question_id: id }),
    }),
  bulkCreate: (questionsList: Record<string, unknown>[]) =>
    request<Question[]>("/api/questions/bulk-create", {
      method: "POST",
      body: JSON.stringify({ questions: questionsList }),
    }),
};

// ── Tests ────────────────────────────────────

export interface ListeningSectionData {
  section_number: number;
  audio_url: string;
  question_ids: string[];
}
export interface ListeningModuleData { sections: ListeningSectionData[]; }

export interface ReadingSectionData {
  section_number: number;
  passage: string;
  question_ids: string[];
}
export interface ReadingModuleData { sections: ReadingSectionData[]; }

export interface WritingTaskData {
  task_number: number;
  description: string;
  image_url?: string;
}
export interface WritingModuleData { tasks: WritingTaskData[]; }

export interface SpeakingPartData {
  part_number: number;
  question_ids: string[];
}
export interface SpeakingModuleData { parts: SpeakingPartData[]; }

export interface Test {
  id: string;
  title: string;
  description?: string;
  test_type: string;
  module_type: string;
  is_published: boolean;
  tags: string[];
  question_count: number;
  listening?: ListeningModuleData;
  reading?: ReadingModuleData;
  writing?: WritingModuleData;
  speaking?: SpeakingModuleData;
  created_at: string;
  updated_at?: string;
}

export const tests = {
  list: (params: Record<string, string | number | boolean>) =>
    request<Paginated<Test>>(
      `/api/tests/lists?${new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      )}`
    ),
  get: (id: string) => request<Test>(`/api/tests/get?test_id=${id}`),
  create: (data: Record<string, unknown>) =>
    request<Test>("/api/tests/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Test>("/api/tests/update", {
      method: "PUT",
      body: JSON.stringify({ test_id: id, ...data }),
    }),
  delete: (id: string) =>
    request<{ status: string }>("/api/tests/delete", {
      method: "DELETE",
      body: JSON.stringify({ test_id: id }),
    }),
  publish: (id: string, is_published: boolean) =>
    request<Test>("/api/tests/publish", {
      method: "POST",
      body: JSON.stringify({ test_id: id, is_published }),
    }),
  section: {
    add: (testId: string, module: string, data: Record<string, unknown>) =>
      request<Test>("/api/tests/section/add", {
        method: "POST",
        body: JSON.stringify({ test_id: testId, module, ...data }),
      }),
    update: (testId: string, module: string, number: number, data: Record<string, unknown>) =>
      request<Test>("/api/tests/section/update", {
        method: "PUT",
        body: JSON.stringify({ test_id: testId, module, number, ...data }),
      }),
    remove: (testId: string, module: string, number: number) =>
      request<Test>("/api/tests/section/remove", {
        method: "DELETE",
        body: JSON.stringify({ test_id: testId, module, number }),
      }),
    addQuestion: (testId: string, sectionPart: string, questionId: string) =>
      request<Test>("/api/tests/section/question/add", {
        method: "POST",
        body: JSON.stringify({ test_id: testId, section_part: sectionPart, question_id: questionId }),
      }),
    removeQuestion: (testId: string, sectionPart: string, questionId: string) =>
      request<Test>("/api/tests/section/question/remove", {
        method: "POST",
        body: JSON.stringify({ test_id: testId, section_part: sectionPart, question_id: questionId }),
      }),
  },
};

// ── Sessions ─────────────────────────────────

export interface SessionSectionState {
  section: string;
  order_index: number;
  status: "not_started" | "in_progress" | "completed";
  time_limit_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
}

export interface Session {
  id: string;
  test_id: string;
  user_id: string;
  mode: "practice" | "full_test";
  practice_section: string | null;
  status: string;
  current_section: string | null;
  session_sections: SessionSectionState[];
  answers: Record<string, unknown>;
  section_scores: {
    section: string;
    raw_score: number;
    max_score: number;
    band_score: number;
    details?: Record<string, unknown>;
  }[];
  overall_band?: number;
  started_at: string;
  finished_at?: string;
  time_spent_seconds?: number;
  created_at: string;
  updated_at?: string;
}

export interface SpeakingEvaluation {
  overall_score: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammar_accuracy: number;
  pronunciation: number;
  speaking_level: string;
  fluency_feedback: string;
  lexical_feedback: string;
  grammar_feedback: string;
  pronunciation_feedback: string;
  grammar_errors: number;
  vocabulary_errors: number;
  sample_improvements: string[];
  strengths: string;
  areas_for_improvement: string;
  overall_feedback: string;
  motivation: string;
  evaluated_from: string;
}

export interface AnswerDetail {
  question_id: string;
  title: string;
  type: string;
  user_answer: unknown;
  correct_answer: unknown;
  earned: number;
  max: number;
}

export interface ListeningReadingDetails {
  answer_details: AnswerDetail[];
}

export interface SpeakingAnswerDetail {
  question_id?: string;
  part_number?: number;
  index: number;
  question: string;
  audio_url?: string;
  evaluation: SpeakingEvaluation;
}

export interface SpeakingSectionDetails {
  band_score: number;
  criteria: {
    fluency_coherence: number | null;
    lexical_resource: number | null;
    grammar_accuracy: number | null;
    pronunciation: number | null;
  };
  answer_count: number;
  answer_details: SpeakingAnswerDetail[];
}

export interface WritingEvaluation {
  overall_score: number;
  task_achievement: number;
  coherence_cohesion: number;
  lexical_resource: number;
  grammar_accuracy: number;
  ai_detection?: string;
  ai_generation_percentage?: number;
  grammar_errors: number;
  vocabulary_errors: number;
  sentence_errors: number;
  task_type?: string;
  writing_level?: string;
  ai_suggestions?: string;
  motivation?: string;
  word_corrections?: string;
  sentence_corrections?: { original: string; corrected: string; explanation: string }[];
  improved_version?: string;
  overall_feedback?: string;
}

export interface WritingSectionDetails {
  ai_evaluations?: Record<string, WritingEvaluation>;
  [key: string]: unknown;
}

export interface SessionResult {
  session_id: string;
  test_id: string;
  user_id: string;
  mode: "practice" | "full_test";
  status: string;
  section_scores: {
    section: string;
    raw_score: number;
    max_score: number;
    band_score: number;
    details?: SpeakingSectionDetails | ListeningReadingDetails | WritingSectionDetails | Record<string, unknown>;
  }[];
  overall_band?: number;
  started_at: string;
  finished_at?: string;
  time_spent_seconds?: number;
}

export interface SpeakingPracticeSession {
  id: string;
  user_id: string;
  question_id: string;
  part: string;
  total: number;
  answers: {
    index: number;
    question: string;
    audio_url?: string;
    evaluation?: SpeakingEvaluation;
    submitted_at: string;
  }[];
  status: "in_progress" | "completed";
  overall_score?: number;
  criteria_scores?: {
    fluency_coherence: number | null;
    lexical_resource: number | null;
    grammar_accuracy: number | null;
    pronunciation: number | null;
  };
  created_at: string;
  updated_at?: string;
}

// ── Admin ────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_questions: number;
  total_tests: number;
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  average_band?: number;
  users_by_role: Record<string, number>;
  sessions_by_status: Record<string, number>;
}

export interface QuestionAnalytics {
  total_questions: number;
  by_section: Record<string, number>;
  by_type: Record<string, number>;
  by_module: Record<string, number>;
}

export interface TestAnalytics {
  total_tests: number;
  published_tests: number;
  draft_tests: number;
  total_sessions: number;
  band_distribution: Record<string, number>;
  most_popular_tests: { test_id: string; title: string; attempts: number }[];
}

export const admin = {
  dashboard: () => request<DashboardStats>("/api/admin/dashboard"),
  users: {
    list: (params: Record<string, string | number>) =>
      request<Paginated<User & { total_sessions?: number }>>(
        `/api/admin/users/list?${new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        )}`
      ),
    get: (id: string) =>
      request<User & { total_sessions: number; completed_sessions: number; average_band?: number; recent_sessions: Session[] }>(
        `/api/admin/users/get?user_id=${id}`
      ),
    update: (id: string, data: { role?: string; is_active?: boolean }) =>
      request<User>("/api/admin/users/update", {
        method: "PUT",
        body: JSON.stringify({ user_id: id, ...data }),
      }),
    deactivate: (id: string) =>
      request<{ status: string }>("/api/admin/users/deactivate", {
        method: "POST",
        body: JSON.stringify({ user_id: id }),
      }),
  },
  sessions: {
    list: (params: Record<string, string | number>) =>
      request<Paginated<Session>>(
        `/api/admin/sessions/list?${new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        )}`
      ),
    get: (id: string) =>
      request<Session>(`/api/admin/sessions/get?session_id=${id}`),
    result: (id: string) =>
      request<SessionResult>(`/api/admin/sessions/result?session_id=${id}`),
    grade: (session_id: string, section: string, band_score: number, details?: Record<string, unknown>) =>
      request<Session>("/api/admin/sessions/grade", {
        method: "POST",
        body: JSON.stringify({ session_id, section, band_score, details }),
      }),
    delete: (session_id: string) =>
      request<{ status: string; session_id: string }>("/api/admin/sessions/delete", {
        method: "DELETE",
        body: JSON.stringify({ session_id }),
      }),
  },
  analytics: {
    questions: () => request<QuestionAnalytics>("/api/admin/analytics/questions"),
    tests: () => request<TestAnalytics>("/api/admin/analytics/tests"),
  },
  speakingPractice: {
    list: (params: Record<string, string | number> = {}) =>
      request<Paginated<SpeakingPracticeSession>>(
        `/api/admin/speaking-practice/list?${new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        )}`
      ),
    get: (sessionId: string) =>
      request<SpeakingPracticeSession>(`/api/admin/speaking-practice/get?session_id=${sessionId}`),
  },
};

// ── Storage ──────────────────────────────────

export const storage = {
  uploadListeningAudio: (testId: string, moduleType: string, fileName: string, base64: string) =>
    request<{ url: string; key: string }>("/api/storage/admin/s3/upload-listening-audio", {
      method: "POST",
      body: JSON.stringify({
        test_id: testId,
        module_type: moduleType,
        file_name: fileName,
        file_content_base64: base64,
        content_type: "audio/mpeg",
      }),
    }),
  uploadWritingImage: (testId: string, moduleType: string, fileName: string, base64: string) =>
    request<{ url: string; key: string }>("/api/storage/admin/s3/upload-question-file", {
      method: "POST",
      body: JSON.stringify({
        test_id: testId,
        module_type: moduleType,
        section: "writing",
        file_name: fileName,
        file_content_base64: base64,
        sub_path: "images",
      }),
    }),
  uploadQuestionAudio: (section: string, fileName: string, base64: string) =>
    request<{ url: string; key: string }>("/api/storage/admin/s3/upload-question-file", {
      method: "POST",
      body: JSON.stringify({
        test_id: "questions",
        module_type: "general",
        section,
        file_name: fileName,
        file_content_base64: base64,
        content_type: "audio/mpeg",
        sub_path: "audio",
      }),
    }),
  uploadQuestionImage: (section: string, fileName: string, base64: string) =>
    request<{ url: string; key: string }>("/api/storage/admin/s3/upload-question-file", {
      method: "POST",
      body: JSON.stringify({
        test_id: "questions",
        module_type: "general",
        section,
        file_name: fileName,
        file_content_base64: base64,
        sub_path: "images",
      }),
    }),
};

// ── Error helper ─────────────────────────────

export function showApiError(e: unknown, fallback = "Operation failed") {
  const err = e as ApiError | undefined;
  const msg =
    err?.detail
      ? typeof err.detail === "string"
        ? err.detail
        : JSON.stringify(err.detail)
      : fallback;
  toast.error(msg);
}
