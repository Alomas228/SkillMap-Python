const ACCESS_KEY = "skillmap_access";
const REFRESH_KEY = "skillmap_refresh";

export function setTokens(tokens) {
    if (tokens?.access) localStorage.setItem(ACCESS_KEY, tokens.access);
    if (tokens?.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

const originalFetch = window.fetch.bind(window);

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
        const resp = await originalFetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh }),
        });
        if (!resp.ok) { clearTokens(); return false; }
        const data = await resp.json();
        if (data?.access) {
            localStorage.setItem(ACCESS_KEY, data.access);
            return true;
        }
    } catch (e) {}
    clearTokens();
    return false;
}

function buildHeaders(init) {
    const headers = new Headers(init?.headers || {});
    const token = getAccessToken();
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
}

function isApiUrl(url) {
    return typeof url === "string" && url.includes("/api/");
}

window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : input.url;
    if (!isApiUrl(url)) return originalFetch(input, init);

    const opts = { ...init, headers: buildHeaders(init) };
    let response = await originalFetch(input, opts);

    if (response.status === 401 &&
        !url.includes("/api/auth/login") &&
        !url.includes("/api/auth/refresh")) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const retryOpts = { ...init, headers: buildHeaders(init) };
            response = await originalFetch(input, retryOpts);
        }
    }
    return response;
};