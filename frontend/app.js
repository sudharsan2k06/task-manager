// ── CONFIG ──
const API = ''; // same origin; need to change url if backend is hosted elsewhere
const PAGE_SIZE = 8;

// state
let token       = localStorage.getItem('token') || '';
let currentEmail  = localStorage.getItem('email') || '';
let authMode      = 'login';
let currentFilter = 'all';
let currentPage   = 1;
let toastTimer;

// ── INIT ──
if (token) showDash();

// auth

function switchTab(mode) {
  authMode = mode;

  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.classList.toggle('active', (mode === 'login' && i === 0) || (mode === 'register' && i === 1));
  });

  document.getElementById('authBtnText').textContent = mode === 'login' ? 'Login' : 'Create Account';
  clearAuthMsg();
}

async function handleAuth() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn      = document.getElementById('authBtn');
  const msg      = document.getElementById('authMsg');

  if (!email || !password) {
    showMsg(msg, 'Please fill in all fields.', 'error');
    return;
  }

  setLoading(btn, true);
  clearAuthMsg();

  try {
    if (authMode === 'register') {
      await registerUser(email, password, msg);
    }

    const loginData = await loginUser(email, password);
    token = loginData.access_token;

    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    currentEmail = email;

    setTimeout(showDash, 400);

  } catch (e) {
    showMsg(msg, e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function registerUser(email, password, msg) {
  const res  = await fetch(API + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  showMsg(msg, '✓ Account created! Logging you in…', 'success');
}

async function loginUser(email, password) {
  const res  = await fetch(API + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

function logout() {
  token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('email');

  document.getElementById('taskList').innerHTML   = '';
  document.getElementById('pagination').innerHTML = '';
  document.getElementById('userInfo').style.display  = 'none';
  document.getElementById('authEmail').value    = '';
  document.getElementById('authPassword').value = '';

  showPage('authPage');
  toast('Logged out', 'success');
}
// page navigation

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showDash() {
  document.getElementById('userEmail').textContent  = currentEmail;
  document.getElementById('userInfo').style.display = 'flex';
  showPage('dashPage');
  loadTasks();
}

// tasks

async function loadTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '<div class="loading-tasks">Loading tasks…</div>';

  const params = new URLSearchParams({ page: currentPage, page_size: PAGE_SIZE });
  if (currentFilter !== 'all') params.set('completed', currentFilter);

  try {
    const res  = await apiFetch('/tasks?' + params);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    updateStats();
    renderTasks(data.tasks);
    renderPagination(data.total, data.page, data.page_size);
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
  }
}

async function updateStats() {
  try {
    const [all, done, pending] = await Promise.all([
      apiFetch('/tasks?page=1&page_size=1').then(r => r.json()),
      apiFetch('/tasks?page=1&page_size=1&completed=true').then(r => r.json()),
      apiFetch('/tasks?page=1&page_size=1&completed=false').then(r => r.json()),
    ]);

    document.getElementById('statTotal').textContent   = all.total;
    document.getElementById('statDone').textContent    = done.total;
    document.getElementById('statPending').textContent = pending.total;

    const pct = all.total > 0 ? Math.round((done.total / all.total) * 100) : 0;
    document.getElementById('progressBar').style.width  = pct + '%';
    document.getElementById('progressPct').textContent  = pct + '%';
  } catch (e) {
    // stats are noncritical fail silently
  }
}

async function addTask() {
  const input = document.getElementById('taskTitle');
  const title = input.value.trim();
  const btn   = document.getElementById('addBtn');

  if (!title) { input.focus(); return; }

  setLoading(btn, true);
  try {
    const res  = await apiFetch('/tasks', 'POST', { title });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    input.value = '';
    currentPage = 1;
    loadTasks();
    toast('Task added!', 'success');
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function toggleTask(id, completed) {
  const card = document.getElementById('task-' + id);
  const btn  = card.querySelector('.check-btn');

  btn.classList.add('popping');
  setTimeout(() => btn.classList.remove('popping'), 300);

  try {
    const res  = await apiFetch('/tasks/' + id, 'PUT', { completed: !completed });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    loadTasks();
    toast(completed ? 'Marked as pending' : 'Task completed! 🎉', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteTask(id) {
  const card = document.getElementById('task-' + id);
  card.style.transition = 'all .25s';
  card.style.opacity    = '0';
  card.style.transform  = 'translateX(20px)';

  try {
    const res  = await apiFetch('/tasks/' + id, 'DELETE');
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    setTimeout(loadTasks, 260);
    toast('Task deleted', 'success');
  } catch (e) {
    card.style.opacity   = '1';
    card.style.transform = '';
    toast(e.message, 'error');
  }
}

function setFilter(f, el) {
  currentFilter = f;
  currentPage   = 1;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadTasks();
}

function goPage(p) {
  currentPage = p;
  loadTasks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ─────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────

function renderTasks(tasks) {
  const list = document.getElementById('taskList');

  if (!tasks.length) {
    const messages = {
      'true':  'No completed tasks yet.',
      'false': 'No pending tasks! Great job! 🎉',
      'all':   'No tasks yet. Add one above!'
    };
    list.innerHTML = `<div class="empty-state"><div class="icon">✅</div><p>${messages[currentFilter]}</p></div>`;
    return;
  }

  list.innerHTML = tasks.map((task, i) => taskCardHTML(task, i)).join('');
}

function taskCardHTML(task, index) {
  const doneClass  = task.completed ? 'completed' : '';
  const badgeClass = task.completed ? 'done' : 'pending';
  const badgeText  = task.completed ? 'Done' : 'Pending';
  const checkTitle = task.completed ? 'Mark pending' : 'Mark complete';
  const delay      = index * 0.04;

  return `
    <div class="task-card ${doneClass} fade-in" id="task-${task.id}" style="animation-delay:${delay}s">
      <button class="check-btn" onclick="toggleTask(${task.id}, ${task.completed})" title="${checkTitle}">✓</button>
      <div class="task-body">
        <div class="task-title">${escHtml(task.title)}</div>
        <div class="task-meta">${formatDate(task.created_at)} · <span class="badge ${badgeClass}">${badgeText}</span></div>
      </div>
      <div class="task-actions">
        <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
      </div>
    </div>
  `;
}

function renderPagination(total, page, pageSize) {
  const pages = Math.ceil(total / pageSize);
  const el    = document.getElementById('pagination');

  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>`;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<span class="page-info">…</span>`;
    }
  }

  html += `<button class="page-btn" onclick="goPage(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next ›</button>`;
  el.innerHTML = html;
}


// apii

async function apiFetch(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(API + path, options);

  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }

  return res;
}


// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function setLoading(btn, on) {
  btn.disabled = on;
  btn.classList.toggle('loading', on);
}

function showMsg(el, msg, type) {
  el.textContent = msg;
  el.className   = 'msg ' + type;
}

function clearAuthMsg() {
  const msg = document.getElementById('authMsg');
  msg.className   = 'msg';
  msg.textContent = '';
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show ' + (type || 'success');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Handle Enter key for auth and adding tasks

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;

  const authPage = document.getElementById('authPage');
  if (authPage.classList.contains('active')) {
    handleAuth();
  } else {
    const taskInput = document.getElementById('taskTitle');
    if (document.activeElement === taskInput) addTask();
  }
});
