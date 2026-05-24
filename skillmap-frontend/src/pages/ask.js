import searchIcon from "../assets/search.svg";
import lampIcon from "../assets/lamp.svg";
import { renderHeaderHTML, initHeader } from "../components/header.js";
import API_CONFIG from "../config.js";

export async function renderAskPage() {
    const app = document.getElementById("app");
    if (!app) return;

    let currentUser = null;
    try {
        const res = await fetch(API_CONFIG.AUTH.ME, { credentials: "include" });
        if (res.ok) currentUser = await res.json();
    } catch {}

    app.innerHTML = `
        <div class="ask-page">
            ${renderHeaderHTML(currentUser)}

            <main class="ask-main">
                <div class="ask-container">
                    <h1 class="ask-title">Кого спросить?</h1>
                    <p class="ask-subtitle">Найдите сотрудников, которые лучше всего владеют нужным вам навыком</p>

                    <div class="ask-search-section">
                        <div class="ask-search-box">
                            <input type="text" id="skillSearchInput" placeholder="Введите навык, например, Docker" class="ask-search-input" autocomplete="off">
                            <img src="${searchIcon}" alt="Поиск" class="ask-search-icon">
                        </div>
                    </div>

                    <div id="askResults" class="ask-results">
                        <div class="ask-empty">
                            <p>Введите навык для поиска сотрудников</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    initAskPage(currentUser);
}

function buildCardHTML(emp) {
    var card = '<div class="ask-card">';
    card += '<div class="ask-card-avatar"></div>';
    card += '<div class="ask-card-info">';
    card += '<div class="ask-card-name">' + emp.fullName + '</div>';
    card += '<div class="ask-card-role">' + (emp.position || '') + '</div>';
    card += '</div>';
    card += '<button class="ask-card-btn" data-id="' + emp.publicId + '">Посмотреть профиль</button>';
    card += '</div>';
    return card;
}

function buildCategoryHTML(title, dotClass, employees) {
    var html = '<div class="ask-category">';
    html += '<div class="ask-category-header">';
    html += '<span class="ask-category-dot ' + dotClass + '"></span>';
    html += '<h2 class="ask-category-title">' + title + '</h2>';
    html += '</div>';
    html += '<div class="ask-category-cards">';
    html += employees.map(buildCardHTML).join('');
    html += '</div>';
    html += '</div>';
    return html;
}

function initAskPage(currentUser) {
    initHeader(currentUser);

    const searchInput = document.getElementById("skillSearchInput");
    let debounceTimer = null;

    async function renderResults(skillQuery) {
        const resultsContainer = document.getElementById("askResults");
        if (!resultsContainer) return;

        if (!skillQuery || skillQuery.trim() === "") {
            resultsContainer.innerHTML = `
                <div class="ask-empty">
                    <p>Введите навык для поиска сотрудников</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `<div class="ask-empty"><p>Загрузка...</p></div>`;

        let employees = [];
        try {
            const res = await fetch(
                API_CONFIG.ASK.SEARCH + "?skill=" + encodeURIComponent(skillQuery.trim()),
                { credentials: "include" }
            );
            if (res.ok) employees = await res.json();
        } catch {
            resultsContainer.innerHTML = `<div class="ask-empty"><p>Ошибка загрузки данных</p></div>`;
            return;
        }

        if (employees.length === 0) {
            resultsContainer.innerHTML = `
                <div class="ask-results-header">
                    Результаты по запросу: <span class="ask-query">${skillQuery}</span>
                </div>
                <div class="ask-empty">
                    <img class="lamp" src="${lampIcon}">
                    <div class="ask-empty-content">
                        <h3 class="ask-empty-title">Ничего не найдено</h3>
                        <p class="ask-empty-text">
                            Похоже, у нас пока нет сотрудников с опытом в навыке
                            &laquo;${skillQuery}&raquo;. Хотите развить это направление?
                        </p>
                        <button class="ask-empty-btn">Обратиться к HR</button>
                    </div>
                </div>
            `;
            resultsContainer.querySelector(".ask-empty-btn")?.addEventListener("click", () => {
                alert("Запрос отправлен HR.");
            });
            return;
        }

        const experts     = employees.filter(e => e.level === "expert");
        const advanced    = employees.filter(e => e.level === "advanced");
        const experienced = employees.filter(e => e.level === "experienced");
        const novices     = employees.filter(e => e.level === "novice");

        let html = `<div class="ask-results-header">Результаты по запросу: <span class="ask-query">${skillQuery}</span></div>`;
        if (experts.length)     html += buildCategoryHTML("Эксперты",    "expert-dot",      experts);
        if (advanced.length)    html += buildCategoryHTML("Продвинутые", "advanced-dot",    advanced);
        if (experienced.length) html += buildCategoryHTML("Опытные",     "experienced-dot", experienced);
        if (novices.length)     html += buildCategoryHTML("Новички",     "novice-dot",      novices);

        resultsContainer.innerHTML = html;

        resultsContainer.querySelectorAll(".ask-card-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                window.navigateTo(`/public-profile?id=${this.dataset.id}`);
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => renderResults(e.target.value), 300);
        });
    }
}
