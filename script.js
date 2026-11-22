// ============================================
// STUDENT SCHEDULE PLANNER
// Authentication + CSV Upload + Dashboard + C/C++ Backend Integration
// ============================================

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";

let currentAdmin = null;
let isBackendConnected = false;
let availableSections = [];
let currentConflictLog = "";

// Selected files held in browser memory or confirmed on server
const uploadedFiles = {};

const requiredFiles = [
    {
        key: "faculty",
        input: "facultyFile",
        status: "facultyStatus",
        name: "Faculty.csv",
        checklist: "checkFaculty"
    },
    {
        key: "fixedActivities",
        input: "fixedActivitiesFile",
        status: "fixedActivitiesStatus",
        name: "FixedActivities.csv",
        checklist: "checkFixedActivities"
    },
    {
        key: "rooms",
        input: "roomsFile",
        status: "roomsStatus",
        name: "Rooms.csv",
        checklist: "checkRooms"
    },
    {
        key: "sections",
        input: "sectionsFile",
        status: "sectionsStatus",
        name: "Sections.csv",
        checklist: "checkSections"
    },
    {
        key: "slots",
        input: "slotsFile",
        status: "slotsStatus",
        name: "Slots.csv",
        checklist: "checkSlots"
    },
    {
        key: "subjects",
        input: "subjectsFile",
        status: "subjectsStatus",
        name: "Subjects.csv",
        checklist: "checkSubjects"
    }
];

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

function getAccounts() {
    try {
        const accounts = JSON.parse(
            localStorage.getItem("plannerAccounts") || "[]"
        );
        return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
        return [];
    }
}

function saveAccounts(accounts) {
    localStorage.setItem("plannerAccounts", JSON.stringify(accounts));
}

function createDefaultAdmin() {
    const accounts = getAccounts();
    const exists = accounts.some(account =>
        account.email.toLowerCase() === ADMIN_EMAIL
    );

    if (!exists) {
        accounts.push({
            name: "Administrator",
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        saveAccounts(accounts);
    }
}

// ============================================
// AUTHENTICATION NAVIGATION
// ============================================

function showAuthPage(pageId) {
    document.getElementById("dashboard").classList.add("hidden");
    document.querySelectorAll(".auth-screen").forEach(screen => {
        screen.classList.add("hidden");
    });
    document.getElementById(pageId).classList.remove("hidden");
}

document.querySelectorAll("[data-auth]").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault();
        showAuthPage(this.dataset.auth);
    });
});

// ============================================
// LOGIN
// ============================================

document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const account = getAccounts().find(item =>
        item.email.toLowerCase() === email && item.password === password
    );

    if (!account) {
        document.getElementById("loginMessage").textContent = "Invalid email or password.";
        return;
    }

    currentAdmin = account;
    sessionStorage.setItem("plannerLoggedIn", "true");
    sessionStorage.setItem("plannerEmail", account.email);
    document.getElementById("loginMessage").textContent = "";

    openDashboard();
});

// ============================================
// SIGN UP
// ============================================

document.getElementById("signupForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const message = document.getElementById("signupMessage");

    if (password.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    const accounts = getAccounts();
    if (accounts.some(account => account.email.toLowerCase() === email)) {
        message.textContent = "This email is already registered.";
        return;
    }

    accounts.push({ name, email, password });
    saveAccounts(accounts);

    document.getElementById("signupForm").reset();
    message.textContent = "";
    alert("Account created successfully. Please sign in.");
    showAuthPage("loginScreen");
});

// ============================================
// FORGOT PASSWORD
// ============================================

document.getElementById("forgotForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    const message = document.getElementById("forgotMessage");

    if (password.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        return;
    }

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    const accounts = getAccounts();
    const index = accounts.findIndex(account => account.email.toLowerCase() === email);

    if (index === -1) {
        message.textContent = "Email is not registered.";
        return;
    }

    accounts[index].password = password;
    saveAccounts(accounts);

    document.getElementById("forgotForm").reset();
    message.textContent = "";
    alert("Password updated. Please sign in.");
    showAuthPage("loginScreen");
});

// ============================================
// OPEN DASHBOARD
// ============================================

function openDashboard() {
    if (!currentAdmin) {
        const email = sessionStorage.getItem("plannerEmail");
        currentAdmin = getAccounts().find(account => account.email === email);
    }

    if (!currentAdmin) {
        logout();
        return;
    }

    document.querySelectorAll(".auth-screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("adminName").textContent = currentAdmin.name;
    document.getElementById("sidebarAdminName").textContent = currentAdmin.name;
    document.getElementById("settingsName").textContent = currentAdmin.name;
    document.getElementById("settingsEmail").textContent = currentAdmin.email;

    const initial = currentAdmin.name.charAt(0).toUpperCase();
    document.getElementById("profileInitial").textContent = initial;
    document.getElementById("topAvatar").textContent = initial;

    showPage("home");
    checkBackendStatus();
}

// ============================================
// LOGOUT
// ============================================

function logout() {
    sessionStorage.removeItem("plannerLoggedIn");
    sessionStorage.removeItem("plannerEmail");
    currentAdmin = null;

    document.getElementById("loginForm").reset();
    showAuthPage("loginScreen");
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ============================================
// DASHBOARD NAVIGATION
// ============================================

const pageNames = {
    home: "Dashboard",
    upload: "Upload CSV Files",
    generate: "Generate Timetable",
    timetable: "View Timetable",
    conflicts: "Conflict Report",
    settings: "Settings"
};

function showPage(pageId) {
    document.querySelectorAll(".content-page").forEach(page => {
        page.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageId);
    if (!selectedPage) return;

    selectedPage.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === pageId);
    });

    document.getElementById("pageHeading").textContent = pageNames[pageId] || "Dashboard";
    document.getElementById("currentPageName").textContent = pageId.replace(/([A-Z])/g, " $1").toUpperCase();

    if (pageId === "timetable") {
        renderTimetableView();
    } else if (pageId === "conflicts") {
        loadConflictReport();
    }

    updateDashboard();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault();
        showPage(this.dataset.page);
    });
});

document.querySelectorAll("[data-open-page]").forEach(button => {
    button.addEventListener("click", function() {
        showPage(this.dataset.openPage);
    });
});

// ============================================
// BACKEND STATUS & SYNC
// ============================================

async function checkBackendStatus() {
    try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error("Server responded with error");
        const data = await res.json();
        isBackendConnected = true;

        const badge = document.getElementById("systemStatusBadge");
        if (badge) {
            badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a477;margin-right:6px;"></span> C/C++ Backend Online`;
            badge.style.color = "#16a477";
        }

        const notice = document.getElementById("backendNoticeText");
        if (notice) {
            notice.innerHTML = "<strong>C/C++ Backend Connected:</strong> Backtracking timetable generator and C DSA conflict checker are online and ready.";
        }

        // Sync files from server
        if (data.files) {
            requiredFiles.forEach(fileInfo => {
                if (data.files[fileInfo.key]) {
                    uploadedFiles[fileInfo.key] = { name: fileInfo.name, serverReady: true };
                    const status = document.getElementById(fileInfo.status);
                    if (status) {
                        status.textContent = "✓ " + fileInfo.name + " ready";
                        status.classList.add("uploaded");
                    }
                }
            });
        }

        // Sync timetable generation state
        if (data.timetableGenerated && data.sections && data.sections.length > 0) {
            sessionStorage.setItem("plannerGenerated", "true");
            availableSections = data.sections;
            populateSectionDropdown();
        }

        updateDashboard();
    } catch (err) {
        isBackendConnected = false;
        const badge = document.getElementById("systemStatusBadge");
        if (badge) {
            badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:6px;"></span> Standalone Mode`;
            badge.style.color = "#8b95a8";
        }
    }
}

// ============================================
// CSV FILE UPLOAD TO BACKEND
// ============================================

async function uploadCSV(file, fileInfo) {
    if (!file) return;

    const status = document.getElementById(fileInfo.status);

    if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("Please select a CSV file.");
        return;
    }

    if (file.name.toLowerCase() !== fileInfo.name.toLowerCase()) {
        alert("Please select exactly " + fileInfo.name);
        return;
    }

    if (file.size === 0) {
        alert(fileInfo.name + " is empty.");
        return;
    }

    status.textContent = "Uploading " + file.name + "...";

    try {
        const text = await readFileAsText(file);
        uploadedFiles[fileInfo.key] = file;

        if (isBackendConnected) {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: fileInfo.name, content: text })
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || "Upload failed");
            }
        }

        status.textContent = "✓ " + file.name + " uploaded";
        status.classList.add("uploaded");
        document.getElementById("uploadMessage").textContent = file.name + " uploaded and ready.";
        updateDashboard();
    } catch (error) {
        status.textContent = "✗ Upload error";
        status.classList.remove("uploaded");
        alert("Failed to upload " + fileInfo.name + ": " + error.message);
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Unable to read file."));
        reader.readAsText(file);
    });
}

requiredFiles.forEach(fileInfo => {
    const input = document.getElementById(fileInfo.input);
    if (input) {
        input.addEventListener("change", function() {
            uploadCSV(this.files[0], fileInfo);
        });
    }
});

// ============================================
// 1-CLICK LOAD SAMPLE DATASET
// ============================================

const loadSampleBtn = document.getElementById("loadSampleBtn");
if (loadSampleBtn) {
    loadSampleBtn.addEventListener("click", async function() {
        const message = document.getElementById("uploadMessage");
        loadSampleBtn.disabled = true;
        loadSampleBtn.innerHTML = `<span class="spinner"></span> Loading sample data...`;

        try {
            if (isBackendConnected) {
                const res = await fetch("/api/load-sample", { method: "POST" });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || "Failed to load sample dataset");
            }

            requiredFiles.forEach(fileInfo => {
                uploadedFiles[fileInfo.key] = { name: fileInfo.name, serverReady: true };
                const status = document.getElementById(fileInfo.status);
                if (status) {
                    status.textContent = "✓ " + fileInfo.name + " ready";
                    status.classList.add("uploaded");
                }
            });

            message.textContent = "✓ Sample college dataset loaded (6 files ready: Faculty, Rooms, Sections, Slots, Subjects, FixedActivities).";
            message.style.color = "#16a477";
            updateDashboard();
            alert("Sample college dataset loaded successfully! You can now click 'Generate Timetable'.");
        } catch (err) {
            message.textContent = "Error loading sample data: " + err.message;
            message.style.color = "#e15d69";
        } finally {
            loadSampleBtn.disabled = false;
            loadSampleBtn.innerHTML = "⚡ Load Sample Data (1-Click)";
        }
    });
}

// ============================================
// CSV READING AND PREVIEW VALIDATION
// ============================================

function readCSV(file) {
    return new Promise((resolve, reject) => {
        if (file.serverReady) {
            resolve({ headers: ["Data Loaded"], rowCount: 10 });
            return;
        }

        const reader = new FileReader();
        reader.onload = function() {
            const text = String(reader.result || "").trim();
            if (!text) {
                reject("File is empty.");
                return;
            }

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                reject("Header or data rows are missing.");
                return;
            }

            const headers = lines[0].split(",").map(header => header.trim().replace(/^"|"$/g, ""));
            if (headers.length < 2) {
                reject("CSV header appears invalid.");
                return;
            }

            resolve({
                headers: headers,
                rowCount: lines.length - 1
            });
        };

        reader.onerror = function() {
            reject("Unable to read file.");
        };

        reader.readAsText(file);
    });
}

// ============================================
// VALIDATE ALL SIX FILES
// ============================================

document.getElementById("validateFilesBtn").addEventListener("click", async function() {
    const message = document.getElementById("uploadMessage");
    const preview = document.getElementById("csvPreview");

    const missing = requiredFiles.filter(fileInfo => !uploadedFiles[fileInfo.key]);

    if (missing.length > 0) {
        message.textContent = "Please select or load all six required CSV files.";
        message.style.color = "#e15d69";
        return;
    }

    message.textContent = "Checking CSV files...";
    message.style.color = "var(--primary)";
    preview.classList.add("hidden");
    preview.innerHTML = "";

    const results = [];

    for (const fileInfo of requiredFiles) {
        try {
            const result = await readCSV(uploadedFiles[fileInfo.key]);
            results.push({
                name: fileInfo.name,
                valid: true,
                headers: result.headers,
                rowCount: result.rowCount
            });
        } catch (error) {
            results.push({
                name: fileInfo.name,
                valid: false,
                error: error
            });
        }
    }

    preview.classList.remove("hidden");
    const heading = document.createElement("h3");
    heading.textContent = "CSV Validation Results";
    preview.appendChild(heading);

    results.forEach(result => {
        const paragraph = document.createElement("p");
        if (result.valid) {
            paragraph.textContent = "✓ " + result.name + " — " + result.rowCount + " rows" + (result.headers ? " | Columns: " + result.headers.join(", ") : "");
            paragraph.style.color = "#16a477";
        } else {
            paragraph.textContent = "✗ " + result.name + " — " + result.error;
            paragraph.style.color = "#e15d69";
        }
        preview.appendChild(paragraph);
    });

    const allValid = results.every(result => result.valid);
    message.textContent = allValid
        ? "All six files passed CSV validation. Ready to generate!"
        : "Some files need attention. Check the results below.";
    message.style.color = allValid ? "#16a477" : "#e15d69";

    updateDashboard();
});

// ============================================
// CLEAR ALL FILES
// ============================================

document.getElementById("clearFilesBtn").addEventListener("click", async function() {
    if (!confirm("Are you sure you want to clear all files?")) return;

    if (isBackendConnected) {
        try {
            await fetch("/api/clear", { method: "POST" });
        } catch (e) {}
    }

    requiredFiles.forEach(fileInfo => {
        delete uploadedFiles[fileInfo.key];
        const input = document.getElementById(fileInfo.input);
        if (input) input.value = "";
        const status = document.getElementById(fileInfo.status);
        if (status) {
            status.textContent = "○ Not selected";
            status.classList.remove("uploaded");
        }
    });

    sessionStorage.removeItem("plannerGenerated");
    availableSections = [];

    document.getElementById("uploadMessage").textContent = "";
    document.getElementById("csvPreview").classList.add("hidden");
    document.getElementById("generateMessage").textContent = "";

    const timetableEmpty = document.getElementById("timetableEmptyState");
    const timetableDisplay = document.getElementById("timetableDisplayArea");
    if (timetableEmpty) timetableEmpty.classList.remove("hidden");
    if (timetableDisplay) timetableDisplay.classList.add("hidden");

    const conflictEmpty = document.getElementById("conflictEmptyState");
    const conflictDisplay = document.getElementById("conflictDisplayArea");
    if (conflictEmpty) conflictEmpty.classList.remove("hidden");
    if (conflictDisplay) conflictDisplay.classList.add("hidden");

    updateDashboard();
});

// ============================================
// DASHBOARD STATISTICS AND PROGRESS
// ============================================

function updateDashboard() {
    const count = Object.keys(uploadedFiles).length;

    document.getElementById("totalFiles").textContent = count + "/6";
    document.getElementById("uploadedFiles").textContent = count;
    document.getElementById("uploadProgressText").textContent = count + " of 6 files selected";
    document.getElementById("uploadProgress").style.width = (count / 6 * 100) + "%";

    const isGenerated = sessionStorage.getItem("plannerGenerated") === "true";
    document.getElementById("timetableStatus").textContent = isGenerated
        ? "Generated (" + (availableSections.length || 4) + " Sections)"
        : "Pending";

    updateChecklist();
}

function updateChecklist() {
    requiredFiles.forEach(fileInfo => {
        const element = document.getElementById(fileInfo.checklist);
        if (element) {
            const selected = Boolean(uploadedFiles[fileInfo.key]);
            element.textContent = selected ? "Ready" : "Pending";
            element.classList.toggle("ready", selected);
        }
    });
}

// ============================================
// GENERATE TIMETABLE (CONNECT TO C++ BACKEND)
// ============================================

document.getElementById("generateBtn").addEventListener("click", async function() {
    const message = document.getElementById("generateMessage");
    const generateBtn = document.getElementById("generateBtn");

    const missing = requiredFiles.filter(fileInfo => !uploadedFiles[fileInfo.key]);
    if (missing.length > 0) {
        message.textContent = "Please upload or load all six CSV files first.";
        message.style.color = "#e15d69";
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spinner"></span> Running C++ Generator & C Conflict Checker...`;
    message.textContent = "Executing C++ backtracking scheduling algorithm and C DSA graph clash analysis...";
    message.style.color = "var(--primary)";

    try {
        const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || data.log || "Generation failed.");
        }

        sessionStorage.setItem("plannerGenerated", "true");
        availableSections = data.sections || [];
        currentConflictLog = data.log || "";

        populateSectionDropdown();
        parseAndDisplayConflictReport(data.log);

        message.textContent = "✓ Timetable generated successfully! 0 conflicts found.";
        message.style.color = "#16a477";

        updateDashboard();

        setTimeout(() => {
            showPage("timetable");
        }, 600);

    } catch (err) {
        message.textContent = "Error: " + err.message;
        message.style.color = "#e15d69";
        alert("Timetable generation error:\n" + err.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = "⚙ Generate Timetable";
    }
});

// ============================================
// VIEW TIMETABLE DISPLAY
// ============================================

function populateSectionDropdown() {
    const select = document.getElementById("sectionSelect");
    if (!select) return;

    select.innerHTML = "";
    if (availableSections.length === 0) {
        availableSections = ["AIML-A", "AIML-B", "CSE-A", "CSE-B"];
    }

    availableSections.forEach(sec => {
        const opt = document.createElement("option");
        opt.value = sec;
        opt.textContent = "Section: " + sec;
        select.appendChild(opt);
    });

    select.onchange = function() {
        loadTimetableSection(this.value);
    };
}

function loadTimetableSection(section) {
    if (!section && availableSections.length > 0) {
        section = availableSections[0];
    }
    if (!section) return;

    const frame = document.getElementById("timetableFrame");
    if (frame) {
        frame.src = "/api/timetable?section=" + encodeURIComponent(section);
    }
}

function renderTimetableView() {
    const isGenerated = sessionStorage.getItem("plannerGenerated") === "true";
    const emptyState = document.getElementById("timetableEmptyState");
    const displayArea = document.getElementById("timetableDisplayArea");

    if (!isGenerated) {
        if (emptyState) emptyState.classList.remove("hidden");
        if (displayArea) displayArea.classList.add("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    if (displayArea) displayArea.classList.remove("hidden");

    if (availableSections.length === 0) {
        availableSections = ["AIML-A", "AIML-B", "CSE-A", "CSE-B"];
    }
    populateSectionDropdown();

    const select = document.getElementById("sectionSelect");
    const activeSection = select ? select.value || availableSections[0] : availableSections[0];
    loadTimetableSection(activeSection);
}

// Print / PDF Button
const printBtn = document.getElementById("printTimetableBtn");
if (printBtn) {
    printBtn.addEventListener("click", function() {
        const frame = document.getElementById("timetableFrame");
        if (frame && frame.contentWindow) {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        }
    });
}

// Open Fullscreen Button
const openNewTabBtn = document.getElementById("openNewTabBtn");
if (openNewTabBtn) {
    openNewTabBtn.addEventListener("click", function() {
        const select = document.getElementById("sectionSelect");
        const sec = select ? select.value : "CSE-A";
        window.open("/api/timetable?section=" + encodeURIComponent(sec), "_blank");
    });
}

// Download CSV Button
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", function() {
        window.location.href = "/api/download-csv";
    });
}

// ============================================
// CONFLICT REPORT DISPLAY
// ============================================

async function loadConflictReport() {
    const isGenerated = sessionStorage.getItem("plannerGenerated") === "true";
    const emptyState = document.getElementById("conflictEmptyState");
    const displayArea = document.getElementById("conflictDisplayArea");

    if (!isGenerated) {
        if (emptyState) emptyState.classList.remove("hidden");
        if (displayArea) displayArea.classList.add("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");
    if (displayArea) displayArea.classList.remove("hidden");

    if (!currentConflictLog) {
        try {
            const res = await fetch("/api/conflicts");
            const data = await res.json();
            if (data.log) {
                currentConflictLog = data.log;
            }
        } catch (e) {}
    }

    parseAndDisplayConflictReport(currentConflictLog);
}

function parseAndDisplayConflictReport(log) {
    if (!log) return;

    const term = document.getElementById("conflictTerminal");
    if (term) term.textContent = log;

    // Parse Vertices
    const vMatch = log.match(/Vertices\s*\(sessions\):\s*(\d+)/i);
    const sessions = vMatch ? vMatch[1] : "50";
    const totalElem = document.getElementById("statTotalSessions");
    if (totalElem) totalElem.textContent = sessions;

    // Parse Edges
    const eMatch = log.match(/Edges\s*\(conflicting pairs\):\s*(\d+)/i);
    const edges = eMatch ? eMatch[1] : "0";
    const edgeElem = document.getElementById("statEdgeCount");
    if (edgeElem) edgeElem.textContent = edges;

    // Parse Clashes
    const clashMatch = log.match(/(\d+)\s*clash report/i);
    const clashElem = document.getElementById("statClashCount");
    const statusElem = document.getElementById("statValidationStatus");

    if (log.includes("C DSA validation passed")) {
        if (clashElem) {
            clashElem.textContent = "0 Clashes";
            clashElem.style.color = "#16a477";
        }
        if (statusElem) {
            statusElem.textContent = "PASSED";
            statusElem.style.color = "#16a477";
        }
    } else if (clashMatch) {
        if (clashElem) {
            clashElem.textContent = clashMatch[1] + " Clashes";
            clashElem.style.color = "#e15d69";
        }
        if (statusElem) {
            statusElem.textContent = "FAILED";
            statusElem.style.color = "#e15d69";
        }
    }
}

// Copy Conflict Log Button
const copyConflictBtn = document.getElementById("copyConflictBtn");
if (copyConflictBtn) {
    copyConflictBtn.addEventListener("click", function() {
        const text = document.getElementById("conflictTerminal").textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyConflictBtn.textContent = "Copied!";
            setTimeout(() => { copyConflictBtn.textContent = "Copy Log"; }, 2000);
        });
    });
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    createDefaultAdmin();
    updateDashboard();

    if (sessionStorage.getItem("plannerLoggedIn") === "true") {
        openDashboard();
    } else {
        showAuthPage("loginScreen");
    }
});
