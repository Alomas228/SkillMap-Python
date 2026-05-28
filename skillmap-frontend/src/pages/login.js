import yandexIcon from "../assets/photo-yandex.png";
import API_CONFIG from "../config.js";
import { setTokens } from "../auth.js";

function initLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const passwordInput = form.querySelector('input[type="password"]');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        removeErrors(form);

        if (!email || !email.includes("@") || !password || password.length < 3) {
            showError(passwordInput, "Неверная почта или пароль");
            return;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.LOGIN}`, {
                method: "POST",
                headers: API_CONFIG.HEADERS,
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe: false,
                }),
            });

            let data = null;

            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                showError(passwordInput, data?.message || "Неверная почта или пароль");
                return;
            }

            // Сохраняем JWT-токены, которые вернул бэк
            if (data?.tokens) {
                setTokens(data.tokens);
            }

            const role = String(data?.user?.role || "").trim().toLowerCase();

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
        } catch (error) {
            console.error("Ошибка авторизации:", error);
            showError(passwordInput, "Ошибка соединения с сервером");
        }
    });
}

function showGeneralError(form, message) {
    const oldError = form.querySelector(".general-error");
    if (oldError) oldError.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message general-error";
    errorDiv.style.marginBottom = "15px";
    errorDiv.style.textAlign = "center";
    errorDiv.textContent = message;

    const submitBtn = form.querySelector('button[type="submit"]');
    form.insertBefore(errorDiv, submitBtn);
}

function showError(inputElement, message) {
    inputElement.classList.add("error");

    const parent = inputElement.parentElement;
    const oldMessage = parent?.querySelector(".error-message:not(.general-error)");
    if (oldMessage) oldMessage.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;

    inputElement.insertAdjacentElement("afterend", errorDiv);
}

function removeErrors(form) {
    form.querySelectorAll(".error").forEach((input) => input.classList.remove("error"));
    form.querySelectorAll(".error-message").forEach((message) => message.remove());
}

function initYandexButton() {
    const btn = document.getElementById("yandex-login-btn");
    btn?.addEventListener("click", () => {
        // полный редирект — браузер пойдёт на oauth.yandex.ru
        window.location.href = "/api/auth/yandex/start";
    });
}

function showYandexErrorIfAny() {
    // если callback вернул ошибку, нас редиректнули на / с ?yandex_error=...
    const url = new URL(window.location.href);
    const err = url.searchParams.get("yandex_error");
    if (!err) return;

    const form = document.getElementById("login-form");
    if (!form) return;

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message general-error";
    errorDiv.style.marginBottom = "15px";
    errorDiv.style.textAlign = "center";
    errorDiv.textContent = `Ошибка входа через Яндекс: ${err}`;
    form.insertBefore(errorDiv, form.firstChild);

    // убираем параметр из URL, чтобы не висел после рефреша
    url.searchParams.delete("yandex_error");
    window.history.replaceState({}, "", url.pathname + url.search);
}

export function renderLoginPage() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="main-container">
            <div class="auth-container">
                <h1 class="title">SkillMap</h1>
                <label class="subtitle">Введите данные для авторизации</label>

                <form id="login-form" class="login-form">
                    <label>Корпоративная почта</label>
                    <input type="email" placeholder="examplemail@gmail.com">

                    <label>Пароль</label>
                    <input type="password" placeholder="********">

                    <button type="submit" class="btn-primary">Войти</button>

                    <div class="divider">
                        <span>или</span>
                    </div>

                    <button type="button" class="btn-google" id="yandex-login-btn">
                        <img src="${yandexIcon}" alt="Yandex" class="google-icon">
                        Войти через Яндекс
                    </button>
                </form>

                <a href="#" class="forgot">Забыли пароль?</a>

                <div class="info-auth">
                    <span>Нет аккаунта?</span>
                    <a href="#">Обратитесь к HR</a>
                </div>
            </div>
        </div>
    `;

    initLoginForm();
    initYandexButton();
    showYandexErrorIfAny();
}