import { renderHeaderHTML, initHeader } from "../components/header.js";
import API_CONFIG from "../config.js";

export async function renderCreateUserPage() {
    const app = document.getElementById("app");
    if (!app) return;

    let currentUser = null;
    try {
        const res = await fetch(API_CONFIG.AUTH.ME, { credentials: "include" });
        if (res.ok) currentUser = await res.json();
    } catch {}

    app.innerHTML = `
        <div class="cu-page">
            ${renderHeaderHTML(currentUser)}

            <main class="cu-main">
                <div class="cu-card">
                    <h1 class="cu-title">Создать пользователя</h1>
                    <p class="cu-subtitle">Заполните данные нового сотрудника</p>

                    <form id="createUserForm" class="cu-form" novalidate>
                        <div class="cu-row">
                            <div class="cu-field">
                                <label class="cu-label">ФИО <span class="cu-required">*</span></label>
                                <input type="text" id="cu-fullName" class="cu-input" placeholder="Иванов Иван Иванович" autocomplete="off">
                            </div>

                            <div class="cu-field">
                                <label class="cu-label">Email <span class="cu-required">*</span></label>
                                <input type="email" id="cu-email" class="cu-input" placeholder="user@company.ru" autocomplete="off">
                            </div>
                        </div>

                        <div class="cu-row">
                            <div class="cu-field">
                                <label class="cu-label">Пароль <span class="cu-required">*</span></label>
                                <input type="password" id="cu-password" class="cu-input" placeholder="Минимум 3 символа">
                            </div>

                            <div class="cu-field">
                                <label class="cu-label">Подтверждение пароля <span class="cu-required">*</span></label>
                                <input type="password" id="cu-confirmPassword" class="cu-input" placeholder="Повторите пароль">
                            </div>
                        </div>

                        <div class="cu-row">
                            <div class="cu-field">
                                <label class="cu-label">Должность</label>
                                <input type="text" id="cu-position" class="cu-input" placeholder="Например: Senior Developer" autocomplete="off">
                            </div>

                            <div class="cu-field">
                                <label class="cu-label">Отдел</label>
                                <input type="text" id="cu-department" class="cu-input" placeholder="Например: Backend" autocomplete="off">
                            </div>
                        </div>

                        <div class="cu-row cu-row-half">
                            <div class="cu-field">
                                <label class="cu-label">Роль <span class="cu-required">*</span></label>
                                <select id="cu-role" class="cu-input cu-select">
                                    <option value="">— Выберите роль —</option>
                                    <option value="Employee">Сотрудник (Employee)</option>
                                    <option value="Manager">Руководитель (Manager)</option>
                                    <option value="HR">HR</option>
                                </select>
                            </div>
                        </div>

                        <div id="cu-error" class="cu-error" style="display:none"></div>
                        <div id="cu-success" class="cu-success" style="display:none"></div>

                        <div class="cu-actions">
                            <button type="submit" class="cu-btn-primary" id="cu-submitBtn">
                                Создать пользователя
                            </button>
                            <button type="button" class="cu-btn-secondary" id="cu-resetBtn">
                                Очистить
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    `;

    initHeader(currentUser);
    initCreateUserForm();
}

function initCreateUserForm() {
    const form = document.getElementById("createUserForm");
    const resetBtn = document.getElementById("cu-resetBtn");

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleSubmit();
    });

    resetBtn?.addEventListener("click", () => {
        form?.reset();
        hideMessage("cu-error");
        hideMessage("cu-success");
        clearFieldErrors();
    });
}

async function handleSubmit() {
    hideMessage("cu-error");
    hideMessage("cu-success");
    clearFieldErrors();

    const fullName       = document.getElementById("cu-fullName")?.value.trim();
    const email          = document.getElementById("cu-email")?.value.trim();
    const password       = document.getElementById("cu-password")?.value;
    const confirmPassword = document.getElementById("cu-confirmPassword")?.value;
    const position       = document.getElementById("cu-position")?.value.trim();
    const department     = document.getElementById("cu-department")?.value.trim();
    const role           = document.getElementById("cu-role")?.value;

    let hasError = false;

    if (!fullName) {
        setFieldError("cu-fullName", "Введите ФИО");
        hasError = true;
    }
    if (!email) {
        setFieldError("cu-email", "Введите email");
        hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("cu-email", "Неверный формат email");
        hasError = true;
    }
    if (!password) {
        setFieldError("cu-password", "Введите пароль");
        hasError = true;
    } else if (password.length < 3) {
        setFieldError("cu-password", "Минимум 3 символа");
        hasError = true;
    }
    if (!confirmPassword) {
        setFieldError("cu-confirmPassword", "Подтвердите пароль");
        hasError = true;
    } else if (password !== confirmPassword) {
        setFieldError("cu-confirmPassword", "Пароли не совпадают");
        hasError = true;
    }
    if (!role) {
        setFieldError("cu-role", "Выберите роль");
        hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById("cu-submitBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Создание...";
    }

    try {
        const res = await fetch(API_CONFIG.USERS.CREATE, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, email, password, confirmPassword, position, department, role }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            showMessage("cu-success", `Пользователь «${fullName}» успешно создан!`);
            document.getElementById("createUserForm")?.reset();
        } else if (res.status === 409) {
            showMessage("cu-error", "Пользователь с таким email уже существует");
        } else if (res.status === 403) {
            showMessage("cu-error", "Недостаточно прав. Создавать пользователей может только HR");
        } else {
            showMessage("cu-error", data.message || data.error || "Ошибка при создании пользователя");
        }
    } catch {
        showMessage("cu-error", "Ошибка сети. Проверьте подключение.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Создать пользователя";
        }
    }
}

function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add("cu-input-error");

    const hint = document.createElement("span");
    hint.className = "cu-field-hint";
    hint.textContent = message;
    field.parentElement?.appendChild(hint);
}

function clearFieldErrors() {
    document.querySelectorAll(".cu-input-error").forEach(el => el.classList.remove("cu-input-error"));
    document.querySelectorAll(".cu-field-hint").forEach(el => el.remove());
}

function showMessage(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
}

function hideMessage(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}
