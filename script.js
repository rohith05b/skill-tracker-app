"use strict";

// ==========================================
// SKILLTRACK - MAIN JAVASCRIPT
// ==========================================

const STORAGE_KEY = "skilltrack_data_v1";
const THEME_KEY = "skilltrack_theme_v1";
const SECTIONS = ["dashboard", "skills", "explore", "learning", "analytics"];

const $ = (selector) => document.querySelector(selector);

const COLORS = [
    "#7c3aed",
    "#0ea5e9",
    "#16a34a",
    "#ea8b20",
    "#ec4899",
    "#6366f1"
];

const ICONS = {
    "Python": "Py",
    "Java": "J",
    "JavaScript": "JS",
    "HTML": "H",
    "CSS": "C",
    "SQL": "DB",
    "React": "R",
    "Other": "✦"
};

let skills = [];
let logs = [];
let weeklyChart = null;
let skillChart = null;
let distributionChart = null;
let toastTimer = null;

// ==========================================
// STORAGE
// ==========================================

function saveData() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ skills, logs })
        );
        return true;
    } catch (error) {
        console.error("Could not save SkillTrack data:", error);
        showToast("Unable to save data. Check browser storage.");
        return false;
    }
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const data = JSON.parse(saved);

            skills = Array.isArray(data.skills)
                ? data.skills.filter(isValidSkill)
                : [];

            logs = Array.isArray(data.logs)
                ? data.logs.filter(isValidLog)
                : [];

            // First-run sample skills with no sessions: add sample sessions so pages aren't empty.
            if (!logs.length && skills.length && skills.every(item => item.id.startsWith("sample-"))) {
                logs = sampleLogs();
                saveData();
            }

            return;
        }
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    // Example data for first-time visitors.
    skills = [
        {
            id: "sample-python",
            name: "Python",
            category: "Programming",
            level: "Intermediate",
            progress: 65,
            goal: 60,
            deadline: "",
            createdAt: Date.now()
        },
        {
            id: "sample-html",
            name: "HTML",
            category: "Web Development",
            level: "Advanced",
            progress: 100,
            goal: 30,
            deadline: "",
            createdAt: Date.now()
        },
        {
            id: "sample-sql",
            name: "SQL",
            category: "Database",
            level: "Beginner",
            progress: 40,
            goal: 45,
            deadline: "",
            createdAt: Date.now()
        },
        {
            id: "sample-javascript",
            name: "JavaScript",
            category: "Web Development",
            level: "Beginner",
            progress: 25,
            goal: 60,
            deadline: "",
            createdAt: Date.now()
        }
    ];

    logs = sampleLogs();

    saveData();
}

function dateOffset(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function sampleLogs() {
    return [
        ["sample-python", 1.5, "Functions, loops and list comprehensions", 0],
        ["sample-javascript", 1, "DOM events and form handling", 1],
        ["sample-sql", 2, "JOINs and GROUP BY queries", 2],
        ["sample-python", 1, "File handling and exceptions", 3],
        ["sample-html", 0.5, "Semantic HTML and accessibility", 4],
        ["sample-sql", 1.5, "Subqueries and indexes", 5],
        ["sample-javascript", 2, "Arrays, objects and fetch API", 6]
    ].map(([skillId, hours, topic, ago], i) => ({
        id: "sample-log-" + i, skillId, hours, topic, date: dateOffset(ago), createdAt: Date.now() - i
    }));
}

function isValidSkill(skill) {
    return Boolean(
        skill &&
        typeof skill.id === "string" &&
        typeof skill.name === "string" &&
        typeof skill.category === "string" &&
        Number.isFinite(Number(skill.progress))
    );
}

function isValidLog(log) {
    return Boolean(
        log &&
        typeof log.id === "string" &&
        typeof log.skillId === "string" &&
        typeof log.topic === "string" &&
        Number.isFinite(Number(log.hours)) &&
        Number(log.hours) > 0
    );
}

// ==========================================
// UTILITIES
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatDate(dateString) {
    if (!dateString) return "No deadline";

    const date = new Date(dateString + "T00:00:00");

    if (Number.isNaN(date.getTime())) return "No deadline";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function todayString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getStatus(skill) {
    const progress = Number(skill.progress);

    if (progress >= 100) return "Completed";
    if (progress <= 0) return "Not Started";

    return "In Progress";
}

function getStatusClass(status) {
    if (status === "Completed") return "completed";
    if (status === "In Progress") return "progress";

    return "started";
}

function getSkillColor(index) {
    return COLORS[index % COLORS.length];
}

function getSkillIcon(skill) {
    return ICONS[skill.name] || skill.name.slice(0, 2).toUpperCase();
}

function getSkillById(id) {
    return skills.find(skill => skill.id === id);
}

function getSkillHours(skillId) {
    return logs
        .filter(log => log.skillId === skillId)
        .reduce((sum, log) => sum + Number(log.hours), 0);
}

function getTotalHours() {
    return logs.reduce((sum, log) => sum + Number(log.hours), 0);
}

function showToast(message) {
    const toast = $("#toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function emptyState(icon, title, message, buttonText = "") {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(message)}</p>
            ${buttonText
                ? `<button class="primary-button" data-action="add-skill">
                    ＋ ${escapeHTML(buttonText)}
                   </button>`
                : ""}
        </div>
    `;
}

// ==========================================
// NAVIGATION
// ==========================================

function showSection(sectionId) {
    const validSections = SECTIONS;

    if (!validSections.includes(sectionId)) {
        sectionId = "dashboard";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.toggle(
            "hidden",
            section.id !== sectionId
        );
    });

    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionId
        );
    });

    const titles = {
        dashboard: "Dashboard",
        explore: "Explore Skills",
        skills: "My Skills",
        learning: "Learning Log",
        analytics: "Analytics"
    };

    $("#pageTitle").textContent = titles[sectionId];

    try { history.replaceState(null, "", `#${sectionId}`); } catch (error) { /* ignore */ }

    if (sectionId === "explore") renderExplore();

    $("#sidebar").classList.remove("open");

    if (sectionId === "analytics") {
        requestAnimationFrame(renderAnalyticsCharts);
    }

    if (sectionId === "dashboard") {
        requestAnimationFrame(renderWeeklyChart);
    }
}

document.querySelectorAll(".nav-link[data-section]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showSection(link.dataset.section);
    });
});

$("#exploreSkillsButton").addEventListener("click", () => {
    showSection("explore");
});

$("#viewAllSkills").addEventListener("click", () => {
    showSection("skills");
});

$("#quickAnalytics").addEventListener("click", () => {
    showSection("analytics");
});

$("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
    const sidebar = $("#sidebar");

    if (
        window.innerWidth <= 950 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !$("#menuToggle").contains(event.target)
    ) {
        sidebar.classList.remove("open");
    }
});

// ==========================================
// SKILL MODAL
// ==========================================

function openSkillModal(skill = null) {
    $("#skillForm").reset();
    $("#editSkillId").value = "";

    $("#skillProgress").value = 0;
    $("#skillGoal").value = 30;

    $("#modalTitle").textContent = skill
        ? "Edit Skill"
        : "Add New Skill";

    if (skill) {
        $("#editSkillId").value = skill.id;
        $("#skillName").value = skill.name;
        $("#skillCategory").value = skill.category;
        $("#skillLevel").value = skill.level;
        $("#skillProgress").value = skill.progress;
        $("#skillGoal").value = skill.goal;
        $("#skillDeadline").value = skill.deadline || "";
    }

    updateProgressLabel();

    $("#skillModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setTimeout(() => $("#skillName").focus(), 50);
}

function closeSkillModal() {
    $("#skillModal").classList.add("hidden");
    document.body.style.overflow = "";
}

$("#headerAddButton").addEventListener("click", () => {
    openSkillModal();
});

$("#skillsAddButton").addEventListener("click", () => {
    openSkillModal();
});

$("#quickAddSkill").addEventListener("click", () => {
    openSkillModal();
});

$("#closeModal").addEventListener("click", closeSkillModal);
$("#cancelModal").addEventListener("click", closeSkillModal);

$("#skillModal").addEventListener("click", event => {
    if (event.target === $("#skillModal")) {
        closeSkillModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeSkillModal();
        $("#sidebar").classList.remove("open");
    }
});

// ==========================================
// ADD AND EDIT SKILLS
// ==========================================

$("#skillForm").addEventListener("submit", event => {
    event.preventDefault();

    const editId = $("#editSkillId").value;

    const name = $("#skillName").value.trim();
    const category = $("#skillCategory").value;
    const level = $("#skillLevel").value;
    const progress = Number($("#skillProgress").value);
    const goal = Number($("#skillGoal").value);
    const deadline = $("#skillDeadline").value;

    if (!name) {
        showToast("Please enter a skill name.");
        return;
    }

    if (
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 100
    ) {
        showToast("Progress must be between 0 and 100.");
        return;
    }

    if (!Number.isFinite(goal) || goal < 1 || goal > 1440) {
        showToast("Daily goal must be between 1 and 1440 minutes.");
        return;
    }

    const duplicate = skills.some(skill =>
        skill.name.toLowerCase() === name.toLowerCase() &&
        skill.id !== editId
    );

    if (duplicate) {
        showToast("This skill already exists.");
        return;
    }

    if (editId) {
        const skill = getSkillById(editId);

        if (!skill) {
            showToast("Skill not found.");
            return;
        }

        Object.assign(skill, {
            name,
            category,
            level,
            progress,
            goal,
            deadline
        });

        showToast("Skill updated successfully!");
    } else {
        skills.unshift({
            id: crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()) + Math.random().toString(16).slice(2),
            name,
            category,
            level,
            progress,
            goal,
            deadline,
            createdAt: Date.now()
        });

        showToast("New skill added successfully!");
    }

    saveData();
    closeSkillModal();
    renderAll();
});

function updateProgressLabel() {
    const label = $("#skillProgressValue");
    if (label) label.textContent = `${Number($("#skillProgress").value)}%`;
}

$("#skillProgress").addEventListener("input", updateProgressLabel);

// ==========================================
// RENDER SKILL CARDS
// ==========================================

function renderSkills() {
    const search = $("#skillSearch").value.trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const status = $("#statusFilter").value;

    const filteredSkills = skills.filter(skill => {
        const matchesSearch =
            skill.name.toLowerCase().includes(search) ||
            skill.category.toLowerCase().includes(search);

        const matchesCategory =
            category === "All" || skill.category === category;

        const matchesStatus =
            status === "All" || getStatus(skill) === status;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const container = $("#skillsGrid");

    if (!filteredSkills.length) {
        container.innerHTML = emptyState(
            "◈",
            skills.length ? "No matching skills" : "Start your learning journey",
            skills.length
                ? "Try changing your search or filters."
                : "Add your first skill and begin tracking your progress.",
            "Add Skill"
        );

        return;
    }

    container.innerHTML = filteredSkills.map(skill => {
        const index = skills.indexOf(skill);
        const color = getSkillColor(index);
        const status = getStatus(skill);
        const hours = getSkillHours(skill.id);

        return `
            <article class="skill-card">

                <div class="skill-card-top">
                    <div class="skill-card-icon"
                         style="background:${color}18;color:${color}">
                        ${escapeHTML(getSkillIcon(skill))}
                    </div>

                    <div class="card-menu">
                        <button class="icon-button"
                                data-action="edit"
                                data-id="${escapeHTML(skill.id)}"
                                aria-label="Edit ${escapeHTML(skill.name)}"
                                title="Edit skill">✎</button>

                        <button class="icon-button delete"
                                data-action="delete"
                                data-id="${escapeHTML(skill.id)}"
                                aria-label="Delete ${escapeHTML(skill.name)}"
                                title="Delete skill">×</button>
                    </div>
                </div>

                <h3>${escapeHTML(skill.name)}</h3>
                <p class="skill-category">${escapeHTML(skill.category)}</p>

                <div class="skill-status-row">
                    <span class="status-badge ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <span class="skill-level">
                        ${escapeHTML(skill.level)}
                    </span>
                </div>

                <div class="card-progress">
                    <div class="card-progress-label">
                        <span>Learning progress</span>
                        <output class="card-progress-value">${Number(skill.progress)}%</output>
                    </div>

                    <div class="progress-track"
                         role="progressbar"
                         aria-label="${escapeHTML(skill.name)} progress"
                         aria-valuemin="0"
                         aria-valuemax="100"
                         aria-valuenow="${Number(skill.progress)}">
                        <div class="progress-fill"
                             style="width:${Number(skill.progress)}%;background:${color}">
                        </div>
                    </div>

                    <input class="skill-progress-input"
                           type="range"
                           min="0"
                           max="100"
                           value="${Number(skill.progress)}"
                           data-action="progress"
                           data-id="${escapeHTML(skill.id)}"
                           aria-label="Update ${escapeHTML(skill.name)} progress">
                </div>

                <div class="skill-card-footer">
                    <span class="skill-deadline">
                        ◷ ${escapeHTML(skill.deadline
                            ? formatDate(skill.deadline)
                            : `${Number(skill.goal)} min/day`)}
                    </span>

                    <button class="update-button" data-action="log" data-id="${escapeHTML(skill.id)}">◷ Log time</button>

                </div>

                <p class="skill-category" style="margin-top:12px">
                    ${hours.toFixed(1)} learning hours recorded
                </p>

            </article>
        `;
    }).join("");
}

$("#skillSearch").addEventListener("input", renderSkills);
$("#categoryFilter").addEventListener("change", renderSkills);
$("#statusFilter").addEventListener("change", renderSkills);

// ==========================================
// SKILL CARD ACTIONS
// ==========================================

document.addEventListener("input", event => {
    const slider = event.target.closest(".skill-progress-input");

    if (!slider) return;

    const card = slider.closest(".skill-card");
    card.querySelector(".card-progress-value").textContent = `${slider.value}%`;
    card.querySelector(".progress-track").setAttribute("aria-valuenow", slider.value);
    card.querySelector(".progress-fill").style.width = `${slider.value}%`;
});

document.addEventListener("change", event => {
    const slider = event.target.closest(".skill-progress-input");

    if (!slider) return;

    const skill = getSkillById(slider.dataset.id);

    if (!skill) return;

    skill.progress = Number(slider.value);
    saveData();
    renderAll();

    const replacement = Array.from(document.querySelectorAll(".skill-progress-input"))
        .find(input => input.dataset.id === skill.id);

    replacement?.focus({ preventScroll: true });
    showToast(skill.progress === 100 ? `${skill.name} completed! Congratulations! 🎉` : "Progress updated!");
});

document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "add-skill") {
        openSkillModal();
        return;
    }

    if (action === "log") {
        showSection("learning");
        populateLogSkills();
        $("#logSkill").value = id;
        $("#logHours").focus();
        return;
    }

    if (action === "add-explore") {
        addFromCatalog(button.dataset.name);
        return;
    }

    if (action === "edit") {
        const skill = getSkillById(id);

        if (skill) openSkillModal(skill);

        return;
    }

    if (action === "delete") {
        const skill = getSkillById(id);

        if (!skill) return;

        const confirmed = confirm(
            `Delete "${skill.name}"? Its associated learning history will also be deleted.`
        );

        if (!confirmed) return;

        skills = skills.filter(item => item.id !== id);
        logs = logs.filter(log => log.skillId !== id);

        saveData();
        renderAll();
        showToast("Skill deleted.");
        return;
    }

});

// ==========================================
// DASHBOARD
// ==========================================

function renderDashboard() {
    const completed = skills.filter(
        skill => getStatus(skill) === "Completed"
    ).length;

    const inProgress = skills.filter(
        skill => getStatus(skill) === "In Progress"
    ).length;

    $("#totalSkills").textContent = skills.length;
    $("#completedSkills").textContent = completed;
    $("#inProgressSkills").textContent = inProgress;
    $("#totalHours").textContent = `${getTotalHours().toFixed(1)}h`;

    const container = $("#dashboardSkills");

    if (!skills.length) {
        container.innerHTML = emptyState(
            "🎯",
            "No skills yet",
            "Add a skill to start tracking your learning.",
            "Add Skill"
        );

        return;
    }

    container.innerHTML = skills.slice(0, 5).map((skill, index) => {
        const color = getSkillColor(index);

        return `
            <div>
                <div class="skill-progress-head">
                    <div class="skill-name-group">
                        <div class="skill-mini-icon"
                             style="background:${color}18;color:${color}">
                            ${escapeHTML(getSkillIcon(skill))}
                        </div>

                        <div>
                            <strong>${escapeHTML(skill.name)}</strong>
                            <small>${escapeHTML(skill.category)}</small>
                        </div>
                    </div>

                    <span class="progress-number">
                        ${Number(skill.progress)}%
                    </span>
                </div>

                <div class="progress-track">
                    <div class="progress-fill"
                         style="width:${Number(skill.progress)}%;background:${color}">
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// LEARNING LOG
// ==========================================

function populateLogSkills() {
    const select = $("#logSkill");
    const previous = select.value;

    if (!skills.length) {
        select.innerHTML = '<option value="">Add a skill first</option>';
        select.disabled = true;
        return;
    }

    select.disabled = false;

    select.innerHTML = skills.map(skill => `
        <option value="${escapeHTML(skill.id)}">
            ${escapeHTML(skill.name)}
        </option>
    `).join("");

    if (skills.some(skill => skill.id === previous)) {
        select.value = previous;
    }
}

$("#quickLogHours").addEventListener("click", () => {
    showSection("learning");
    $("#logSkill").focus();
});

$("#logDate").value = todayString();

$("#logForm").addEventListener("submit", event => {
    event.preventDefault();

    const skillId = $("#logSkill").value;
    const hours = Number($("#logHours").value);
    const topic = $("#logTopic").value.trim();
    const date = $("#logDate").value;

    if (!getSkillById(skillId)) {
        showToast("Please select a valid skill.");
        return;
    }

    if (!Number.isFinite(hours) || hours < 0.1 || hours > 24) {
        showToast("Hours must be between 0.1 and 24.");
        return;
    }

    if (!topic || !date) {
        showToast("Please enter a topic and date.");
        return;
    }

    if (date > todayString()) {
        showToast("Learning date cannot be in the future.");
        return;
    }

    logs.unshift({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(16).slice(2),
        skillId,
        hours,
        topic,
        date,
        createdAt: Date.now()
    });

    saveData();

    $("#logForm").reset();
    $("#logDate").value = todayString();

    populateLogSkills();
    renderAll();

    showToast("Learning session recorded!");
});

function renderLearningHistory() {
    const container = $("#learningHistory");

    if (!logs.length) {
        container.innerHTML = emptyState(
            "◷",
            "No learning sessions yet",
            "Record your first session to see your learning history."
        );

        return;
    }

    container.innerHTML = logs.map(log => {
        const skill = getSkillById(log.skillId);

        return `
            <div class="log-item">
                <div class="log-dot"></div>

                <div class="log-item-main">
                    <h4>${escapeHTML(log.topic)}</h4>

                    <p>
                        ${escapeHTML(skill ? skill.name : "Unknown skill")}
                        · ${escapeHTML(formatDate(log.date))}
                    </p>
                </div>

                <span class="log-hours">${Number(log.hours).toFixed(1)}h</span>

                <button class="icon-button delete log-delete"
                        data-log-delete="${escapeHTML(log.id)}"
                        aria-label="Delete learning session"
                        title="Delete session">×</button>
            </div>
        `;
    }).join("");
}

document.addEventListener("click", event => {
    const button = event.target.closest("[data-log-delete]");

    if (!button) return;

    const id = button.dataset.logDelete;

    if (!confirm("Delete this learning session?")) return;

    logs = logs.filter(log => log.id !== id);

    saveData();
    renderAll();

    showToast("Learning session deleted.");
});

// ==========================================
// CHARTS
// ==========================================

function chartDefaults() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 400
        },
        plugins: {
            legend: {
                labels: {
                    color: getComputedStyle(document.body)
                        .getPropertyValue("--muted").trim(),
                    usePointStyle: true,
                    padding: 18,
                    font: {
                        family: "Inter",
                        size: 11
                    }
                }
            }
        }
    };
}

function renderWeeklyChart() {
    const canvas = $("#weeklyChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (weeklyChart) weeklyChart.destroy();

    const dates = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();

        date.setDate(date.getDate() - i);

        const dateString = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        dates.push({
            key: dateString,
            label: date.toLocaleDateString("en-IN", {
                weekday: "short"
            })
        });
    }

    const values = dates.map(date => {
        return logs
            .filter(log => log.date === date.key)
            .reduce((sum, log) => sum + Number(log.hours), 0);
    });

    const defaults = chartDefaults();

    weeklyChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: dates.map(date => date.label),

            datasets: [{
                label: "Learning Hours",
                data: values,
                backgroundColor: "#8b5cf6",
                hoverBackgroundColor: "#6d28d9",
                borderRadius: 6,
                maxBarThickness: 35
            }]
        },

        options: {
            ...defaults,

            plugins: {
                ...defaults.plugins,
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: defaults.plugins.legend.labels.color
                    },
                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 1,
                        color: defaults.plugins.legend.labels.color
                    },
                    grid: {
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--border").trim()
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderAnalyticsCharts() {
    if (typeof Chart === "undefined") return;

    const defaults = chartDefaults();

    if (skillChart) skillChart.destroy();
    if (distributionChart) distributionChart.destroy();

    const progressCanvas = $("#skillChart");
    const distributionCanvas = $("#distributionChart");

    if (!progressCanvas || !distributionCanvas) return;

    const names = skills.map(skill => skill.name);
    const progress = skills.map(skill => Number(skill.progress));
    const hours = skills.map(skill => getSkillHours(skill.id));

    const colors = skills.map((_, index) => getSkillColor(index));

    skillChart = new Chart(progressCanvas, {
        type: "bar",

        data: {
            labels: names,

            datasets: [{
                label: "Progress (%)",
                data: progress,
                backgroundColor: colors,
                borderRadius: 5,
                maxBarThickness: 35
            }]
        },

        options: {
            ...defaults,

            indexAxis: "y",

            plugins: {
                ...defaults.plugins,
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: defaults.plugins.legend.labels.color
                    },
                    grid: {
                        color: getComputedStyle(document.body)
                            .getPropertyValue("--border").trim()
                    }
                },

                y: {
                    ticks: {
                        color: defaults.plugins.legend.labels.color
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    distributionChart = new Chart(distributionCanvas, {
        type: "doughnut",

        data: {
            labels: names,

            datasets: [{
                data: hours.map(value => value > 0 ? value : 0),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: getComputedStyle(document.body)
                    .getPropertyValue("--card").trim(),
                hoverOffset: 5
            }]
        },

        options: {
            ...defaults,

            cutout: "68%",

            plugins: {
                ...defaults.plugins,
                legend: {
                    position: "bottom",
                    labels: defaults.plugins.legend.labels
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${Number(context.raw).toFixed(1)} hours`;
                        }
                    }
                }
            }
        }
    });

}

function renderAnalyticsStats() {
    const overall = skills.length
        ? Math.round(skills.reduce((sum, skill) => sum + Number(skill.progress), 0) / skills.length)
        : 0;

    const days = new Set(logs.map(log => log.date));

    // streak: consecutive days ending today (or yesterday if nothing logged yet today)
    let streak = 0;
    let offset = days.has(dateOffset(0)) ? 0 : 1;
    while (days.has(dateOffset(offset))) { streak++; offset++; }

    $("#overallProgress").textContent = `${overall}%`;
    $("#totalSessions").textContent = logs.length;
    $("#learningDays").textContent = days.size;
    $("#learningStreak").textContent = streak;
}

// ==========================================
// DARK MODE
// ==========================================

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);

    $("#themeIcon").textContent = isDark ? "☀" : "☾";
    $("#themeText").textContent = isDark ? "Light Mode" : "Dark Mode";
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";

    try { localStorage.setItem(THEME_KEY, newTheme); } catch (error) { /* ignore */ }

    applyTheme(newTheme);

    renderWeeklyChart();

    if (!$("#analytics").classList.contains("hidden")) {
        renderAnalyticsCharts();
    }
}

$("#themeToggle").addEventListener("click", toggleTheme);

// ==========================================
// EXPLORE SKILLS
// ==========================================

const CATALOG = [
    ["Python", "Programming", "Beginner", "Automation, scripting, data analysis and backend basics."],
    ["Java", "Programming", "Beginner", "Object-oriented programming for apps, Android and enterprise."],
    ["C++", "Programming", "Intermediate", "Fast, low-level programming for systems and competitive coding."],
    ["Data Structures", "Programming", "Intermediate", "Arrays, trees, graphs and algorithms for interviews and efficient code."],
    ["Git & GitHub", "Programming", "Beginner", "Version control, branches, pull requests and collaboration."],
    ["HTML", "Web Development", "Beginner", "Structure web pages with semantic, accessible markup."],
    ["CSS", "Web Development", "Beginner", "Layouts, Flexbox, Grid, animations and responsive design."],
    ["JavaScript", "Web Development", "Beginner", "Make websites interactive: DOM, events, async code and APIs."],
    ["React", "Web Development", "Intermediate", "Build component-based user interfaces with hooks and state."],
    ["Node.js", "Web Development", "Intermediate", "Run JavaScript on the server and build REST APIs."],
    ["SQL", "Database", "Beginner", "Query, join and aggregate data in relational databases."],
    ["MongoDB", "Database", "Intermediate", "Document-oriented NoSQL database for flexible data models."],
    ["PostgreSQL", "Database", "Intermediate", "Advanced relational database features, indexing and performance."],
    ["Database Design", "Database", "Intermediate", "ER modelling, normalization and schema planning."],
    ["UI/UX Design", "Design", "Beginner", "User research, wireframes and usable, friendly interfaces."],
    ["Figma", "Design", "Beginner", "Design screens, prototypes and design systems collaboratively."],
    ["Graphic Design", "Design", "Beginner", "Typography, colour theory and layout for visual communication."],
    ["Communication", "Other", "Beginner", "Express ideas clearly in writing and conversation."],
    ["Public Speaking", "Other", "Beginner", "Present with confidence and structure talks that land."],
    ["Time Management", "Other", "Beginner", "Plan, prioritise and build a consistent study routine."],
    ["Problem Solving", "Other", "Intermediate", "Break down problems and think logically under pressure."]
].map(([name, category, level, description]) => ({ name, category, level, description }));

function renderExplore() {
    const search = $("#exploreSearch").value.trim().toLowerCase();
    const category = $("#exploreCategory").value;

    const items = CATALOG.filter(item =>
        (category === "All" || item.category === category) &&
        (item.name + " " + item.category + " " + item.description).toLowerCase().includes(search)
    );

    const container = $("#exploreGrid");

    if (!items.length) {
        container.innerHTML = emptyState("⌕", "No skills found", "Try a different search or category.");
        return;
    }

    container.innerHTML = items.map((item, index) => {
        const color = getSkillColor(CATALOG.indexOf(item));
        const added = skills.some(skill => skill.name.toLowerCase() === item.name.toLowerCase());

        return `
            <article class="skill-card">
                <div class="skill-card-top">
                    <div class="skill-card-icon" style="background:${color}18;color:${color}">
                        ${escapeHTML(getSkillIcon(item))}
                    </div>
                    <span class="status-badge progress">${escapeHTML(item.level)}</span>
                </div>
                <h3>${escapeHTML(item.name)}</h3>
                <p class="skill-category">${escapeHTML(item.category)}</p>
                <p class="explore-desc">${escapeHTML(item.description)}</p>
                <button class="update-button explore-add" data-action="add-explore"
                        data-name="${escapeHTML(item.name)}" ${added ? "disabled" : ""}>
                    ${added ? "✓ In My Skills" : "＋ Add to My Skills"}
                </button>
            </article>
        `;
    }).join("");
}

function addFromCatalog(name) {
    const item = CATALOG.find(entry => entry.name === name);

    if (!item || skills.some(skill => skill.name.toLowerCase() === name.toLowerCase())) return;

    skills.unshift({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(16).slice(2),
        name: item.name,
        category: item.category,
        level: item.level,
        progress: 0,
        goal: 30,
        deadline: "",
        createdAt: Date.now()
    });

    saveData();
    renderAll();
    showToast(`${item.name} added to My Skills!`);
}

$("#exploreSearch").addEventListener("input", renderExplore);
$("#exploreCategory").addEventListener("change", renderExplore);

// ==========================================
// UPDATE EVERYTHING
// ==========================================

function renderAll() {
    renderDashboard();
    renderSkills();
    populateLogSkills();
    renderLearningHistory();

    renderAnalyticsStats();
    renderExplore();

    renderWeeklyChart();

    if (!$("#analytics").classList.contains("hidden")) {
        renderAnalyticsCharts();
    }
}

// ==========================================
// INITIALIZE
// ==========================================

function initialize() {
    loadData();

    $("#currentDate").textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

    $("#footerYear").textContent = new Date().getFullYear();

    let savedTheme = null;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch (error) { /* ignore */ }

    applyTheme(savedTheme || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

    renderAll();

    if (typeof Chart === "undefined") {
        showToast("Charts could not load. Check your internet connection.");
    }

    const initialSection = location.hash.replace("#", "");

    showSection(
        SECTIONS.includes(initialSection)
            ? initialSection
            : "dashboard"
    );
}

initialize();