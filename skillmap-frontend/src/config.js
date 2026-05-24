// src/config.js

const API_CONFIG = {
    BASE_URL: "",

    AUTH: {
        LOGIN: "/api/auth/login",
        LOGOUT: "/api/auth/logout",
        ME: "/api/auth/me",
    },

    ME: {
        DASHBOARD: "/api/me/dashboard",
        SKILLS: "/api/me/skills",
    },

    MATRIX: {
        GET: "/api/matrix",
    },

    USERS: {
        LIST: "/api/users",
        CREATE: "/api/users",
    },

    SKILLS: {
        LIST: "/api/skills",
        AVAILABLE: "/api/skills/available",
        CREATE: "/api/skills",
        ADD_TO_ME: "/api/skills/my",
        REMOVE_FROM_ME: "/api/skills/my",
        UPDATE_MY_LEVEL: "/api/skills/my",
    },

    PUBLIC_PROFILES: {
        GET: "/api/public-profiles",
    },

    ASK: {
        SEARCH: "/api/ask",
    },

    PROJECTS: {
        LIST: "/api/projects",
        CREATE: "/api/projects",
        ADD_MEMBER: (id) => `/api/projects/${id}/members`,
        REMOVE_MEMBER: (id, publicId) => `/api/projects/${id}/members/${publicId}`,
    },

    HEADERS: {
        "Content-Type": "application/json",
    },
};

export default API_CONFIG;