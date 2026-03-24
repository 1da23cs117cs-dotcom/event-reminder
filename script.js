const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// ================= NAVIGATION =================
function showSection(section) {
  document.getElementById("statsSection").style.display = "none";
  document.getElementById("addSection").style.display = "none";
  document.getElementById("eventsSection").style.display = "none";

  if (section === "stats") {
    document.getElementById("statsSection").style.display = "block";
  }

  if (section === "add") {
    document.getElementById("addSection").style.display = "block";
  }

  if (section === "events") {
    document.getElementById("eventsSection").style.display = "block";
    loadEvents();
  }
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ================= SAVE EVENT =================
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

  await fetch(url, {
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

// ================= LOAD EVENTS =================
async function loadEvents() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(API + "/events", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  const div = document.getElementById("events");
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

  document.getElementById("totalEvents").innerText = total;
  document.getElementById("upcomingEvents").innerText = upcoming;
  document.getElementById("pastEvents").innerText = past;
}

// ================= EDIT =================
function editEvent(id, title, email, etime, rtime) {
  editId = id;

  document.getElementById("title").value = title;
  document.getElementById("remail").value = email;
  document.getElementById("etime").value = formatDate(etime);
  document.getElementById("rtime").value = formatDate(rtime);

  showSection("add");
}

// ================= DELETE =================
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(API + "/events/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  loadEvents();
}

// ================= HELPERS =================
function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("remail").value = "";
  document.getElementById("etime").value = "";
  document.getElementById("rtime").value = "";
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0,16);
}

// AUTO LOAD STATS
loadEvents();