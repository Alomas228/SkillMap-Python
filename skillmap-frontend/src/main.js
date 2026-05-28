// Подменяем window.fetch так, чтобы он автоматически добавлял JWT
// и обновлял токен при 401. Должно быть ПЕРВЫМ импортом.
import "./auth.js";

import { renderLoginPage } from "./pages/login.js";
import { renderMatrixPage } from "./pages/matrix.js";
import { renderProfilePage } from "./pages/profile.js";
import { renderHrPage } from "./pages/hr.js";
import { renderPublicProfilePage } from "./pages/public-profile.js";
import { renderAskPage } from "./pages/ask.js";
import { renderCreateUserPage } from "./pages/create-user.js";
import { renderYandexSuccessPage } from "./pages/yandex-success.js";

import "./styles/main.scss";
import "./styles/profile.scss";
import "./styles/matrix.scss";
import "./styles/hr.scss";
import "./styles/public-profile.scss";
import "./styles/ask.scss";
import "./styles/create-user.scss";

async function getCurrentUser() {
    try {
        const response = await fetch("/api/auth/me", {
            credentials: "include",
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка проверки авторизации:", error);
        return null;
    }
}

function normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
}

function redirectByRole(user) {
    const role = normalizeRole(user?.role);

    if (role === "employee") {
        window.location.href = "/profile";
        return;
    }

    if (role === "manager") {
        window.location.href = "/matrix";
        return;
    }

    if (role === "hr") {
        window.location.href = "/hr";
        return;
    }

    window.location.href = "/profile";
}

async function router() {
    const path = window.location.pathname;

    // OAuth-callback страница: ticket → JWT. Не проверяем авторизацию,
    // потому что юзер как раз авторизуется здесь.
    if (path === "/auth/yandex/success") {
        renderYandexSuccessPage();
        return;
    }

    if (path === "/" || path === "/index.html" || path === "/login") {
        const user = await getCurrentUser();

        if (user) {
            redirectByRole(user);
            return;
        }

        renderLoginPage();
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = "/";
        return;
    }

    const role = normalizeRole(user.role);

    if (path === "/dashboard") {
        redirectByRole(user);
        return;
    }

    if (path === "/profile") {
        renderProfilePage();
        return;
    }

    if (path === "/matrix") {
        if (role !== "manager" && role !== "hr") {
            redirectByRole(user);
            return;
        }

        renderMatrixPage();
        return;
    }

    if (path === "/hr") {
        if (role !== "hr") {
            redirectByRole(user);
            return;
        }

        renderHrPage();
        return;
    }

    if (path.startsWith("/public-profile") || path.startsWith("/public-profiles")) {
        renderPublicProfilePage();
        return;
    }

    if (path === "/ask") {
        renderAskPage();
        return;
    }

    if (path === "/create-user") {
        renderCreateUserPage();
        return;
    }

    redirectByRole(user);
}

window.navigateTo = function (path) {
    window.history.pushState({}, "", path);
    router();
};

window.addEventListener("popstate", router);
document.addEventListener("DOMContentLoaded", router);
