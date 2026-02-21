const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzYsp-fhv4lzHAZrKZ4QpIfhxinawoO6NdbkyMoSs1qlYQ8SMNUrOk76omfGkmaDxvu/exec";

const REFRESH_MS = 3000;

/* =========================
   LEADERBOARD (ALL DATA)
========================= */

function loadAdminLeaderboard() {
  const cbName = "admin_cb_" + Date.now();
  const script = document.createElement("script");

  window[cbName] = function (data) {
    let html = `
      <table>
        <tr>
          <th>#</th>
          <th>Nimi</th>
          <th>Pisteet</th>
        </tr>
    `;

    data.forEach((r, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${r.name}</td>
          <td>${r.score}</td>
        </tr>
      `;
    });

    html += "</table>";

    document.getElementById("adminResults").innerHTML = html;

    delete window[cbName];
    script.remove();
  };

  script.src = WEBAPP_URL + "?callback=" + cbName + "&all=true&_=" + Date.now();
  document.body.appendChild(script);
}

/* =========================
   TYHJENNYS
========================= */

function clearLeaderboard() {
  if (!confirm("Haluatko varmasti tyhjentää tulostaulun?")) return;

  const img = new Image();
  img.src = WEBAPP_URL + "?action=clear&_=" + Date.now();

  setTimeout(loadAdminLeaderboard, 1000);
}
function addPuzzleSet() {
  const raw = document.getElementById("puzzleInput").value;

  let groups;

  try {
    groups = JSON.parse(raw);
  } catch (e) {
    alert("Virhe JSON-muodossa");
    return;
  }

  const setId = "set_" + Date.now();

  const url =
    WEBAPP_URL +
    "?action=addPuzzle" +
    "&setId=" +
    encodeURIComponent(setId) +
    "&groups=" +
    encodeURIComponent(JSON.stringify(groups)) +
    "&_=" +
    Date.now();

  const img = new Image();
  img.onload = () => alert("Sanasetti lisätty!");
  img.src = url;
}
function loadPuzzleList() {
  fetch(WEBAPP_URL + "?action=listPuzzles")
    .then((res) => res.json())
    .then((data) => {
      const container = document.getElementById("puzzleList");

      if (!data || data.length === 0) {
        container.innerHTML = `
          <div class="panel">
            <div class="info">Ei sanasettejä löytynyt.</div>
          </div>
        `;
        return;
      }

      let html = "";

      data.forEach((set) => {
        html += `
          <div class="puzzle-card">
            <div class="puzzle-header">
              <span><strong>Set ID:</strong> ${set.setId}</span>
              <button class="danger" onclick="deletePuzzle('${set.setId}')">
                Poista
              </button>
            </div>
        `;

        set.groups.forEach((group) => {
          html += `
            <div class="word-list">
              <span class="group-name">${group.name}</span>
              → ${group.words.join(", ")}
            </div>
          `;
        });

        html += `</div>`;
      });

      container.innerHTML = html;
    })
    .catch((err) => {
      console.error("Virhe ladattaessa sanasettejä:", err);
      document.getElementById("puzzleList").innerHTML = `
        <div class="panel">
          <div class="info">Virhe ladattaessa sanasettejä.</div>
        </div>
      `;
    });
}

function deletePuzzle(setId) {
  if (!confirm("Poistetaanko tämä sanasetti?")) return;

  fetch(WEBAPP_URL + "?action=deletePuzzle&setId=" + setId).then(() =>
    loadPuzzleList(),
  );
}

/* =========================
   AUTO REFRESH
========================= */

loadAdminLeaderboard();

setInterval(() => {
  loadAdminLeaderboard();
}, REFRESH_MS);
