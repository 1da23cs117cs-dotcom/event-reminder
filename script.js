const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// ================= AUTH =================

async function signup() {
  const email = emailInput();
  const password = passwordInput();

  const res = await fetch(API + "/signup", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
}

async function login() {
  const email = emailInput();
  const password = passwordInput();

  const res = await fetch(API + "/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } else {
    alert(data.error);
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= EVENTS =================

async function saveEvent() {
  const token = localStorage.getItem("token");

  const body = {
    title: document.getElementById("title").value,
    email: document.getElementById("remail").value,
    event_time: new Date(document.getElementById("etime").value).toISOString(),
    reminder_time: new Date(document.getElementById("rtime").value).toISOString()
  };

  let url = API + "/events";
  let method = "POST";

  if (editId) {
    url = API + "/events/" + editId;
    method = "PUT";
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  alert("Saved!");
  editId = null;
  clearForm();
  loadEvents();
}

async function loadEvents() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(API + "/events", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const div = document.getElementById("events");
  if (!div) return;

  div.innerHTML = "";

  let total = 0, upcoming = 0, past = 0;

  data.forEach(e => {
    total++;

    const now = new Date();
    const eventDate = new Date(e.event_time);

    if (eventDate > now) upcoming++;
    else past++;

    div.innerHTML += `
      <div class="event">
        <b>${e.title}</b><br>
        ${eventDate.toLocaleString()}<br><br>

        <button onclick="editEvent(${e.id}, '${e.title}', '${e.email}', '${e.event_time}', '${e.reminder_time}')">Edit</button>
        <button onclick="deleteEvent(${e.id})">Delete</button>
      </div>
    `;
  });

  // STATS
  setText("totalEvents", total);
  setText("upcomingEvents", upcoming);
  setText("pastEvents", past);
}

function editEvent(id, title, email, etime, rtime) {
  editId = id;

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = formatDate(etime);
  document.getElementById("rtime").value = formatDate(rtime);
}

async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(API + "/events/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  loadEvents();
}

// ================= HELPERS =================

function emailInput() {
  return document.getElementById("email").value;
}

function passwordInput() {
  return document.getElementById("password").value;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function clearForm() {
  ["title", "remail", "etime", "rtime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0,16);
}

// AUTO LOAD
loadEvents();