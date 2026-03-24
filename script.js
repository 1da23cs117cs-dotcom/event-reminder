const API = "https://event-reminder-sg2s.onrender.com";

// ================= SIGNUP =================
async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/signup", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  alert(res.ok ? "Signup successful ✅" : data.error);
}

// ================= LOGIN =================
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html"; // 🔥 redirect
  } else {
    alert(data.error);
  }
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= ADD EVENT =================
async function addEvent() {
  const token = localStorage.getItem("token");

  const body = {
    title: document.getElementById("title").value,
    email: document.getElementById("remail").value,
    event_time: new Date(document.getElementById("etime").value).toISOString(),
    reminder_time: new Date(document.getElementById("rtime").value).toISOString()
  };

  const res = await fetch(API + "/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  alert(res.ok ? "Event added ✅" : data.error);

  loadEvents();
}

// ================= LOAD EVENTS =================
async function loadEvents() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const res = await fetch(API + "/events", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const div = document.getElementById("events");
  if (!div) return;

  div.innerHTML = "";

  if (!Array.isArray(data)) {
    console.log(data);
    return;
  }

  data.forEach(e => {
    div.innerHTML += `
      <div class="event">
        <b>${e.title}</b><br>
        ${new Date(e.event_time).toLocaleString()}
      </div>
    `;
  });
}

// Auto load events ONLY on dashboard
if (window.location.pathname.includes("dashboard.html")) {
  loadEvents();
}