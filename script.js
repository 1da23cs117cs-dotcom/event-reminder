const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// AUTH
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

// INIT
function init() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
  }
  showSection("dashboard");
  loadEvents();
}

// SECTION SWITCH
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

// LOGOUT
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// EVENTS
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

  data.forEach(e => {
    const time = new Date(e.event_time);
    const isUpcoming = time > new Date();

    total++;
    if (isUpcoming) upcoming++;
    else past++;

    if (!e.title.toLowerCase().includes(search)) return;
    if (filter === "upcoming" && !isUpcoming) return;
    if (filter === "past" && isUpcoming) return;

    div.innerHTML += `
      <div class="bg-gray-800 p-4 rounded-xl">
        <h3 class="text-xl font-bold">${e.title}</h3>
        <p class="text-gray-400">${time.toLocaleString()}</p>

        <div class="mt-3 space-x-2">
          <button onclick="editEvent('${e.id}', '${e.title}', '${e.email}', '${e.event_time}', '${e.reminder_time}')"
            class="bg-yellow-500 px-3 py-1 rounded">Edit</button>

          <button onclick="deleteEvent('${e.id}')"
            class="bg-red-500 px-3 py-1 rounded">Delete</button>
        </div>
      </div>
    `;
  });

  if (div.innerHTML === "") {
    div.innerHTML = "<p class='text-gray-400'>No events found</p>";
  }

  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
}

// ADD / UPDATE
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

// EDIT
function editEvent(id, title, email, etime, rtime) {
  editId = id;
  showSection("add");

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = etime.slice(0,16);
  document.getElementById("rtime").value = rtime.slice(0,16);
}

// DELETE
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  loadEvents();
}

// 📅 CALENDAR
async function loadCalendar() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/events`, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const events = data.map(e => ({
    title: e.title,
    start: e.event_time
  }));

  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: "auto",
    events: events
  });

  calendar.render();
}