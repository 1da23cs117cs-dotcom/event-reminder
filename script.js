const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// SWITCH SECTIONS
function showSection(section) {
  document.getElementById("dashboardSection").style.display = "none";
  document.getElementById("addSection").style.display = "none";
  document.getElementById("viewSection").style.display = "none";

  document.getElementById(section).style.display = "block";
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
  const res = await fetch(`${API}/events`);
  const data = await res.json();

  const container = document.getElementById("events");
  container.innerHTML = "";

  let total = data.length;
  let upcoming = 0;
  let past = 0;

  data.forEach(e => {
    const now = new Date();
    const eventDate = new Date(e.event_time);

    if (eventDate > now) upcoming++;
    else past++;

    container.innerHTML += `
      <div class="event-card">
        <h4>${e.title}</h4>
        <p>${new Date(e.event_time).toLocaleString()}</p>

        <button onclick="editEvent(${e.id}, '${e.title}', '${e.email}', '${e.event_time}', '${e.reminder_time}')">Edit</button>
        <button onclick="deleteEvent(${e.id})">Delete</button>
      </div>
    `;
  });

  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
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