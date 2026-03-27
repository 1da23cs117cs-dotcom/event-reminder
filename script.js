const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// SWITCH SECTIONS
function showSection(section) {
  document.getElementById("dashboardSection").style.display = "none";
  document.getElementById("addSection").style.display = "none";
  document.getElementById("viewSection").style.display = "none";

  document.getElementById(section).style.display = "block";
}
function checkAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "index.html";
  }
}

// ADD / UPDATE EVENT
async function addEvent() {
  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const etime = document.getElementById("etime").value;
  const rtime = document.getElementById("rtime").value;

  const method = editId ? "PUT" : "POST";
  const url = editId ? `${API}/events/${editId}` : `${API}/events`;

  await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      email,
      event_time: etime,
      reminder_time: rtime
    })
  });

  alert(editId ? "Event Updated" : "Event Added");

  editId = null;
  loadEvents();
  showSection("viewSection");
}

// LOAD EVENTS
async function loadEvents() {
  const container = document.getElementById("events");

  // ✅ VERY IMPORTANT FIX
  if (!container) return;

  const token = localStorage.getItem("token");

  const res = await fetch("https://event-reminder-sg2s.onrender.com/events", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const events = await res.json();

  console.log("EVENTS:", events); // ✅ debug

  container.innerHTML = "";

  events.forEach(e => {
    container.innerHTML += `
      <div>
        <h4>${e.title}</h4>
        <p>${new Date(e.event_time).toLocaleString()}</p>
      </div>
    `;
  });
}
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("https://event-reminder-sg2s.onrender.com/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  console.log("LOGIN RESPONSE:", data); // DEBUG

  if (data.token) {
    localStorage.setItem("token", data.token); // ✅ SAVE TOKEN
    window.location.href = "dashboard.html";   // ✅ GO TO DASHBOARD
  } else {
    alert("Login failed");
  }
}
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// EDIT EVENT
function editEvent(id, title, email, etime, rtime) {
  editId = id;

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = etime.slice(0,16);
  document.getElementById("rtime").value = rtime.slice(0,16);

  showSection("addSection");
}

// DELETE EVENT
async function deleteEvent(id) {
  await fetch(`${API}/events/${id}`, {
    method: "DELETE"
  });

  alert("Deleted");
  loadEvents();
}

// LOGOUT
function logout() {
  window.location.href = "index.html";
}

// AUTO LOAD
loadEvents();