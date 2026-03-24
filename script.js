const API = "https://event-reminder-sg2s.onrender.com";

// SWITCH SECTIONS
function showSection(section) {
  document.getElementById("dashboardSection").style.display = "none";
  document.getElementById("addSection").style.display = "none";
  document.getElementById("viewSection").style.display = "none";

  if (section === "dashboard") {
    document.getElementById("dashboardSection").style.display = "block";
  } else if (section === "add") {
    document.getElementById("addSection").style.display = "block";
  } else if (section === "view") {
    document.getElementById("viewSection").style.display = "block";
    loadEvents();
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

// ADD EVENT
async function addEvent() {
  const token = localStorage.getItem("token");

  const title = document.getElementById("title").value;
  const email = document.getElementById("remail").value;
  const event_time = document.getElementById("etime").value;
  const reminder_time = document.getElementById("rtime").value;

  const res = await fetch(API + "/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ title, email, event_time, reminder_time })
  });

  const data = await res.json();
  alert("Event saved!");

  showSection("view");
}

// LOAD EVENTS
async function loadEvents() {
  const token = localStorage.getItem("token");

  const res = await fetch(API + "/events", {
    headers: {
      "Authorization": token
    }
  });

  const data = await res.json();

  const container = document.getElementById("events");
  container.innerHTML = "";

  let total = data.length;
  let upcoming = 0;
  let past = 0;

  const now = new Date();

  data.forEach(event => {
    const eventDate = new Date(event.event_time);

    if (eventDate > now) upcoming++;
    else past++;

    container.innerHTML += `
      <div class="event">
        <h3>${event.title}</h3>
        <p>${new Date(event.event_time).toLocaleString()}</p>
        <button onclick="deleteEvent(${event.id})">Delete</button>
      </div>
    `;
  });

  document.getElementById("total").innerText = total;
  document.getElementById("upcoming").innerText = upcoming;
  document.getElementById("past").innerText = past;
}

// DELETE EVENT
async function deleteEvent(id) {
  const token = localStorage.getItem("token");

  await fetch(API + "/events/" + id, {
    method: "DELETE",
    headers: {
      "Authorization": token
    }
  });

  loadEvents();
}