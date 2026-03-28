const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// ================= AUTH =================

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

function init() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
  }
  showSection("dashboard");
  loadEvents();
}

function showSection(section) {
  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("addSection").classList.add("hidden");
  document.getElementById("viewSection").classList.add("hidden");

  document.getElementById(section + "Section").classList.remove("hidden");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= EVENTS =================

async function loadEvents() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/events`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();

  const div = document.getElementById("events");
  div.innerHTML = "";

  let total = 0, upcoming = 0, past = 0;

  data.forEach(e => {
    total++;

    const time = new Date(e.event_time);
    if (time > new Date()) upcoming++;
    else past++;

    div.innerHTML += `
      <div class="bg-gray-800 p-4 rounded-xl">
        <h3 class="text-xl font-bold">${e.title}</h3>
        <p class="text-gray-400">${time.toLocaleString()}</p>

        <div class="mt-3 space-x-2">
          <button onclick="editEvent('${e.id}', '${e.title}', '${e.email}', '${e.event_time}', '${e.reminder_time}')"
            class="bg-yellow-500 px-3 py-1 rounded">
            Edit
          </button>

          <button onclick="deleteEvent('${e.id}')"
            class="bg-red-500 px-3 py-1 rounded">
            Delete
          </button>
        </div>
      </div>
    `;
  });

  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
}

async function addEvent() {
  const token = localStorage.getItem("token");

  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const etime = document.getElementById("etime").value;
  const rtime = document.getElementById("rtime").value;

  if (editId) {
    await fetch(`${API}/events/${editId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ title, email, event_time: etime, reminder_time: rtime })
    });

    alert("Updated ✅");
    editId = null;

  } else {
    await fetch(`${API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ title, email, event_time: etime, reminder_time: rtime })
    });

    alert("Added ✅");
  }

  loadEvents();
  showSection("view");
}

function editEvent(id, title, email, etime, rtime) {
  editId = id;

  showSection("add");

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = etime.slice(0,16);
  document.getElementById("rtime").value = rtime.slice(0,16);
}

async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/events/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadEvents();
}