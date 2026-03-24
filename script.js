const API = "https://event-reminder-sg2s.onrender.com";

// ================= AUTH =================
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
    alert("Login successful ✅");

    window.location.href = "dashboard.html";
  } else {
    alert(data.error);
  }
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= ADD / UPDATE =================
async function addEvent() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Login first ❌");
    return;
  }

  const body = {
    title: document.getElementById("title").value,
    email: document.getElementById("remail").value,
    event_time: new Date(document.getElementById("etime").value).toISOString(),
    reminder_time: new Date(document.getElementById("rtime").value).toISOString()
  };

  let url = API + "/events";
  let method = "POST";

  if (window.editId) {
    url = API + "/events/" + window.editId;
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

  if (res.ok) {
    alert(window.editId ? "Updated ✅" : "Added ✅");

    document.getElementById("title").value = "";
    document.getElementById("remail").value = "";
    document.getElementById("etime").value = "";
    document.getElementById("rtime").value = "";

    window.editId = null;

    loadEvents();
  } else {
    alert("Error ❌");
  }
}

// ================= LOAD EVENTS =================
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

  if (!Array.isArray(data)) {
    console.log("Error:", data);
    return;
  }

  data.forEach(e => {
    div.innerHTML += `
      <div class="event">
        <b>${e.title}</b><br>
        ${new Date(e.event_time).toLocaleString()}<br><br>

        <button onclick="editEvent(${e.id}, '${e.title}', '${e.email}', '${e.event_time}', '${e.reminder_time}')">
          Edit
        </button>

        <button onclick="deleteEvent(${e.id})">
          Delete
        </button>
      </div>
    `;
  });
}

// ================= DELETE =================
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  if (!confirm("Delete this event?")) return;

  const res = await fetch(API + "/events/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  if (res.ok) {
    alert("Deleted ✅");
    loadEvents();
  } else {
    alert("Delete failed ❌");
  }
}

// ================= EDIT =================
function editEvent(id, title, email, event_time, reminder_time) {
  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;

  document.getElementById("etime").value =
    new Date(event_time).toISOString().slice(0,16);

  document.getElementById("rtime").value =
    new Date(reminder_time).toISOString().slice(0,16);

  window.editId = id;
}

// ================= AUTO LOAD =================
if (window.location.pathname.includes("dashboard")) {
  loadEvents();
}