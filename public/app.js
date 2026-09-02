(function () {
  "use strict";

  const STORAGE_KEY = "operatingLogApiKey";
  const CATEGORIES = ["People", "Travel", "Experiences", "Health", "Wealth", "Work"];

  const state = {
    apiKey: null,
    weekStart: mondayOf(todayStr()),
    monthStr: currentMonthStr(),
    reviewMonthStr: currentMonthStr(),
    habitsCache: [],
  };

  const timers = {};
  let statusClearTimer = null;

  // ---------- date helpers ----------
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function parseDateLocal(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function formatDateLocal(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function addDaysStr(s, n) {
    const d = parseDateLocal(s);
    d.setDate(d.getDate() + n);
    return formatDateLocal(d);
  }
  function mondayOf(s) {
    const d = parseDateLocal(s);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return formatDateLocal(d);
  }
  function currentMonthStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function addMonthsStr(s, n) {
    const [y, m] = s.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function daysInMonthCount(monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }
  function monthLabel(monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  function weekLabel(weekStart) {
    const start = parseDateLocal(weekStart);
    const end = parseDateLocal(addDaysStr(weekStart, 6));
    const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }
  const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // ---------- save status ----------
  function setStatus(kind) {
    const el = document.getElementById("saveIndicator");
    if (kind === "saving") {
      el.textContent = "Saving…";
      el.className = "rail-status saving";
    } else if (kind === "saved") {
      el.textContent = "Saved";
      el.className = "rail-status saved";
      clearTimeout(statusClearTimer);
      statusClearTimer = setTimeout(() => { el.textContent = ""; el.className = "rail-status"; }, 2000);
    } else if (kind === "failed") {
      el.textContent = "Save failed";
      el.className = "rail-status failed";
    } else {
      el.textContent = "";
      el.className = "rail-status";
    }
  }

  function debounce(key, fn, delay) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(fn, delay || 350);
  }

  // ---------- API ----------
  async function api(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (state.apiKey) headers["x-api-key"] = state.apiKey;
    const res = await fetch("/api" + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) {
      showApiKeyModal("Invalid key. Try again.");
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error("Request failed (" + res.status + "): " + text);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function trackedWrite(fn) {
    setStatus("saving");
    try {
      const result = await fn();
      setStatus("saved");
      return result;
    } catch (e) {
      if (e.message !== "unauthorized") setStatus("failed");
      throw e;
    }
  }

  // ---------- API key gate ----------
  function showApiKeyModal(errorMsg) {
    document.getElementById("app").classList.add("hidden");
    const modal = document.getElementById("apiKeyModal");
    modal.classList.remove("hidden");
    const errEl = document.getElementById("apiKeyError");
    if (errorMsg) {
      errEl.textContent = errorMsg;
      errEl.classList.remove("hidden");
    } else {
      errEl.classList.add("hidden");
    }
    document.getElementById("apiKeyInput").focus();
  }

  async function tryKey(key) {
    const res = await fetch("/api/habits", { headers: { "x-api-key": key } });
    return res.ok;
  }

  async function boot() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ok = await tryKey(stored);
      if (ok) {
        state.apiKey = stored;
        document.getElementById("apiKeyModal").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        initApp();
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    showApiKeyModal();
  }

  document.getElementById("apiKeySubmit").addEventListener("click", submitApiKey);
  document.getElementById("apiKeyInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitApiKey();
  });

  async function submitApiKey() {
    const input = document.getElementById("apiKeyInput");
    const key = input.value.trim();
    if (!key) return;
    const ok = await tryKey(key);
    if (!ok) {
      showApiKeyModal("Invalid key. Try again.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, key);
    state.apiKey = key;
    document.getElementById("apiKeyModal").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    initApp();
  }

  // ---------- app init / tabs ----------
  let appInitialized = false;
  function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    document.querySelectorAll(".rail-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.getElementById("addHabitBtn").addEventListener("click", addHabit);
    document.getElementById("weekPrev").addEventListener("click", () => { state.weekStart = addDaysStr(state.weekStart, -7); loadWeek(); });
    document.getElementById("weekNext").addEventListener("click", () => { state.weekStart = addDaysStr(state.weekStart, 7); loadWeek(); });
    document.getElementById("monthPrev").addEventListener("click", () => { state.monthStr = addMonthsStr(state.monthStr, -1); loadMonth(); });
    document.getElementById("monthNext").addEventListener("click", () => { state.monthStr = addMonthsStr(state.monthStr, 1); loadMonth(); });
    document.getElementById("reviewPrev").addEventListener("click", () => { state.reviewMonthStr = addMonthsStr(state.reviewMonthStr, -1); loadReview(); });
    document.getElementById("reviewNext").addEventListener("click", () => { state.reviewMonthStr = addMonthsStr(state.reviewMonthStr, 1); loadReview(); });
    document.getElementById("dayEditorClose").addEventListener("click", () => {
      document.getElementById("dayEditor").classList.add("hidden");
    });

    document.getElementById("sidequestDone").addEventListener("change", saveSidequest);
    document.getElementById("sidequestNote").addEventListener("input", () => debounce("sidequest", saveSidequest, 350));

    ["reviewWin", "reviewMiss", "reviewIncome", "reviewNetworth", "reviewNextFocus"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => debounce("review", saveReview, 350));
    });

    loadTargets();
  }

  function switchTab(tab) {
    document.querySelectorAll(".rail-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
    if (tab === "targets") loadTargets();
    if (tab === "today") loadToday();
    if (tab === "week") loadWeek();
    if (tab === "month") loadMonth();
    if (tab === "review") loadReview();
  }

  // ---------- TARGETS ----------
  async function loadTargets() {
    const habits = await api("/habits");
    state.habitsCache = habits;
    const list = document.getElementById("habitList");
    list.innerHTML = "";
    habits.forEach((h) => list.appendChild(renderHabitRow(h)));
  }

  function renderHabitRow(h) {
    const row = document.createElement("div");
    row.className = "habit-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = h.label;
    labelInput.addEventListener("input", () => {
      debounce("habit-label-" + h.id, () => trackedWrite(() =>
        api("/habits/" + h.id, { method: "PATCH", body: { label: labelInput.value } })
      ), 350);
    });

    const typeSelect = document.createElement("select");
    ["check", "number"].forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t === "check" ? "Check" : "Number";
      if (t === h.type) opt.selected = true;
      typeSelect.appendChild(opt);
    });

    const targetInput = document.createElement("input");
    targetInput.type = "number";
    targetInput.className = "target-input mono";
    targetInput.placeholder = "target";
    targetInput.value = h.target ?? "";
    targetInput.style.display = h.type === "number" ? "" : "none";
    targetInput.addEventListener("input", () => {
      debounce("habit-target-" + h.id, () => trackedWrite(() =>
        api("/habits/" + h.id, { method: "PATCH", body: { target: targetInput.value === "" ? null : Number(targetInput.value) } })
      ), 350);
    });

    typeSelect.addEventListener("change", () => {
      targetInput.style.display = typeSelect.value === "number" ? "" : "none";
      trackedWrite(() => api("/habits/" + h.id, {
        method: "PATCH",
        body: { type: typeSelect.value, target: typeSelect.value === "number" ? (h.target ?? null) : null },
      }));
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Delete habit";
    removeBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${h.label}"? This removes all its logged history.`)) return;
      await trackedWrite(() => api("/habits/" + h.id, { method: "DELETE" }));
      loadTargets();
    });

    row.appendChild(labelInput);
    row.appendChild(typeSelect);
    row.appendChild(targetInput);
    row.appendChild(removeBtn);
    return row;
  }

  async function addHabit() {
    await trackedWrite(() => api("/habits", { method: "POST", body: { label: "New habit", type: "check" } }));
    await loadTargets();
  }

  // ---------- TODAY ----------
  async function loadToday() {
    const date = todayStr();
    document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric",
    });
    const summary = await api("/summary/today");
    document.getElementById("streakNum").textContent = summary.streak;
    const list = document.getElementById("todayList");
    list.innerHTML = "";
    summary.habits.forEach((h) => list.appendChild(renderTodayRow(h, date)));
  }

  function renderTodayRow(h, date) {
    const row = document.createElement("div");
    row.className = "today-row" + (h.status === "done" ? " done" : "");

    const label = document.createElement("span");
    label.className = "today-row-label";
    label.textContent = h.label;
    row.appendChild(label);

    if (h.type === "check") {
      const toggle = document.createElement("button");
      toggle.className = "check-toggle" + (h.completed ? " checked" : "");
      toggle.textContent = h.completed ? "✓" : "";
      toggle.addEventListener("click", () => {
        const next = !h.completed;
        h.completed = next;
        toggle.className = "check-toggle" + (next ? " checked" : "");
        toggle.textContent = next ? "✓" : "";
        row.className = "today-row" + (next ? " done" : "");
        debounce("today-" + h.id, () => trackedWrite(async () => {
          await api(`/days/${date}/habits/${h.id}`, { method: "PUT", body: { completed: next } });
          refreshStreak();
        }), 350);
      });
      row.appendChild(toggle);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "number-input-wrap";
      const input = document.createElement("input");
      input.type = "number";
      input.className = "mono";
      input.value = h.value ?? "";
      input.addEventListener("input", () => {
        debounce("today-" + h.id, () => trackedWrite(async () => {
          const value = input.value === "" ? null : Number(input.value);
          await api(`/days/${date}/habits/${h.id}`, { method: "PUT", body: { value } });
          refreshStreak();
        }), 350);
      });
      wrap.appendChild(input);
      if (h.target != null) {
        const target = document.createElement("span");
        target.className = "number-target mono";
        target.textContent = "/ " + h.target;
        wrap.appendChild(target);
      }
      row.appendChild(wrap);
    }
    return row;
  }

  async function refreshStreak() {
    const { streak } = await api("/streak");
    document.getElementById("streakNum").textContent = streak;
  }

  // ---------- WEEK ----------
  async function loadWeek() {
    document.getElementById("weekRangeLabel").textContent = weekLabel(state.weekStart);
    const data = await api("/weeks/" + state.weekStart);
    state.weekStart = data.weekStart;

    const table = document.getElementById("weekGrid");
    table.innerHTML = "";

    const thead = document.createElement("tr");
    thead.appendChild(document.createElement("th"));
    data.days.forEach((day, i) => {
      const th = document.createElement("th");
      const d = parseDateLocal(day.date);
      th.innerHTML = `${DOW_SHORT[i]}<br/>${d.getMonth() + 1}/${d.getDate()}`;
      thead.appendChild(th);
    });
    table.appendChild(thead);

    data.habits.forEach((h) => {
      const tr = document.createElement("tr");
      const labelTd = document.createElement("td");
      labelTd.textContent = h.label;
      tr.appendChild(labelTd);

      data.days.forEach((day) => {
        const td = document.createElement("td");
        const log = day.logs[h.id] || {};
        if (h.type === "check") {
          const btn = document.createElement("button");
          btn.className = "week-cell-check" + (log.completed ? " checked" : "");
          btn.textContent = log.completed ? "✓" : "";
          btn.addEventListener("click", () => {
            const next = !log.completed;
            log.completed = next;
            btn.className = "week-cell-check" + (next ? " checked" : "");
            btn.textContent = next ? "✓" : "";
            debounce("week-" + h.id + "-" + day.date, () => trackedWrite(() =>
              api(`/days/${day.date}/habits/${h.id}`, { method: "PUT", body: { completed: next } })
            ), 350);
          });
          td.appendChild(btn);
        } else {
          const input = document.createElement("input");
          input.type = "number";
          input.className = "week-cell-number mono";
          input.value = log.value ?? "";
          input.addEventListener("input", () => {
            debounce("week-" + h.id + "-" + day.date, () => trackedWrite(() => {
              const value = input.value === "" ? null : Number(input.value);
              return api(`/days/${day.date}/habits/${h.id}`, { method: "PUT", body: { value } });
            }), 350);
          });
          td.appendChild(input);
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    document.getElementById("sidequestDone").checked = data.sidequestDone;
    document.getElementById("sidequestNote").value = data.sidequestNote;
  }

  function saveSidequest() {
    const sidequestDone = document.getElementById("sidequestDone").checked;
    const sidequestNote = document.getElementById("sidequestNote").value;
    return trackedWrite(() => api("/weeks/" + state.weekStart, { method: "PUT", body: { sidequestDone, sidequestNote } }));
  }

  // ---------- MONTH ----------
  async function loadMonth() {
    document.getElementById("monthLabel").textContent = monthLabel(state.monthStr);
    document.getElementById("dayEditor").classList.add("hidden");

    const dayCount = daysInMonthCount(state.monthStr);
    const firstDate = `${state.monthStr}-01`;
    const lastDate = `${state.monthStr}-${pad(dayCount)}`;

    // Gather every week overlapping this month via /api/weeks (reuses existing endpoints).
    const weekStarts = [];
    let cursor = mondayOf(firstDate);
    const lastMonday = mondayOf(lastDate);
    while (cursor <= lastMonday) {
      weekStarts.push(cursor);
      cursor = addDaysStr(cursor, 7);
    }

    const weeks = await Promise.all(weekStarts.map((ws) => api("/weeks/" + ws)));
    const dayInfo = {};
    let habitCount = 0;
    weeks.forEach((w) => {
      habitCount = Math.max(habitCount, w.habits.length);
      w.days.forEach((day) => {
        if (day.date < firstDate || day.date > lastDate) return;
        let done = 0;
        w.habits.forEach((h) => {
          const log = day.logs[h.id];
          if (!log) return;
          if (h.type === "check" && log.completed === true) done++;
          else if (h.type === "number" && log.value != null && (h.target == null || log.value >= h.target)) done++;
        });
        dayInfo[day.date] = { done, total: w.habits.length };
      });
    });

    const heatmap = document.getElementById("calendarHeatmap");
    heatmap.innerHTML = "";
    DOW_SHORT.forEach((d) => {
      const label = document.createElement("div");
      label.className = "cal-day empty";
      label.style.visibility = "visible";
      label.style.border = "none";
      label.style.color = "var(--text-dim)";
      label.style.cursor = "default";
      label.style.fontSize = "11px";
      label.textContent = d;
      heatmap.appendChild(label);
    });

    const firstDow = parseDateLocal(firstDate).getDay();
    const leadBlanks = firstDow === 0 ? 6 : firstDow - 1;
    for (let i = 0; i < leadBlanks; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-day empty";
      heatmap.appendChild(blank);
    }

    const today = todayStr();
    for (let day = 1; day <= dayCount; day++) {
      const dateStr = `${state.monthStr}-${pad(day)}`;
      const info = dayInfo[dateStr] || { done: 0, total: habitCount };
      const ratio = info.total > 0 ? info.done / info.total : 0;
      const cell = document.createElement("div");
      cell.className = "cal-day" + (dateStr === today ? " today" : "");
      cell.textContent = String(day);
      if (ratio > 0) {
        const alpha = 0.15 + ratio * 0.65;
        cell.style.background = `rgba(79, 184, 166, ${alpha.toFixed(2)})`;
        cell.style.color = ratio > 0.5 ? "#0c1a17" : "var(--text)";
        cell.style.borderColor = "transparent";
      }
      cell.addEventListener("click", () => openDayEditor(dateStr));
      heatmap.appendChild(cell);
    }
  }

  async function openDayEditor(dateStr) {
    const editor = document.getElementById("dayEditor");
    editor.classList.remove("hidden");
    document.getElementById("dayEditorDate").textContent = dateStr;
    const list = document.getElementById("dayEditorList");
    list.innerHTML = "Loading…";

    const data = await api("/days/" + dateStr);
    list.innerHTML = "";
    data.habits.forEach((h) => {
      const log = data.logs[h.id] || {};
      const summaryLike = {
        id: h.id, label: h.label, type: h.type, target: h.target,
        completed: log.completed ?? null, value: log.value ?? null,
        status: h.type === "check" ? (log.completed ? "done" : "pending") : (log.value != null ? "value-so-far" : "pending"),
      };
      const row = renderTodayRow(summaryLike, dateStr);
      row.querySelectorAll("input, button.check-toggle").forEach((el) => {
        el.addEventListener("click", () => setTimeout(() => refreshDayCell(dateStr), 400));
        el.addEventListener("input", () => setTimeout(() => refreshDayCell(dateStr), 400));
      });
      list.appendChild(row);
    });
  }

  async function refreshDayCell(dateStr) {
    loadMonth();
  }

  // ---------- MONTHLY REVIEW ----------
  async function loadReview() {
    document.getElementById("reviewLabel").textContent = monthLabel(state.reviewMonthStr);
    const data = await api("/months/" + state.reviewMonthStr);
    document.getElementById("reviewWin").value = data.win || "";
    document.getElementById("reviewMiss").value = data.miss || "";
    document.getElementById("reviewIncome").value = data.income ?? "";
    document.getElementById("reviewNetworth").value = data.networth ?? "";
    document.getElementById("reviewNextFocus").value = data.nextFocus || "";

    const list = document.getElementById("categoryList");
    list.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const info = data.categories[cat] || { score: 0, notes: "" };
      list.appendChild(renderCategoryRow(cat, info));
    });
  }

  function renderCategoryRow(cat, info) {
    const row = document.createElement("div");
    row.className = "category-row";

    const top = document.createElement("div");
    top.className = "category-row-top";
    const name = document.createElement("span");
    name.className = "category-name";
    name.textContent = cat;
    top.appendChild(name);

    const dots = document.createElement("div");
    dots.className = "dots";
    let currentScore = info.score;
    const dotEls = [];
    for (let i = 1; i <= 10; i++) {
      const dot = document.createElement("button");
      dot.className = "dot" + (i <= currentScore ? " filled" : "");
      dot.type = "button";
      dot.addEventListener("click", () => {
        currentScore = i;
        dotEls.forEach((d, idx) => d.classList.toggle("filled", idx + 1 <= currentScore));
        saveCategoryDebounced(cat, () => ({ score: currentScore, notes: notesEl.value }));
      });
      dotEls.push(dot);
      dots.appendChild(dot);
    }
    top.appendChild(dots);
    row.appendChild(top);

    const notesEl = document.createElement("textarea");
    notesEl.rows = 2;
    notesEl.placeholder = cat + " notes…";
    notesEl.value = info.notes || "";
    notesEl.addEventListener("input", () => {
      saveCategoryDebounced(cat, () => ({ score: currentScore, notes: notesEl.value }));
    });
    row.appendChild(notesEl);

    return row;
  }

  function saveCategoryDebounced(cat, getBody) {
    debounce("category-" + cat, () => trackedWrite(() =>
      api(`/months/${state.reviewMonthStr}/categories/${cat}`, { method: "PUT", body: getBody() })
    ), 350);
  }

  function saveReview() {
    const body = {
      win: document.getElementById("reviewWin").value,
      miss: document.getElementById("reviewMiss").value,
      income: document.getElementById("reviewIncome").value === "" ? null : Number(document.getElementById("reviewIncome").value),
      networth: document.getElementById("reviewNetworth").value === "" ? null : Number(document.getElementById("reviewNetworth").value),
      nextFocus: document.getElementById("reviewNextFocus").value,
    };
    return trackedWrite(() => api("/months/" + state.reviewMonthStr, { method: "PUT", body }));
  }

  boot();
})();
