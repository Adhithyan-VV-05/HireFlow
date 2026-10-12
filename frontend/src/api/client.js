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
    updateJob: (id, data) => request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
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
    getUpskillingRecommendations: (jobId, candidateId) => {
        const params = new URLSearchParams();
        if (jobId) params.append('job_id', jobId);
        if (candidateId) params.append('candidate_id', candidateId);
        const qs = params.toString();
        return request(`/upskilling-recommendations${qs ? `?${qs}` : ''}`);
    },

    // AI Assistant
    assistantChat: (data) => request('/assistant-chat', { method: 'POST', body: JSON.stringify(data) }),

    // Skill Testing
    getSkillTestQuestions: (skill) => request(`/skill-test/questions?skill=${skill}`),
    submitSkillTest: (data) => request('/skill-test/submit', { method: 'POST', body: JSON.stringify(data) }),

    // ATS Candidate Management
    createAtsCandidate: (data) => request('/ats/candidates', { method: 'POST', body: JSON.stringify(data) }),
    listAtsCandidates: (stage = '', search = '') => {
        const queryParams = new URLSearchParams();
        if (stage) queryParams.append('status', stage);
        if (search) queryParams.append('q', search);
        const qs = queryParams.toString();
        return request(`/ats/candidates${qs ? `?${qs}` : ''}`);
    },
    getAtsCandidate: (id) => request(`/ats/candidates/${id}`),
    updateAtsCandidateStatus: (id, data) => request(`/ats/candidates/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    getAtsCandidateHistory: (id) => request(`/ats/candidates/${id}/history`),
    createAtsInterview: (id, data) => request(`/ats/candidates/${id}/interview`, { method: 'POST', body: JSON.stringify(data) }),
    getAtsCandidateInterviews: (id) => request(`/ats/candidates/${id}/interviews`),
    getAtsMatch: (candidateId, jobId) => request(`/ats/candidates/${candidateId}/match/${jobId}`),

    // Interview Simulation & Question Generation
    generateQuestions: (data) => request('/interviews/questions/generate', { method: 'POST', body: JSON.stringify(data) }),
    startSimulation: (data) => request('/interviews/simulation/start', { method: 'POST', body: JSON.stringify(data) }),
    launchSimulation: (sessionId) => request(`/interviews/simulation/${sessionId}/launch`, { method: 'POST' }),
    getCurrentQuestion: (sessionId) => request(`/interviews/simulation/${sessionId}/current`),
    submitAnswer: (sessionId, data) => request(`/interviews/simulation/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(data) }),
    completeSimulation: (sessionId) => request(`/interviews/simulation/${sessionId}/complete`, { method: 'POST' }),
    getSimulationReport: (sessionId) => request(`/interviews/simulation/${sessionId}/report`),
    getCandidateSimulations: (candidateId) => request(`/interviews/simulation/candidate/${candidateId}`),
    getLiveStatus: (sessionId) => request(`/interviews/simulation/${sessionId}/live-status`),
    getActiveSimulations: () => request('/interviews/simulation/active'),

    // Milestone 4: Recruitment Dashboard & Analytics
    getDashboardStats: (forceRefresh = false) => request(`/dashboard/stats${forceRefresh ? '?force_refresh=true' : ''}`),
    getSystemStatus: () => request('/system/status'),
    submitFeedback: (data) => request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
    getFeedbackSummary: () => request('/feedback/summary'),

    // Milestone 4: Voice-Based Screening Module
    startVoiceScreening: (data) => request('/voice-screening/start', { method: 'POST', body: JSON.stringify(data) }),
    getVoiceScreeningSession: (sessionId) => request(`/voice-screening/session/${sessionId}`),
    submitVoiceResponse: (sessionId, data) => request(`/voice-screening/session/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(data) }),
    submitVoiceAudioResponse: (sessionId, questionIndex, audioBlob) => {
        const token = getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const formData = new FormData();
        formData.append('question_index', questionIndex);
        formData.append('file', audioBlob, 'recording.webm');
        return fetch(`${API_BASE}/voice-screening/session/${sessionId}/audio-answer`, {
            method: 'POST',
            body: formData,
            headers,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Audio answer submission failed');
            }
            return res.json();
        });
    },
    completeVoiceScreening: (sessionId) => request(`/voice-screening/session/${sessionId}/complete`, { method: 'POST' }),
    getVoiceScreeningReport: (sessionId) => request(`/voice-screening/session/${sessionId}/report`),
    getCandidateVoiceScreenings: (candidateId) => request(`/voice-screening/candidate/${candidateId}`),

    // Faster-Whisper Live Speech-to-Text Pipeline
    getVoiceStatus: () => request('/voice/status'),
    transcribeVoice: (audioBlob, filename = 'speech.webm', language = 'en') => {
        const token = getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const formData = new FormData();
        formData.append('file', audioBlob, filename);
        return fetch(`${API_BASE}/voice/transcribe?language=${encodeURIComponent(language)}`, {
            method: 'POST',
            body: formData,
            headers,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Transcription failed');
            }
            return res.json();
        });
    },
    transcribeVoiceChunk: (audioBlob, isFinal = false, language = 'en') => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'chunk.webm');
        return fetch(`${API_BASE}/voice/transcribe-chunk?is_final=${isFinal}&language=${encodeURIComponent(language)}`, {
            method: 'POST',
            body: formData,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Chunk transcription failed');
            }
            return res.json();
        });
    },
};

export default api;

