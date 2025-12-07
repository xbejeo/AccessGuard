// admin-app.js — админ-панель с авторизацией по email/паролю

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyCsAF-g-y3935ld0AmoK66m2PKJ4ZyAsqk",
  authDomain: "accss-42356.firebaseapp.com",
  projectId: "accss-42356",
  storageBucket: "accss-42356.appspot.com",
  messagingSenderId: "937805840020",
  appId: "1:937805840020:web:12e480e6dc8ee544aa3e81",
  measurementId: "G-G502120M58",
};

/* INIT */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// запоминаем сессию в localStorage
setPersistence(auth, browserLocalPersistence).catch(console.error);

/* DOM */
const authSection = document.getElementById("auth-section");
const adminSection = document.getElementById("admin-section");

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const tableContainer = document.getElementById("table-container");
const searchInput = document.getElementById("search-input");
const filterFieldSelect = document.getElementById("filter-field");
const filterValueInput = document.getElementById("filter-value");
const clearFiltersBtn = document.getElementById("clear-filters");
const toastContainer = document.getElementById("toast-container");

/* STATE */
let currentCollection = null;
let currentRows = [];
let currentHeaders = [];
let currentSort = { field: null, direction: "asc" };

/* TOASTS */
function showToast(message, type = "success") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${
    type === "error" ? "toast-error" : "toast-success"
  }`;
  toast.innerHTML = `
    <div class="toast-icon">${type === "error" ? "⚠️" : "✅"}</div>
    <div>${message}</div>
    <button class="toast-close">×</button>
  `;
  toast.querySelector(".toast-close").onclick = () => toast.remove();
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ======================
   AUTH
   ====================== */

async function handleLogin() {
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!email || !password) {
    showToast("Введите email и пароль", "error");
    return;
  }

  try {
    if (loginBtn) loginBtn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
    // дальше сработает onAuthStateChanged
  } catch (e) {
    console.error(e);
    showToast("Неверный email или пароль", "error");
  } finally {
    if (loginBtn) loginBtn.disabled = false;
  }
}

// форма логина
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleLogin();
  });
}
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await handleLogin();
  });
}

// выход
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showToast("Вы вышли", "success");
      // onAuthStateChanged сам покажет форму логина
    } catch (e) {
      console.error(e);
      showToast("Ошибка выхода", "error");
    }
  });
}

// главный переключатель экранов
onAuthStateChanged(auth, (user) => {
  console.log("AUTH STATE:", user);

  if (user) {
    // пользователь залогинен → показываем админку
    if (authSection) authSection.classList.add("hidden");
    if (adminSection) adminSection.classList.remove("hidden");

    // грузим данные только после входа
    loadCollection("users");
  } else {
    // не залогинен → показываем только форму входа
    if (adminSection) adminSection.classList.add("hidden");
    if (authSection) authSection.classList.remove("hidden");

    // очищаем таблицу
    if (tableContainer) tableContainer.innerHTML = "";
  }
});

/* ======================
   TABLE LOGIC
   ====================== */

window.loadCollection = async function (name) {
  try {
    currentCollection = name;

    // подсветка активного таба
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.col === name);
    });

    const snap = await getDocs(collection(db, name));
    const rows = [];
    const headerSet = new Set(["id"]);

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      rows.push({ id: docSnap.id, ...data });
      Object.keys(data).forEach((k) => headerSet.add(k));
    });

    currentRows = rows;
    currentHeaders = [...headerSet];

    buildFilterFieldOptions();
    currentSort = { field: null, direction: "asc" };
    renderTable();
  } catch (e) {
    console.error(e);
    showToast("Ошибка загрузки данных", "error");
  }
};

function buildFilterFieldOptions() {
  if (!filterFieldSelect) return;
  filterFieldSelect.innerHTML = `<option value="">Поле фильтра</option>`;
  currentHeaders.forEach((h) => {
    filterFieldSelect.innerHTML += `<option value="${h}">${h}</option>`;
  });
}

/* ---------- форматирование ячеек ---------- */
function formatCellValue(value) {
  if (value === null || value === undefined) return "";

  // Firestore Timestamp → дата
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("ru-RU");
  }

  return value;
}

// значение для сортировки
function sortValue(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().getTime(); // number
  }
  if (typeof value === "number") return value;
  return String(value ?? "");
}

function renderTable() {
  let rows = [...currentRows];

  const search = (searchInput?.value || "").toLowerCase();
  const filterField = filterFieldSelect?.value || "";
  const filterValue = (filterValueInput?.value || "").toLowerCase();

  // поиск
  if (search) {
    rows = rows.filter((row) =>
      currentHeaders.some((h) =>
        String(formatCellValue(row[h])).toLowerCase().includes(search)
      )
    );
  }

  // фильтр
  if (filterField && filterValue) {
    rows = rows.filter((row) =>
      String(formatCellValue(row[filterField]))
        .toLowerCase()
        .includes(filterValue)
    );
  }

  // сортировка
  if (currentSort.field) {
    const { field, direction } = currentSort;
    rows.sort((a, b) => {
      const av = sortValue(a[field]);
      const bv = sortValue(b[field]);

      if (av === bv) return 0;
      if (direction === "asc") {
        return av > bv ? 1 : -1;
      }
      return av < bv ? 1 : -1;
    });
  }

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            ${currentHeaders
              .map((h) => {
                const isSorted = currentSort.field === h;
                const arrow = isSorted
                  ? currentSort.direction === "asc"
                    ? "▲"
                    : "▼"
                  : "";
                return `<th class="sortable" data-field="${h}">
                  ${h}<span class="sort-arrow">${arrow}</span>
                </th>`;
              })
              .join("")}
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach((row) => {
    html += `<tr data-id="${row.id}">`;
    currentHeaders.forEach((h) => {
      const value = formatCellValue(row[h]);
      html += `<td data-field="${h}">${value ?? ""}</td>`;
    });
    html += `
      <td>
        <button class="action-btn edit-btn" onclick="editRow('${row.id}')">✏ Редактировать</button>
        <button class="action-btn delete-btn" onclick="deleteRow('${row.id}')">Удалить</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  tableContainer.innerHTML = html;

  // сортировка по клику по заголовку
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.onclick = () => {
      const field = th.dataset.field;
      if (currentSort.field === field) {
        currentSort.direction =
          currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        currentSort.field = field;
        currentSort.direction = "asc";
      }
      renderTable();
    };
  });
}

/* редактирование строки */
window.editRow = function (id) {
  const rowEl = document.querySelector(`tr[data-id="${id}"]`);
  if (!rowEl) return;

  // сырые данные по id
  const rowData = currentRows.find((r) => r.id === id);

  rowEl.querySelectorAll("td[data-field]").forEach((cell) => {
    const field = cell.dataset.field;
    const rawValue = rowData ? rowData[field] : undefined;

    // id и Timestamp-поля не редактируем
    if (field === "id" || (rawValue && typeof rawValue.toDate === "function")) {
      return;
    }

    const displayed = cell.textContent.trim();
    cell.innerHTML = `<input class="input-edit" value="${displayed}">`;
  });

  rowEl.lastElementChild.innerHTML = `
    <button class="action-btn save-btn" onclick="saveRow('${id}')">💾 Сохранить</button>
    <button class="action-btn cancel-btn" onclick="cancelEdit()">Отмена</button>
  `;
};

window.cancelEdit = function () {
  renderTable();
};

/* сохранение */
window.saveRow = async function (id) {
  const rowEl = document.querySelector(`tr[data-id="${id}"]`);
  if (!rowEl) return;

  const updated = {};
  rowEl.querySelectorAll("td[data-field]").forEach((cell) => {
    const field = cell.dataset.field;
    const input = cell.querySelector("input");
    if (!input) return; // поля без инпута (id, Timestamp) пропускаем

    const value = input.value ?? "";
    if (field !== "id") {
      updated[field] = value === "" ? null : value;
    }
  });

  try {
    await updateDoc(doc(db, currentCollection, id), updated);
    showToast("Сохранено", "success");
    loadCollection(currentCollection);
  } catch (e) {
    console.error(e);
    showToast("Ошибка сохранения", "error");
  }
};

/* удаление */
window.deleteRow = async function (id) {
  if (!confirm("Удалить документ?")) return;
  try {
    await deleteDoc(doc(db, currentCollection, id));
    showToast("Удалено", "success");
    loadCollection(currentCollection);
  } catch (e) {
    console.error(e);
    showToast("Ошибка удаления", "error");
  }
};

/* поиск / фильтры */
if (searchInput) searchInput.addEventListener("input", () => renderTable());
if (filterFieldSelect)
  filterFieldSelect.addEventListener("change", () => renderTable());
if (filterValueInput)
  filterValueInput.addEventListener("input", () => renderTable());
if (clearFiltersBtn) {
  clearFiltersBtn.onclick = () => {
    searchInput.value = "";
    filterFieldSelect.value = "";
    filterValueInput.value = "";
    renderTable();
  };
}
