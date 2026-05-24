import statIcon1 from "../assets/1stat-card.svg";
import { renderHeaderHTML, initHeader, updateHeaderUser } from "../components/header.js";
import statIcon2 from "../assets/2stat-card.svg";
import statIcon3 from "../assets/3stat-card.svg";
import API_CONFIG from "../config.js";

let matrixData = {
    stats: {
        totalEmployees: 0,
        uniqueSkills: 0,
        experts: 0,
        seniorCount: 0,
        middleCount: 0,
        juniorCount: 0,
        internCount: 0,
    },
    departments: [],
    skills: [],
    employees: [],
};

let currentUser = null;
let currentDepartment = "all";
let currentNameSearch = "";
let currentSkillSearch = "";
let currentCategoryFilter = "all";

const API_TO_UI_LEVEL = {
    Intern: "Новичок",
    Junior: "Опытный",
    Middle: "Продвинутый",
    Senior: "Эксперт",
};

const levelColorsMatrix = {
    Intern: "#C0E6BCC7",
    Junior: "#F4F3B5",
    Middle: "#EDC9AD",
    Senior: "#F2ACAC",
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
    return `https://ui-avatars.com/api/?background=7c5bb8&color=fff&name=${encodeURIComponent(name || "User")}`;
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

    if (response.status === 403) {
        showMatrixError("У вас нет доступа к матрице компетенций");
        return null;
    }

    return response;
}

async function getCurrentUser() {
    try {
        const response = await fetch(API_CONFIG.AUTH.ME, {
            credentials: "include",
        });

        if (!response.ok) return null;

        return await response.json();
    } catch {
        return null;
    }
}

export async function renderMatrixPage() {
    const app = document.getElementById("app");
    if (!app) return;

    currentUser = await getCurrentUser();

    // Загружаем данные ДО первого рендера, чтобы числа статистики
    // сразу появились с правильными значениями, без мерцания 0 -> N.
    try {
        const preResp = await fetch(API_CONFIG.MATRIX.GET);
        if (preResp.ok) {
            const data = await preResp.json();
            matrixData = {
                stats: data.stats || {},
                departments: data.departments || [],
                skills: data.skills || [],
                employees: data.employees || [],
            };
        }
    } catch (e) {
        // ошибка обработается в loadMatrixData ниже
    }

    const s = matrixData.stats;

    app.innerHTML = `
        <div class="matrix-page">
            ${renderHeaderHTML(currentUser)}

            <main class="matrix-main">
                <div class="matrix-stats-cards">
                    <div class="matrix-stat-card">
                        <img src="${statIcon1}" alt="Иконка" class="matrix-stat-icon">
                        <div class="matrix-stat-label">Всего в отделе:</div>
                        <div class="matrix-stat-value" id="totalEmployeesValue">${s.totalEmployees ?? 0}</div>
                    </div>

                    <div class="matrix-stat-card">
                        <img src="${statIcon2}" alt="Иконка" class="matrix-stat-icon">
                        <div class="matrix-stat-label">Уникальных навыков:</div>
                        <div class="matrix-stat-value" id="uniqueSkillsValue">${s.uniqueSkills ?? 0}</div>
                    </div>

                    <div class="matrix-stat-card">
                        <img src="${statIcon3}" alt="Иконка" class="matrix-stat-icon">
                        <div class="matrix-stat-label">Экспертов:</div>
                        <div class="matrix-stat-value" id="expertsValue">${s.experts ?? 0}</div>
                    </div>
                </div>

                <div class="matrix-top-section">
                    <div class="matrix-chart-card">
                        <div class="matrix-all-emp">Распределение уровней сотрудников:</div>

                        <div class="matrix-chart-wrapper">
                            <canvas id="levelsChart"></canvas>

                            <div class="matrix-chart-legend">
                                <div><span class="matrix-dot expert"></span> Эксперт: <span id="seniorCount">${s.seniorCount ?? 0}</span></div>
                                <div><span class="matrix-dot advanced"></span> Продвинутый: <span id="middleCount">${s.middleCount ?? 0}</span></div>
                                <div><span class="matrix-dot experienced"></span> Опытный: <span id="juniorCount">${s.juniorCount ?? 0}</span></div>
                                <div><span class="matrix-dot novice"></span> Новичок: <span id="internCount">${s.internCount ?? 0}</span></div>
                            </div>
                        </div>
                    </div>

                    <div class="matrix-filters-card">
                        <div class="matrix-filter-text">Фильтры</div>

                        <div class="matrix-departament">
                            <label>Отдел:</label>
                            <select id="departmentFilter">
                                <option value="all">Все</option>
                            </select>
                        </div>

                        <input type="text" id="nameSearch" placeholder="Поиск по имени">
                        <input type="text" id="skillSearch" placeholder="Поиск по навыку">

                        <div class="matrix-buttons">
                            <button id="applyFilters">Применить</button>
                            <button id="resetFilters">Сбросить</button>
                        </div>
                    </div>
                </div>

                <div class="matrix-section">
                    <div class="matrix-table-header">
                        <h3>Матрица компетенций:</h3>

                        <div class="matrix-filter-section">
                            <span class="matrix-filter-label">Категория:</span>
                            <select id="filterSelect" class="matrix-filter-select">
                                <option value="all">Все</option>
                            </select>
                        </div>
                    </div>

                    <div class="matrix-table-container">
                        <table class="matrix-table" id="matrixTable">
                            <thead id="matrixHead">
                                <tr>
                                    <th class="matrix-employee-col">Сотрудник</th>
                                </tr>
                            </thead>

                            <tbody id="matrixBody">
                                <tr>
                                    <td>Загрузка...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    `;

    initMatrixPage();
}

async function initMatrixPage() {
    initHeader(currentUser);
    initFilters();
    await loadMatrixData();
}

function initFilters() {
    const applyBtn = document.getElementById("applyFilters");
    const resetBtn = document.getElementById("resetFilters");
    const departmentFilter = document.getElementById("departmentFilter");
    const nameSearch = document.getElementById("nameSearch");
    const skillSearch = document.getElementById("skillSearch");
    const categoryFilter = document.getElementById("filterSelect");

    applyBtn?.addEventListener("click", function () {
        currentDepartment = departmentFilter?.value || "all";
        currentNameSearch = nameSearch?.value || "";
        currentSkillSearch = skillSearch?.value || "";
        renderMatrix();
    });

    resetBtn?.addEventListener("click", function () {
        if (departmentFilter) departmentFilter.value = "all";
        if (nameSearch) nameSearch.value = "";
        if (skillSearch) skillSearch.value = "";
        if (categoryFilter) categoryFilter.value = "all";

        currentDepartment = "all";
        currentNameSearch = "";
        currentSkillSearch = "";
        currentCategoryFilter = "all";

        renderMatrix();
    });

    categoryFilter?.addEventListener("change", function () {
        currentCategoryFilter = categoryFilter.value;
        renderMatrix();
    });

    nameSearch?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            currentNameSearch = nameSearch.value;
            renderMatrix();
        }
    });

    skillSearch?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            currentSkillSearch = skillSearch.value;
            renderMatrix();
        }
    });
}

async function loadMatrixData() {
    const response = await apiFetch(API_CONFIG.MATRIX.GET);

    if (!response) return;

    if (!response.ok) {
        showMatrixError("Не удалось загрузить матрицу компетенций");
        return;
    }

    matrixData = await response.json();

    matrixData.stats = matrixData.stats || {};
    matrixData.departments = matrixData.departments || [];
    matrixData.skills = matrixData.skills || [];
    matrixData.employees = matrixData.employees || [];

    renderDepartmentOptions();
    renderCategoryOptions();
    renderMatrix();
}

function renderDepartmentOptions() {
    const departmentFilter = document.getElementById("departmentFilter");
    if (!departmentFilter) return;

    departmentFilter.innerHTML = `<option value="all">Все</option>`;

    matrixData.departments.forEach((department) => {
        const option = document.createElement("option");
        option.value = department;
        option.textContent = department;
        departmentFilter.appendChild(option);
    });
}

function renderCategoryOptions() {
    const categoryFilter = document.getElementById("filterSelect");
    if (!categoryFilter) return;

    const categories = [...new Set(
        matrixData.skills
            .map((skill) => skill.category)
            .filter(Boolean)
    )].sort();

    categoryFilter.innerHTML = `<option value="all">Все</option>`;

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function getFilteredSkills() {
    let skills = [...matrixData.skills];

    if (currentCategoryFilter !== "all") {
        skills = skills.filter((skill) => skill.category === currentCategoryFilter);
    }

    if (currentSkillSearch.trim()) {
        const search = currentSkillSearch.trim().toLowerCase();

        skills = skills.filter((skill) => {
            return (
                skill.name.toLowerCase().includes(search) ||
                String(skill.category || "").toLowerCase().includes(search)
            );
        });
    }

    return skills;
}

function getFilteredEmployees(filteredSkills) {
    let employees = [...matrixData.employees];

    if (currentDepartment !== "all") {
        employees = employees.filter((employee) => employee.department === currentDepartment);
    }

    if (currentNameSearch.trim()) {
        const search = currentNameSearch.trim().toLowerCase();

        employees = employees.filter((employee) => {
            return String(employee.fullName || "").toLowerCase().includes(search);
        });
    }

    if (currentSkillSearch.trim()) {
        const skillIds = new Set(filteredSkills.map((skill) => skill.id));

        employees = employees.filter((employee) => {
            return (employee.skills || []).some((skill) => skillIds.has(skill.skillId));
        });
    }

    return employees;
}

function renderMatrix() {
    const filteredSkills = getFilteredSkills();
    const filteredEmployees = getFilteredEmployees(filteredSkills);

    renderStats(filteredEmployees, filteredSkills);
    renderChart(filteredEmployees);
    renderMatrixTable(filteredEmployees, filteredSkills);
}

function renderStats(employees, skills) {
    const totalEmployeesValue = document.getElementById("totalEmployeesValue");
    const uniqueSkillsValue = document.getElementById("uniqueSkillsValue");
    const expertsValue = document.getElementById("expertsValue");

    const expertsCount = employees.filter((employee) => {
        return (employee.skills || []).some((skill) => skill.level === "Senior");
    }).length;

    if (totalEmployeesValue) totalEmployeesValue.textContent = employees.length;
    if (uniqueSkillsValue) uniqueSkillsValue.textContent = skills.length;
    if (expertsValue) expertsValue.textContent = expertsCount;
}

function getLevelDistribution(employees) {
    const result = {
        Senior: 0,
        Middle: 0,
        Junior: 0,
        Intern: 0,
    };

    employees.forEach((employee) => {
        (employee.skills || []).forEach((skill) => {
            if (result[skill.level] !== undefined) {
                result[skill.level] += 1;
            }
        });
    });

    return result;
}

function renderChart(employees) {
    const distribution = getLevelDistribution(employees);

    const seniorCount = document.getElementById("seniorCount");
    const middleCount = document.getElementById("middleCount");
    const juniorCount = document.getElementById("juniorCount");
    const internCount = document.getElementById("internCount");

    if (seniorCount) seniorCount.textContent = distribution.Senior;
    if (middleCount) middleCount.textContent = distribution.Middle;
    if (juniorCount) juniorCount.textContent = distribution.Junior;
    if (internCount) internCount.textContent = distribution.Intern;

    const ctx = document.getElementById("levelsChart");

    if (!ctx || typeof Chart === "undefined") {
        return;
    }

    if (window.skillMapLevelsChart) {
        window.skillMapLevelsChart.destroy();
    }

    window.skillMapLevelsChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Эксперт", "Продвинутый", "Опытный", "Новичок"],
            datasets: [
                {
                    data: [
                        distribution.Senior,
                        distribution.Middle,
                        distribution.Junior,
                        distribution.Intern,
                    ],
                    backgroundColor: [
                        "#F2ACAC",
                        "#EDC9AD",
                        "#F4F3B5",
                        "#C0E6BCC7",
                    ],
                    borderWidth: 0,
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                },
            },
        },
    });
}

function renderMatrixTable(employees, skills) {
    const matrixHead = document.getElementById("matrixHead");
    const matrixBody = document.getElementById("matrixBody");

    if (!matrixHead || !matrixBody) return;

    matrixHead.innerHTML = `
        <tr>
            <th class="employee-col">Сотрудник</th>
            ${skills.map((skill) => `<th>${escapeHtml(skill.name)}</th>`).join("")}
        </tr>
    `;

    if (employees.length === 0) {
        matrixBody.innerHTML = `
            <tr>
                <td colspan="${skills.length + 1}">Сотрудники не найдены</td>
            </tr>
        `;
        return;
    }

    if (skills.length === 0) {
        matrixBody.innerHTML = employees
            .map((employee) => {
                return `
                    <tr>
                        <td class="matrix-employee-name">${escapeHtml(employee.fullName)}</td>
                    </tr>
                `;
            })
            .join("");
        return;
    }

    matrixBody.innerHTML = employees
        .map((employee) => {
            return `
                <tr>
                    <td class="matrix-employee-name">
                        ${escapeHtml(employee.fullName)}
                    </td>

                    ${skills.map((skill) => renderSkillCell(employee, skill)).join("")}
                </tr>
            `;
        })
        .join("");
}

function renderSkillCell(employee, skill) {
    const userSkill = (employee.skills || []).find((item) => item.skillId === skill.id);

    if (!userSkill) {
        return `
            <td class="matrix-skill-cell">
                <div class="matrix-skill-square empty" title="Нет навыка"></div>
            </td>
        `;
    }

    const color = levelColorsMatrix[userSkill.level] || "#C0E6BCC7";
    const title = API_TO_UI_LEVEL[userSkill.level] || userSkill.level;

    return `
        <td class="matrix-skill-cell">
            <div
                class="matrix-skill-square"
                style="background-color: ${color}"
                title="${escapeHtml(title)}"
            ></div>
        </td>
    `;
}

function showMatrixError(message) {
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
        window.location.href = "/";
    });
}