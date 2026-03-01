/**
 * Centralized API client for HireFlow AI.
 * All backend API calls go through this module.
 * Automatically attaches JWT Bearer token from localStorage.
 */

const API_BASE = 'http://localhost:8000/api';

function getToken() {
    return localStorage.getItem('hireflow_token');
}

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    return response.json();
}

export const api = {
    // Auth
    signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/auth/me'),

    // Resume
    uploadResume: (formData) => {
        const token = getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(`${API_BASE}/upload-resume`, {
            method: 'POST',
            body: formData,
            headers,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Upload failed');
            }
            return res.json();
        });
    },
    getResumeHistory: () => request('/resume-history'),
    getViewResumeUrl: (resumeId) => {
        const token = getToken();
        return `${API_BASE}/view-resume/${resumeId}${token ? `?token_param=${token}` : ''}`;
    },
    getLatestResumeUrl: (candidateId) => {
        const token = getToken();
        return `${API_BASE}/view-latest-resume/${candidateId}${token ? `?token_param=${token}` : ''}`;
    },

    // Jobs
    listJobs: () => request('/jobs'),
    createJob: (data) => request('/create-job', { method: 'POST', body: JSON.stringify(data) }),
    applyJob: (data) => request('/apply-job', { method: 'POST', body: JSON.stringify(data) }),
    listJobApplications: () => request('/job-applications'),
    getMyApplications: () => request('/my-applications'),

    // Candidates
    listCandidates: () => request('/candidates'),
    getCandidate: (id) => request(`/candidate/${id}`),
    matchCandidates: (data) => request('/match-candidates', { method: 'POST', body: JSON.stringify(data) }),
    getMyProfile: () => request('/my-profile'),
    getMyInterviews: () => request('/my-interviews'),
    updateProfile: (data) => request('/update-profile', { method: 'POST', body: JSON.stringify(data) }),

    // Interview (job-linked)
    startInterview: (data) => request('/start-interview', { method: 'POST', body: JSON.stringify(data) }),
    sendMessage: (data) => request('/interview-message', { method: 'POST', body: JSON.stringify(data) }),
    getResult: (sessionId) => request(`/interview-result/${sessionId}`),
    getScheduledInterviews: () => request('/scheduled-interviews'),
    scheduleInterview: (data) => request('/schedule-interview', { method: 'POST', body: JSON.stringify(data) }),
    scheduleConfirm: (data) => request('/respond-interview-invitation', { method: 'POST', body: JSON.stringify(data) }),

    // Aptitude chatbot
    startAptitude: (candidateId) => request('/start-aptitude', { method: 'POST', body: JSON.stringify({ candidate_id: candidateId }) }),
    sendAptitudeMessage: (data) => request('/aptitude-message', { method: 'POST', body: JSON.stringify(data) }),
    getAptitudeResult: (sessionId) => request(`/aptitude-result/${sessionId}`),

    // Evaluation
    evaluate: () => request('/evaluate'),

    // Upskilling
    getUpskillingRecommendations: (jobId) =>
        request(`/upskilling-recommendations${jobId ? `?job_id=${jobId}` : ''}`),

    // AI Assistant
    assistantChat: (data) => request('/assistant-chat', { method: 'POST', body: JSON.stringify(data) }),

    // Skill Testing
    getSkillTestQuestions: (skill) => request(`/skill-test/questions?skill=${skill}`),
    submitSkillTest: (data) => request('/skill-test/submit', { method: 'POST', body: JSON.stringify(data) }),
};

export default api;
