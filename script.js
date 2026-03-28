const API = "https://event-reminder-sg2s.onrender.com";

let editId = null;

// AUTH
async function signup() {
  const email = emailEl().value;
  const password = passEl().value;

  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  alert((await res.json()).message);
}

async function login() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: emailEl().value,
      password: passEl().value
    })
  });

  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location = "dashboard.html";
  } else alert(data.error);
}

function emailEl(){ return document.getElementById("email"); }
function passEl(){ return document.getElementById("password"); }

// INIT
function init() {
  if (!localStorage.getItem("token")) location = "index.html";
  showSection("dashboard");
  loadEvents();
}

// NAV
function showSection(s) {
  ["dashboard","add","view","calendar"].forEach(sec =>
    document.getElementById(sec+"Section").classList.add("hidden")
  );

  document.getElementById(s+"Section").classList.remove("hidden");

  if (s==="calendar") loadCalendar();
}

function logout() {
  localStorage.removeItem("token");
  location = "index.html";
}

// LOAD EVENTS
async function loadEvents() {
  const res = await fetch(`${API}/events`, {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") }
  });

  const data = await res.json();
  const div = document.getElementById("events");
  div.innerHTML = "";

  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const filter = document.getElementById("filter")?.value;

  const colorMap = {
    Work:"bg-blue-500",
    Personal:"bg-green-500",
    Urgent:"bg-red-500",
    Other:"bg-gray-500"
  };

  let total=0, upcoming=0, past=0;

  data.forEach(e=>{
    const t=new Date(e.event_time);
    const up=t>new Date();

    total++; up?upcoming++:past++;

    if(!e.title.toLowerCase().includes(search)) return;
    if(filter==="upcoming" && !up) return;
    if(filter==="past" && up) return;

    div.innerHTML+=`
      <div class="${colorMap[e.category]||"bg-gray-500"} p-4 rounded-xl">
        <h3>${e.title}</h3>
        <p>${e.category}</p>
        <p>${t.toLocaleString()}</p>

        <button onclick="editEvent('${e.id}','${e.title}','${e.email}','${e.event_time}','${e.reminder_time}','${e.category}')">Edit</button>
        <button onclick="deleteEvent('${e.id}')">Delete</button>
      </div>`;
  });

  totalEl().innerText=total;
  upcomingEl().innerText=upcoming;
  pastEl().innerText=past;
}

function totalEl(){return document.getElementById("total")}
function upcomingEl(){return document.getElementById("upcoming")}
function pastEl(){return document.getElementById("past")}

// ADD
async function addEvent(){
  const body={
    title:val("title"),
    email:val("remail"),
    event_time:val("etime"),
    reminder_time:val("rtime"),
    category:val("category")
  };

  const url = editId ? `${API}/events/${editId}` : `${API}/events`;

  await fetch(url,{
    method: editId?"PUT":"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:"Bearer "+localStorage.getItem("token")
    },
    body:JSON.stringify(body)
  });

  editId=null;
  loadEvents();
  showSection("view");
}

function val(id){return document.getElementById(id).value}

// EDIT
function editEvent(id,t,e,et,rt,c){
  editId=id;
  showSection("add");

  valSet("title",t);
  valSet("remail",e);
  valSet("etime",et.slice(0,16));
  valSet("rtime",rt.slice(0,16));
  valSet("category",c);
}

function valSet(id,v){document.getElementById(id).value=v}

// DELETE
async function deleteEvent(id){
  await fetch(`${API}/events/${id}`,{
    method:"DELETE",
    headers:{Authorization:"Bearer "+localStorage.getItem("token")}
  });
  loadEvents();
}

// CALENDAR
async function loadCalendar(){
  const res = await fetch(`${API}/events`, {
    headers:{Authorization:"Bearer "+localStorage.getItem("token")}
  });

  const data = await res.json();

  const colorMap = {
    Work:"blue",
    Personal:"green",
    Urgent:"red",
    Other:"gray"
  };

  const events = data.map(e=>({
    title:e.title,
    start:e.event_time,
    color:colorMap[e.category]||"gray"
  }));

  const el=document.getElementById("calendar");
  el.innerHTML="";

  new FullCalendar.Calendar(el,{
    initialView:'dayGridMonth',
    height:600,
    events
  }).render();
}