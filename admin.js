/* =========================
   KONFIGURAATIO
========================= */

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzGWgH48X06M5qGcxAy51upLG2tQaspR_2MSFV1-lpgZzAG-zLhxft-udRbyQdf_3-aAw/exec";

/* =========================
   SALASANA
========================= */

function setAdminPassword(password) {
  localStorage.setItem("adminPassword", password);
}

function getAdminPassword() {
  return localStorage.getItem("adminPassword");
}

/* =========================
   CLEAR LEADERBOARD
========================= */

function clearLeaderboard() {
  const password = getAdminPassword();

  fetch(
    WEBAPP_URL + "?action=clear" + "&password=" + encodeURIComponent(password),
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        alert("Tulostaulu tyhjennetty.");
      } else {
        alert("Virhe: " + data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Tyhjennys epäonnistui.");
    });
}

/* =========================
   ADD PUZZLE SET
========================= */

function addPuzzleSet() {
  const password = getAdminPassword();
  if (!password) {
    alert("Anna salasana ensin.");
    return;
  }

  let groups;

  try {
    groups = JSON.parse(document.getElementById("puzzleInput").value);
  } catch (e) {
    alert("Virheellinen JSON.");
    return;
  }

  fetch(
    WEBAPP_URL +
      "?action=addPuzzle" +
      "&password=" +
      encodeURIComponent(password) +
      "&groups=" +
      encodeURIComponent(JSON.stringify(groups)),
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        alert("Sanasetti lisätty.");
        document.getElementById("puzzleInput").value = "";
        loadPuzzleList();
      } else {
        alert("Virhe: " + data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Lisäys epäonnistui.");
    });
}

/* =========================
   DELETE PUZZLE
========================= */

function deletePuzzle(setId) {
  const password = getAdminPassword();
  if (!password) {
    alert("Anna salasana ensin.");
    return;
  }

  if (!confirm("Poistetaanko tämä sanasetti?")) return;

  fetch(
    WEBAPP_URL +
      "?action=deletePuzzle" +
      "&setId=" +
      encodeURIComponent(setId) +
      "&password=" +
      encodeURIComponent(password),
  )
    .then((res) => res.json())
    .then((data) => {
      console.log("DELETE RESPONSE:", data);

      if (data.status === "ok") {
        document.getElementById("puzzleList").innerHTML = "Päivitetään...";

        setTimeout(() => {
          loadPuzzleList();
        }, 300);
      } else {
        alert("Virhe: " + data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Poisto epäonnistui.");
    });
}

/* =========================
   LOAD PUZZLE LIST
========================= */

function loadPuzzleList() {
  const container = document.getElementById("puzzleList");
  container.innerHTML = "Ladataan...";

  fetch(WEBAPP_URL + "?action=listPuzzles&_=" + Date.now())
    .then((res) => res.json())
    .then((data) => {
      let html = "";

      if (!data.length) {
        html = "<p>Ei sanasettejä.</p>";
      }

      data.forEach((set) => {
        html += `
          <div class="puzzle-card">
            <div class="puzzle-header">
              <strong>Set ID:</strong> ${set.setId}
              <button onclick="deletePuzzle('${set.setId}')">
                Poista
              </button>
            </div>
        `;

        set.groups.forEach((group) => {
          html += `
            <div class="puzzle-group">
              <b>${group.name}</b> → ${group.words.join(", ")}
            </div>
          `;
        });

        html += `</div>`;
      });

      container.innerHTML = html;
    })
    .catch((err) => {
      console.error(err);
      container.innerHTML = "Listan lataus epäonnistui.";
    });
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const existingPassword = getAdminPassword();

  if (!existingPassword) {
    const password = prompt("Anna opettajan salasana:");
    if (password) {
      setAdminPassword(password);
    }
  }

  loadPuzzleList();
});
