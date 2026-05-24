import avatarIcon from "../assets/icon-avatar.jpg";
import phoneIcon from "../assets/phone.svg";
import { renderHeaderHTML, initHeader, updateHeaderUser } from "../components/header.js";
import API_CONFIG from "../config.js";
import emailIcon from "../assets/email.svg";
import cityIcon from "../assets/city.svg";

import projectIcon1 from "../assets/Component-1.svg";
import projectIcon2 from "../assets/Component-2.svg";
import projectIcon3 from "../assets/Component-3.svg";
import projectIcon4 from "../assets/Component-4.svg";
import projectIcon5 from "../assets/Component-5.svg";

const projectIcons = [projectIcon1, projectIcon2, projectIcon3, projectIcon4, projectIcon5];

const API_TO_UI_LEVEL = {
    Intern: "Новичок",
    Junior: "Опытный",
    Middle: "Продвинутый",
    Senior: "Эксперт",
};

const LEVEL_CLASS = {
    Intern: "novice",
    Junior: "experienced",
    Middle: "advanced",
    Senior: "expert",
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getAvatarUrl(name) {
    return `https://ui-avatars.com/api/?background=C02BFF&color=fff&name=${encodeURIComponent(name || "User")}`;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        credentials: "include",
        ...options,
        headers: {
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        window.location.href = "/";
        return null;
    }

    return response;
}

async function loadProfileData() {
    const params = new URLSearchParams(window.location.search);
    const publicId = params.get("id");

    if (publicId) {
        const response = await apiFetch(`/api/public-profiles/${publicId}`);
        if (response && response.ok) {
            return await response.json();
        }
    }

    const response = await apiFetch(API_CONFIG.ME.DASHBOARD);

    if (!response || !response.ok) {
        throw new Error("Не удалось загрузить профиль");
    }

    return await response.json();
}

export function renderPublicProfilePage() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="public-profile-page">
            <div style="padding: 40px; font-family: Arial, sans-serif;">
                Загрузка профиля...
            </div>
        </div>
    `;

    initPublicProfilePage();
}

async function getCurrentUser() {
    try {
        const response = await fetch(API_CONFIG.AUTH.ME, { credentials: "include" });
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

async function initPublicProfilePage() {
    try {
        const [data, currentUser] = await Promise.all([loadProfileData(), getCurrentUser()]);
        renderPublicProfile(data, currentUser);
    } catch (error) {
        console.error(error);
        showPublicProfileError("Не удалось загрузить публичный профиль");
    }
}

function renderPublicProfile(data, currentUser) {
    const app = document.getElementById("app");
    if (!app) return;

    const user = data.user || {};
    const skills = data.skills || [];
    const projects = data.projects || [];

    const fullName = user.fullName || "Пользователь";
    const position = user.position || "Должность не указана";
    const department = user.department || "Отдел не указан";
    const email = user.email || "Почта не указана";
    const role = user.role || "";
    const avatar = getAvatarUrl(fullName);

    app.innerHTML = `
        <div class="public-profile-page">
            ${renderHeaderHTML(currentUser)}

            <main class="public-main">
                <div class="public-profile-wrapper">
                    <div class="public-profile-card">
                        <div class="public-top">
                            <div class="public-avatar-large">
                                <img src="${avatar}" onerror="this.src='${avatarIcon}'">
                            </div>

                            <div class="public-user-info">
                                <h2 class="public-name">${escapeHtml(fullName)}</h2>

                                <div class="public-title-row">
                                    <span>${escapeHtml(position)}</span>
                                    <span>• ${escapeHtml(department)}</span>
                                </div>

                                <div class="public-info-items">
                                    <div class="public-info-item">
                                        <img src="${cityIcon}" class="public-info-icon" alt="город">
                                        <span>${escapeHtml(department)}</span>
                                    </div>

                                    <div class="public-info-item">
                                        <img src="${phoneIcon}" class="public-info-icon" alt="телефон">
                                        <span>Телефон не указан</span>
                                    </div>

                                    <div class="public-info-item">
                                        <img src="${emailIcon}" class="public-info-icon" alt="почта">
                                        <span>${escapeHtml(email)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="public-bottom">
                            <div class="public-left">
                                <div class="public-about">
                                    <h3>Обо мне</h3>
                                    <p>
                                        Профиль сотрудника SkillMap. Здесь отображаются данные из базы:
                                        должность, отдел, контакты и навыки.
                                    </p>
                                </div>

                                <div class="public-skills-section">
                                    <h3>Навыки</h3>
                                    ${renderSkills(skills)}
                                </div>
                            </div>

                            <div class="public-projects-section">
                                <h3>Проекты</h3>
                                ${renderProjects(projects)}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    initHeader(currentUser);
}

function renderSkills(skills) {
    if (!skills || skills.length === 0) {
        return `<div class="skill-row">Навыки пока не добавлены</div>`;
    }

    return skills.map((skill) => {
        const level = skill.level || "Intern";
        const levelText = API_TO_UI_LEVEL[level] || level;
        const levelClass = LEVEL_CLASS[level] || "novice";
        const name = skill.name || skill.skillName || "Навык";
        const category = skill.category || skill.skillCategory || "";

        return `
            <div class="skill-row">
                <span class="badge ${levelClass}">${escapeHtml(levelText)}</span>
                <span>${escapeHtml(category ? `${category} (${name})` : name)}</span>
            </div>
        `;
    }).join("");
}

function renderProjects(projects) {
    if (!projects || projects.length === 0) {
        return `<div class="project-empty">Проекты не указаны</div>`;
    }

    return projects.map((project, index) => {
        const icon = projectIcons[index % projectIcons.length];
        const statusLabel = project.status === "Completed" ? "Завершён"
            : project.status === "OnHold" ? "Приостановлен"
            : "Активен";
        const statusClass = project.status === "Completed" ? "status-completed"
            : project.status === "OnHold" ? "status-onhold"
            : "status-active";

        var dateStr = "";
        if (project.startDate) {
            var start = new Date(project.startDate).getFullYear();
            var end = project.endDate ? new Date(project.endDate).getFullYear() : "н.в.";
            dateStr = start + " – " + end;
        }

        return `
            <div class="project">
                <div class="project-header">
                    <img src="${icon}" alt="иконка" class="project-icon">
                    <div class="project-title">${escapeHtml(project.name)}</div>
                    <span class="project-status ${statusClass}">${statusLabel}</span>
                </div>
                ${project.description ? `<div class="project-desc">${escapeHtml(project.description)}</div>` : ""}
                ${dateStr ? `<div class="project-dates">${dateStr}</div>` : ""}
            </div>
        `;
    }).join("");
}

function showPublicProfileError(message) {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif;">
            <h2>Ошибка</h2>
            <p>${escapeHtml(message)}</p>
            <button id="goBackBtn">Вернуться</button>
        </div>
    `;

    document.getElementById("goBackBtn")?.addEventListener("click", () => {
        window.location.href = "/profile";
    });
}