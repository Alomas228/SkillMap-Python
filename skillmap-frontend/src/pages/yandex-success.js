// Страница, на которую редиректит бэк после успешного OAuth с Яндексом.
// Забирает одноразовый ticket из URL, меняет его на JWT через /api/auth/yandex/claim,
// сохраняет токены и редиректит юзера по его роли.
import { setTokens } from "../auth.js";

function pickRedirectByRole(role) {
    const r = String(role || "").trim().toLowerCase();
    if (r === "hr") return "/hr";
    if (r === "manager") return "/matrix";
    return "/profile";
}

export async function renderYandexSuccessPage() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="main-container">
            <div class="auth-container">
                <h1 class="title">SkillMap</h1>
                <label class="subtitle" id="yandex-status">Завершаем вход через Яндекс...</label>
            </div>
        </div>
    `;

    const url = new URL(window.location.href);
    const ticket = url.searchParams.get("ticket");

    if (!ticket) {
        window.location.href = "/?yandex_error=Нет ticket в URL";
        return;
    }

    try {
        const resp = await fetch("/api/auth/yandex/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticket }),
        });

        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            const msg = data?.error || "Не удалось завершить вход";
            window.location.href = `/?yandex_error=${encodeURIComponent(msg)}`;
            return;
        }

        const data = await resp.json();
        if (data?.tokens) {
            setTokens(data.tokens);
        }

        window.location.href = pickRedirectByRole(data?.user?.role);
    } catch (e) {
        window.location.href = "/?yandex_error=Ошибка соединения";
    }
}
