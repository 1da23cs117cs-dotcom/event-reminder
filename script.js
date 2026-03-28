const API = "https://event-reminder-sg2s.onrender.com";

// ================= AUTH =================

// Signup
async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
}

// Login
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } else {
    alert(data.error);
  }
}

// ================= DASHBOARD =================

// Init
function init() {
  checkAuth();
  showSection("dashboard");
  loadEvents();
}

// Check login
function checkAuth() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
  }
}

// Switch sections
function showSection(section) {
  const d = document.getElementById("dashboardSection");
  const a = document.getElementById("addSection");
  const v = document.getElementById("viewSection");

  if (!d || !a || !v) return;

  d.style.display = "none";
  a.style.display = "none";
  v.style.display = "none";

  if (section === "dashboard") d.style.display = "block";
  if (section === "add") a.style.display = "block";
  if (section === "view") v.style.display = "block";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// Load events
async function loadEvents() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/events`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await res.json();

  const div = document.getElementById("events");
  if (!div) return;

  div.innerHTML = "";

  let total = 0, upcoming = 0, past = 0;

  data.forEach(e => {
    total++;

    const time = new Date(e.event_time);

    if (time > new Date()) upcoming++;
    else past++;

    div.innerHTML += `
      <div class="event">
        <b>${e.title}</b><br>
        ${time.toLocaleString()}<br><br>
        <button onclick="deleteEvent('${e.id}')">Delete</button>
      </div>
    `;
  });

  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
}

// Add event
async function addEvent() {
  const token = localStorage.getItem("token");

  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const etime = document.getElementById("etime").value;
  const rtime = document.getElementById("rtime").value;

  await fetch(`${API}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      title,
      email,
      event_time: etime,
      reminder_time: rtime
    })
  });

  alert("Event Added ✅");

  loadEvents();
  showSection("view");
}

// Delete event
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/events/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  loadEvents();
}