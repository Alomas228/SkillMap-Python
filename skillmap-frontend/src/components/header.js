import arrowIcon from "../assets/Icon.svg";
import menuIcon1 from "../assets/image-menu1.svg";
import menuIcon2 from "../assets/image-menu2.svg";
import API_CONFIG from "../config.js";
import { clearTokens, getRefreshToken } from "../auth.js";

function getNavLinks(role) {
    const r = String(role || "").trim().toLowerCase();

    if (r === "hr") {
        return `
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/hr')">Главная</a>
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/matrix')">Матрица компетенций</a>
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/ask')">Кого спросить?</a>
        `;
    }

    if (r === "manager") {
        return `
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/matrix')">Главная</a>
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/matrix')">Матрица компетенций</a>
            <a href="#" onclick="event.preventDefault(); window.navigateTo('/ask')">Кого спросить?</a>
        `;
    }

    // employee (default)
    return `
        <a href="#" onclick="event.preventDefault(); window.navigateTo('/profile')">Главная</a>
        <a href="#" onclick="event.preventDefault(); window.navigateTo('/ask')">Кого спросить?</a>
    `;
}

export function renderHeaderHTML(user) {
    const fullName = user?.fullName || "Пользователь";
    const role = user?.role || "";
    const avatarUrl = `https://ui-avatars.com/api/?background=7c5bb8&color=fff&name=${encodeURIComponent(fullName)}`;

    return `
        <header class="hr-header">
            <div class="hr-header-left">
                <div class="hr-logo">SkillMap</div>
                <nav class="hr-nav">
                    ${getNavLinks(role)}
                </nav>
            </div>

            <div class="hr-container-avatar">
                <div class="hr-avatar" id="headerAvatar" style="background-image:url('${avatarUrl}');background-size:cover;background-position:center"></div>

                <div class="hr-arrow-wrapper">
                    <img src="${arrowIcon}" alt="Стрелка" class="hr-arrow-icon" id="dropdownArrow">

                    <div class="hr-dropdown-menu" id="dropdownMenu">
                        <div class="hr-dropdown-header">
                            <div class="hr-dropdown-avatar" id="dropdownAvatar" style="background-image:url('${avatarUrl}');background-size:cover;background-position:center"></div>
                            <div class="hr-dropdown-info">
                                <div class="hr-dropdown-name">${fullName}</div>
                                <div class="hr-dropdown-role">${role}</div>
                            </div>
                        </div>

                        <div class="hr-dropdown-divider"></div>

                        <button class="hr-dropdown-item" id="profileBtn">
                            <img src="${menuIcon1}" alt="Профиль" class="hr-dropdown-icon">
                            Мой профиль
                        </button>

                        <button class="hr-dropdown-item hr-logout" id="logoutBtn">
                            <img src="${menuIcon2}" alt="Выйти" class="hr-dropdown-icon">
                            Выйти
                        </button>
                    </div>
                </div>
            </div>
        </header>
    `;
}

export function updateHeaderUser(user) {
    _headerUser = user;
    const fullName = user?.fullName || "Пользователь";
    const role = user?.role || "";
    const avatarUrl = `https://ui-avatars.com/api/?background=7c5bb8&color=fff&name=${encodeURIComponent(fullName)}`;

    const headerAvatar = document.getElementById("headerAvatar");
    const dropdownAvatar = document.getElementById("dropdownAvatar");
    const dropdownName = document.querySelector(".hr-dropdown-name");
    const dropdownRole = document.querySelector(".hr-dropdown-role");

    if (headerAvatar) {
        headerAvatar.style.backgroundImage = `url('${avatarUrl}')`;
        headerAvatar.style.backgroundSize = "cover";
        headerAvatar.style.backgroundPosition = "center";
    }
    if (dropdownAvatar) {
        dropdownAvatar.style.backgroundImage = `url('${avatarUrl}')`;
        dropdownAvatar.style.backgroundSize = "cover";
        dropdownAvatar.style.backgroundPosition = "center";
    }
    if (dropdownName) dropdownName.textContent = fullName;
    if (dropdownRole) dropdownRole.textContent = role;
}

let _headerUser = null;

export function initHeader(user) {
    _headerUser = user;

    const dropdownArrow = document.getElementById("dropdownArrow");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    dropdownArrow?.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu?.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (
            dropdownArrow && dropdownMenu &&
            !dropdownArrow.contains(e.target) &&
            !dropdownMenu.contains(e.target)
        ) {
            dropdownMenu.classList.remove("show");
        }
    });

    profileBtn?.addEventListener("click", () => {
        window.navigateTo("/public-profile");
    });

    logoutBtn?.addEventListener("click", async () => {
        const refresh = getRefreshToken();
        try {
            await fetch(API_CONFIG.AUTH.LOGOUT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(refresh ? { refresh } : {}),
            });
        } catch (e) {
            // даже если запрос упал — токены всё равно сбрасываем локально
        }
        clearTokens();
        // window.location, а не navigateTo: гарантированная перезагрузка,
        // чтобы любые закэшированные данные/состояние сбросились
        window.location.href = "/";
    });
}
