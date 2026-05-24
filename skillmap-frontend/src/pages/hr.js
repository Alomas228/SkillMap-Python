import statIcon1 from "../assets/1stat-card.svg";
import { renderHeaderHTML, initHeader, updateHeaderUser } from "../components/header.js";
import statIconHR2 from "../assets/hr-plus.svg";
import statIconHR3 from "../assets/active.svg";
import API_CONFIG from "../config.js";

let currentUser = null;
let currentDepartment = "all";
let currentCategory = "all";
let currentLevel = "all";
let currentSkillId = "all";
let matrixData = {
    stats: {},
    departments: [],
    skills: [],
    employees: [],
};

const LEVEL_TO_UI = {
    Senior: "Эксперт",
    Middle: "Продвинутый",
    Junior: "Опытный",
    Intern: "Новичок",
};

const UI_LEVEL_TO_API = {
    expert: "Senior",
    advanced: "Middle",
    experienced: "Junior",
    novice: "Intern",
};

const LEVEL_COLORS = {
    Senior: "#F2ACAC",
    Middle: "#EDC9AD",
    Junior: "#F4F3B5",
    Intern: "#C0E6BCC7",
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
    return `https://ui-avatars.com/api/?background=7c5bb8&color=fff&name=${encodeURIComponent(name || "HR")}`;
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
        showHrError("У вас нет доступа к HR-панели");
        return null;
    }

    return response;
}

export async function renderHrPage() {
    const app = document.getElementById("app");
    if (!app) return;

    try {
        const res = await fetch(API_CONFIG.AUTH.ME);
        if (res.ok) currentUser = await res.json();
    } catch {}

    // Загружаем данные ДО первого рендера, чтобы числа сразу были правильные.
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
    } catch (e) {}

    const employeesCount = matrixData.employees.length;
    const skillsCount = matrixData.skills.length;
    const activeProfiles = employeesCount === 0
        ? 0
        : Math.round(
            (matrixData.employees.filter((e) => (e.skills || []).length > 0).length /
                employeesCount) * 100
        );

    app.innerHTML = `
        <div class="hr-page">
            ${renderHeaderHTML(currentUser)}

            <main class="hr-main">
                <div class="hr-stats-cards">
                    <div class="hr-stat-card">
                        <img src="${statIcon1}" alt="Иконка" class="hr-stat-icon">
                        <div class="hr-stat-label">Сотрудников:</div>
                        <div class="hr-stat-value" id="hrEmployeesCount">${employeesCount}</div>
                    </div>

                    <div class="hr-stat-card">
                        <img src="${statIconHR2}" alt="Иконка" class="hr-stat-icon">
                        <div class="hr-stat-label">Навыков в каталоге:</div>
                        <div class="hr-stat-value" id="hrSkillsCount">${skillsCount}</div>
                    </div>

                    <div class="hr-stat-card">
                        <img src="${statIconHR3}" alt="Иконка" class="hr-stat-icon">
                        <div class="hr-stat-label">Активных профилей:</div>
                        <div class="hr-stat-value" id="hrActiveProfiles">${activeProfiles}%</div>
                    </div>
                </div>

                <div class="hr-top-row">
                    <div class="hr-blocks">
                        <div class="hr-block hr-top-skills">
                            <h3>Топ-10 навыков компании</h3>
                            <div class="hr-top-skills-list" id="topSkillsList">Загрузка...</div>
                        </div>

                        <div class="hr-block hr-rare-skills">
                            <h3>Топ-5 редких навыков</h3>
                            <div class="hr-rare-skills-list" id="rareSkillsList">Загрузка...</div>
                        </div>

                        <div class="hr-block">
                            <h3>Навыки с разрывом</h3>
                            <div class="hr-gap-list" id="gapSkillsList">Загрузка...</div>
                        </div>
                    </div>

                    <div class="hr-filters-block">
                        <div class="hr-filter-text">Фильтры</div>

                        <div class="hr-filter-item">
                            <label id="dep">Отдел:</label>
                            <select id="departmentFilterHr">
                                <option value="all">Все</option>
                            </select>
                        </div>

                        <div class="hr-filter-item">
                            <label>Категория навыков:</label>
                            <select id="categoryFilterHr">
                                <option value="all">Все</option>
                            </select>
                        </div>

                        <div class="hr-filter-item">
                            <label>Уровень:</label>
                            <select id="levelFilterHr">
                                <option value="all">Все</option>
                                <option value="expert">Эксперт</option>
                                <option value="advanced">Продвинутый</option>
                                <option value="experienced">Опытный</option>
                                <option value="novice">Новичок</option>
                            </select>
                        </div>

                        <div class="hr-buttons">
                            <button id="applyFiltersHr">Применить</button>
                            <button id="resetFiltersHr">Сбросить</button>
                        </div>
                    </div>
                </div>

                <div class="with-buttons">
                    <div class="hr-matrix-section">
                        <div class="hr-matrix-header">
                            <h3>Матрица компетенций по отделам:</h3>

                            <div class="hr-matrix-filter">
                                <span class="hr-filter-label">Навык:</span>
                                <select id="skillMatrixFilter" class="hr-filter-select">
                                    <option value="all">Все навыки</option>
                                </select>
                            </div>
                        </div>

                        <div class="hr-matrix-table-container">
                            <table class="hr-matrix-table" id="departmentMatrixTable">
                                <thead id="departmentMatrixHead">
                                    <tr>
                                        <th class="hr-employee-col">Отдел</th>
                                    </tr>
                                </thead>

                                <tbody id="departmentMatrixBody">
                                    <tr>
                                        <td>Загрузка...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="hr-matrix-actions">
                        <button class="hr-btn-outline" id="exportReportBtn">Экспорт отчета</button>
                        <button class="hr-btn-outline" id="createSurveyBtn">Создать опрос</button>
                    </div>
                </div>
            </main>
        </div>
    `;

    initHrPage();
}

async function initHrPage() {
    initHeader(currentUser);
    initFilters();
    initActionButtons();
    await loadMatrixData();
}

async function loadMatrixData() {
    const response = await apiFetch(API_CONFIG.MATRIX.GET);

    if (!response) return;

    if (!response.ok) {
        showHrError("Не удалось загрузить HR-данные");
        return;
    }

    matrixData = await response.json();

    matrixData.stats = matrixData.stats || {};
    matrixData.departments = matrixData.departments || [];
    matrixData.skills = matrixData.skills || [];
    matrixData.employees = matrixData.employees || [];

    renderFilters();
    renderDashboard();
}

function initFilters() {
    const applyBtn = document.getElementById("applyFiltersHr");
    const resetBtn = document.getElementById("resetFiltersHr");
    const skillMatrixFilter = document.getElementById("skillMatrixFilter");

    applyBtn?.addEventListener("click", () => {
        currentDepartment = document.getElementById("departmentFilterHr")?.value || "all";
        currentCategory = document.getElementById("categoryFilterHr")?.value || "all";
        currentLevel = document.getElementById("levelFilterHr")?.value || "all";
        renderDashboard();
    });

    resetBtn?.addEventListener("click", () => {
        currentDepartment = "all";
        currentCategory = "all";
        currentLevel = "all";
        currentSkillId = "all";

        document.getElementById("departmentFilterHr").value = "all";
        document.getElementById("categoryFilterHr").value = "all";
        document.getElementById("levelFilterHr").value = "all";
        document.getElementById("skillMatrixFilter").value = "all";

        renderDashboard();
    });

    skillMatrixFilter?.addEventListener("change", () => {
        currentSkillId = skillMatrixFilter.value;
        renderDepartmentMatrix();
    });
}

function initActionButtons() {
    document.getElementById("exportReportBtn")?.addEventListener("click", exportReport);

    document.getElementById("createSurveyBtn")?.addEventListener("click", () => {
        alert("Создание опроса пока в разработке");
    });
}

function renderFilters() {
    const departmentFilter = document.getElementById("departmentFilterHr");
    const categoryFilter = document.getElementById("categoryFilterHr");
    const skillMatrixFilter = document.getElementById("skillMatrixFilter");

    if (departmentFilter) {
        departmentFilter.innerHTML = `<option value="all">Все</option>`;

        matrixData.departments.forEach((department) => {
            const option = document.createElement("option");
            option.value = department;
            option.textContent = department;
            departmentFilter.appendChild(option);
        });
    }

    if (categoryFilter) {
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

    if (skillMatrixFilter) {
        skillMatrixFilter.innerHTML = `<option value="all">Все навыки</option>`;

        matrixData.skills.forEach((skill) => {
            const option = document.createElement("option");
            option.value = skill.id;
            option.textContent = skill.category
                ? `${skill.name} (${skill.category})`
                : skill.name;

            skillMatrixFilter.appendChild(option);
        });
    }
}

function getFilteredEmployees() {
    let employees = [...matrixData.employees];

    if (currentDepartment !== "all") {
        employees = employees.filter((employee) => employee.department === currentDepartment);
    }

    if (currentLevel !== "all") {
        const apiLevel = UI_LEVEL_TO_API[currentLevel];

        employees = employees.filter((employee) => {
            return (employee.skills || []).some((skill) => skill.level === apiLevel);
        });
    }

    if (currentCategory !== "all") {
        employees = employees.filter((employee) => {
            return (employee.skills || []).some((skill) => skill.skillCategory === currentCategory);
        });
    }

    return employees;
}

function getFilteredSkills() {
    let skills = [...matrixData.skills];

    if (currentCategory !== "all") {
        skills = skills.filter((skill) => skill.category === currentCategory);
    }

    if (currentSkillId !== "all") {
        skills = skills.filter((skill) => String(skill.id) === String(currentSkillId));
    }

    return skills;
}

function renderDashboard() {
    const employees = getFilteredEmployees();
    const skills = getFilteredSkills();

    document.getElementById("hrEmployeesCount").textContent = employees.length;
    document.getElementById("hrSkillsCount").textContent = matrixData.skills.length;

    const activeProfiles = employees.length === 0
        ? 0
        : Math.round(
            (
                employees.filter((employee) => (employee.skills || []).length > 0).length /
                employees.length
            ) * 100
        );

    document.getElementById("hrActiveProfiles").textContent = `${activeProfiles}%`;

    renderTopSkills(employees);
    renderRareSkills(employees);
    renderGapSkills(employees);
    renderDepartmentMatrix(employees, skills);
}

function countSkills(employees) {
    const map = new Map();

    employees.forEach((employee) => {
        (employee.skills || []).forEach((skill) => {
            const key = skill.skillId;

            const existing = map.get(key) || {
                skillId: skill.skillId,
                name: skill.skillName,
                category: skill.skillCategory,
                count: 0,
                senior: 0,
                middle: 0,
                junior: 0,
                intern: 0,
            };

            existing.count += 1;

            if (skill.level === "Senior") existing.senior += 1;
            if (skill.level === "Middle") existing.middle += 1;
            if (skill.level === "Junior") existing.junior += 1;
            if (skill.level === "Intern") existing.intern += 1;

            map.set(key, existing);
        });
    });

    return [...map.values()];
}

function renderTopSkills(employees) {
    const container = document.getElementById("topSkillsList");
    if (!container) return;

    const topSkills = countSkills(employees)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    if (topSkills.length === 0) {
        container.innerHTML = "Нет данных";
        return;
    }

    const maxCount = Math.max(...topSkills.map((skill) => skill.count), 1);

    container.innerHTML = topSkills.map((skill, index) => {
        const width = Math.round((skill.count / maxCount) * 100);

        return `
            <div class="hr-top-skill-item">
                <div class="hr-top-skill-rank">${index + 1}.</div>

                <div class="hr-top-skill-info">
                    <div class="hr-top-skill-bar-container">
                        <div class="hr-top-skill-bar" style="width: ${width}%">
                            <div class="hr-top-skill-name">${escapeHtml(skill.name)}</div>
                        </div>

                        <span class="hr-top-skill-count">${skill.count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderRareSkills(employees) {
    const container = document.getElementById("rareSkillsList");
    if (!container) return;

    const rareSkills = countSkills(employees)
        .sort((a, b) => a.count - b.count)
        .slice(0, 5);

    if (rareSkills.length === 0) {
        container.innerHTML = "Нет данных";
        return;
    }

    container.innerHTML = rareSkills.map((skill, index) => {
        return `
            <div class="hr-rare-skill-item">
                <div class="hr-rare-skill-rank">${index + 1}</div>

                <div class="hr-rare-skill-info">
                    <div class="hr-rare-skill-name">${escapeHtml(skill.name)} — ${skill.count}</div>
                    <div class="hr-rare-skill-line"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderGapSkills(employees) {
    const container = document.getElementById("gapSkillsList");
    if (!container) return;

    const gapSkills = countSkills(employees)
        .map((skill) => ({
            ...skill,
            gap: skill.intern + skill.junior - skill.senior,
        }))
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 5);

    if (gapSkills.length === 0) {
        container.innerHTML = "Нет данных";
        return;
    }

    container.innerHTML = gapSkills.map((skill) => {
        const deficitClass = skill.gap >= 5 ? "high" : "medium";
        const deficitText = skill.gap >= 5 ? "высокий" : "средний";

        return `
            <div class="hr-gap-item">
                <div class="hr-gap-name">⚠️ ${escapeHtml(skill.name)}</div>

                <div class="hr-gap-stats">
                    <span>Новичков: ${skill.intern + skill.junior}</span>
                    <span>Экспертов: ${skill.senior}</span>
                </div>

                <div class="hr-gap-deficit ${deficitClass}">
                    Дефицит: ${deficitText}
                </div>
            </div>
        `;
    }).join("");
}

function getBestLevelForDepartment(departmentEmployees, skillId) {
    const priority = {
        Senior: 4,
        Middle: 3,
        Junior: 2,
        Intern: 1,
    };

    let bestLevel = null;
    let bestScore = 0;

    departmentEmployees.forEach((employee) => {
        const userSkill = (employee.skills || []).find((skill) => skill.skillId === skillId);

        if (userSkill && priority[userSkill.level] > bestScore) {
            bestScore = priority[userSkill.level];
            bestLevel = userSkill.level;
        }
    });

    return bestLevel;
}

function renderDepartmentMatrix(
    employees = getFilteredEmployees(),
    skills = getFilteredSkills()
) {
    const head = document.getElementById("departmentMatrixHead");
    const body = document.getElementById("departmentMatrixBody");

    if (!head || !body) return;

    const departments = [...new Set(
        employees
            .map((employee) => employee.department)
            .filter(Boolean)
    )].sort();

    const shownSkills = skills.slice(0, currentSkillId === "all" ? 8 : skills.length);

    head.innerHTML = `
        <tr>
            <th class="hr-employee-col">Отдел</th>
            ${shownSkills.map((skill) => `<th>${escapeHtml(skill.name)}</th>`).join("")}
        </tr>
    `;

    if (departments.length === 0 || shownSkills.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="${shownSkills.length + 1}">Нет данных</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = departments.map((department) => {
        const departmentEmployees = employees.filter((employee) => employee.department === department);

        return `
            <tr>
                <td class="hr-employee-name">${escapeHtml(department)}</td>

                ${shownSkills.map((skill) => {
                    const level = getBestLevelForDepartment(departmentEmployees, skill.id);
                    return `<td>${renderSkillSquare(level)}</td>`;
                }).join("")}
            </tr>
        `;
    }).join("");
}

function renderSkillSquare(level) {
    if (!level) {
        return `<div class="hr-skill-square empty" title="Нет навыка"></div>`;
    }

    const color = LEVEL_COLORS[level] || "#C0E6BCC7";
    const title = LEVEL_TO_UI[level] || level;

    return `
        <div
            class="hr-skill-square"
            style="background-color: ${color}"
            title="${escapeHtml(title)}"
        ></div>
    `;
}

function exportReport() {
    const employees = getFilteredEmployees();

    const rows = [
        ["ФИО", "Отдел", "Должность", "Роль", "Навыки"],
        ...employees.map((employee) => [
            employee.fullName,
            employee.department,
            employee.position,
            employee.role,
            (employee.skills || [])
                .map((skill) => `${skill.skillName}: ${LEVEL_TO_UI[skill.level] || skill.level}`)
                .join("; "),
        ]),
    ];

    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "skillmap-report.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function showHrError(message) {
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