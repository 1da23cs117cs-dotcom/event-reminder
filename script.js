const API = "https://event-reminder-sg2s.onrender.com";

// ✅ INIT
function init() {
  checkAuth();
  showSection("dashboard");
  loadEvents();
}

// ✅ Check login
function checkAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "index.html";
  }
}

// ✅ Section switch (SAFE)
function showSection(section) {
  const dashboard = document.getElementById("dashboardSection");
  const add = document.getElementById("addSection");
  const view = document.getElementById("viewSection");

  if (!dashboard || !add || !view) {
    console.error("Section missing in HTML ❌");
    return;
  }

  dashboard.style.display = "none";
  add.style.display = "none";
  view.style.display = "none";

  if (section === "dashboard") dashboard.style.display = "block";
  if (section === "add") add.style.display = "block";
  if (section === "view") view.style.display = "block";
}

// ✅ Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ✅ Load Events (FIXED)
async function loadEvents() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/events`, {
      headers: {
        "Authorization": `Bearer ${token}`   // ✅ FIXED
      }
    });

    const data = await res.json();
    console.log("EVENTS:", data);

    const eventsDiv = document.getElementById("events");

    if (!eventsDiv) return;

    eventsDiv.innerHTML = "";

    let total = 0;
    let upcoming = 0;
    let past = 0;

    data.forEach(event => {
      total++;

      const eventTime = new Date(event.event_time);

      if (eventTime > new Date()) upcoming++;
      else past++;

      eventsDiv.innerHTML += `
        <div class="event">
          <b>${event.title}</b><br>
          ${event.reminder_email}<br>
          ${eventTime.toLocaleString()}<br><br>

          <button onclick="deleteEvent('${event.id}')">Delete</button>
        </div>
      `;
    });

    // ✅ Update stats safely
    const totalEl = document.getElementById("total");
    const upcomingEl = document.getElementById("upcoming");
    const pastEl = document.getElementById("past");

    if (totalEl) totalEl.innerText = total;
    if (upcomingEl) upcomingEl.innerText = upcoming;
    if (pastEl) pastEl.innerText = past;

  } catch (err) {
    console.error("Error loading events ❌", err);
  }
}

// ✅ Add Event
async function addEvent() {
  const token = localStorage.getItem("token");

  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const etime = document.getElementById("etime").value;
  const rtime = document.getElementById("rtime").value;

  try {
    await fetch(`${API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`   // ✅ FIXED
      },
      body: JSON.stringify({
        title,
        reminder_email: email,
        event_time: etime,
        reminder_time: rtime
      })
    });

    alert("Event Added ✅");

    loadEvents();
    showSection("view");

  } catch (err) {
    console.error("Add error ❌", err);
  }
}

// ✅ Delete Event
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  try {
    await fetch(`${API}/events/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`   // ✅ FIXED
      }
    });

    loadEvents();

  } catch (err) {
    console.error("Delete error ❌", err);
  }
}