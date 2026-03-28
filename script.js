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

// ================= INIT =================

function init() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
  }
  showSection("dashboard");
  loadEvents();
}

// ================= NAVIGATION =================

function showSection(section) {
  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("addSection").classList.add("hidden");
  document.getElementById("viewSection").classList.add("hidden");
  document.getElementById("calendarSection").classList.add("hidden");

  document.getElementById(section + "Section").classList.remove("hidden");

  if (section === "calendar") {
    loadCalendar();
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= EVENTS =================

async function loadEvents() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/events`, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const div = document.getElementById("events");
  div.innerHTML = "";

  let total = 0, upcoming = 0, past = 0;

  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const filter = document.getElementById("filter")?.value || "all";

  const colorMap = {
    Work: "border-blue-500",
    Personal: "border-green-500",
    Urgent: "border-red-500",
    Other: "border-gray-500"
  };

  data.forEach(e => {
    const time = new Date(e.event_time);
    const isUpcoming = time > new Date();

    total++;
    if (isUpcoming) upcoming++;
    else past++;

    if (!e.title.toLowerCase().includes(search)) return;
    if (filter === "upcoming" && !isUpcoming) return;
    if (filter === "past" && isUpcoming) return;

    const color = colorMap[e.category] || "border-gray-500";

    div.innerHTML += `
      <div class="bg-gray-800 p-5 rounded-2xl shadow-lg border-l-4 ${color} hover:scale-[1.02] transition">

        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold">${e.title}</h3>
          <span class="text-xs px-2 py-1 bg-gray-700 rounded-full">
            ${e.category || "General"}
          </span>
        </div>

        <p class="text-gray-400 mt-2">
          🕒 ${time.toLocaleString()}
        </p>

        <div class="mt-4 flex gap-2">
          <button onclick="editEvent('${e.id}','${e.title}','${e.email}','${e.event_time}','${e.reminder_time}','${e.category}')"
            class="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded-lg text-sm">
            ✏️ Edit
          </button>

          <button onclick="deleteEvent('${e.id}')"
            class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm">
            🗑 Delete
          </button>
        </div>

      </div>
    `;
  });

  if (div.innerHTML === "") {
    div.innerHTML = "<p class='text-gray-400'>No events found</p>";
  }

  // stats
  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
}

// ================= ADD / UPDATE =================

async function addEvent() {
  const token = localStorage.getItem("token");

  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const etime = document.getElementById("etime").value;
  const rtime = document.getElementById("rtime").value;
  const category = document.getElementById("category").value;

  const body = {
    title,
    email,
    event_time: etime,
    reminder_time: rtime,
    category
  };

  const url = editId ? `${API}/events/${editId}` : `${API}/events`;

  await fetch(url, {
    method: editId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  alert(editId ? "Updated ✅" : "Added ✅");

  editId = null;
  loadEvents();
  showSection("view");
}

// ================= EDIT =================

function editEvent(id, title, email, etime, rtime, category) {
  editId = id;

  showSection("add");

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = etime.slice(0, 16);
  document.getElementById("rtime").value = rtime.slice(0, 16);
  document.getElementById("category").value = category || "Other";
}

// ================= DELETE =================

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

// ================= CALENDAR =================

async function loadCalendar() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/events`, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const colorMap = {
    Work: "blue",
    Personal: "green",
    Urgent: "red",
    Other: "gray"
  };

  const events = data.map(e => ({
    title: e.title,
    start: e.event_time,
    color: colorMap[e.category] || "gray"
  }));

  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 600,
    events: events
  });

  calendar.render();
}