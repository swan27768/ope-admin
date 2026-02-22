/* =========================
   KONFIGURAATIO
========================= */

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzGWgH48X06M5qGcxAy51upLG2tQaspR_2MSFV1-lpgZzAG-zLhxft-udRbyQdf_3-aAw/exec";

// =========================
// HELPERS
// =========================
function el(id) {
  return document.getElementById(id);
}

function getAdminPassword() {
  const input = document.getElementById("adminPassword");

  if (!input) {
    console.error("adminPassword input ei löydy DOMista.");
    return "";
  }

  return input.value.trim();
}

function jsonpRequest(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
    const script = document.createElement("script");

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        delete window[cbName];
      } catch (_) {}
      script.remove();
      clearTimeout(timer);
    };

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    // Lisää callback param
    const sep = url.includes("?") ? "&" : "?";
    script.src =
      url + sep + "callback=" + encodeURIComponent(cbName) + "&_=" + Date.now();

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

// =========================
// UI: LIST PUZZLES
// =========================
async function loadPuzzleList() {
  const list = el("puzzleList");
  if (!list) return;

  list.innerHTML = "Ladataan sanasettejä...";

  try {
    // listPuzzles ei välttämättä vaadi salasanaa, mutta jos haluat suojata senkin,
    // lisää &password=...
    const data = await jsonpRequest(WEBAPP_URL + "?action=listPuzzles");

    if (!Array.isArray(data)) {
      list.innerHTML = "Virhe: listPuzzles ei palauttanut listaa.";
      return;
    }

    if (data.length === 0) {
      list.innerHTML = "<i>Ei sanasettejä.</i>";
      return;
    }

    let html = "";
    data.forEach((set) => {
      html += `
        <div class="puzzle-card">
          <div class="puzzle-head">
            <div><b>Set ID:</b> ${escapeHtml(String(set.setId || ""))}</div>
            <button class="danger" onclick="deletePuzzle('${escapeAttr(String(set.setId || ""))}')">Poista</button>
          </div>
      `;

      (set.groups || []).forEach((g) => {
        const words = Array.isArray(g.words) ? g.words.join(", ") : "";
        html += `<div class="puzzle-row"><b>${escapeHtml(String(g.name || ""))}</b> → ${escapeHtml(words)}</div>`;
      });

      html += `</div>`;
    });

    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    list.innerHTML = "Virhe: sanasettien lataus epäonnistui.";
  }
}

// =========================
// ACTION: DELETE PUZZLE
// =========================
async function deletePuzzle(setId) {
  const pwd = getAdminPassword();
  console.log("PASSWORD SENT:", pwd);
  if (!pwd) {
    alert("Salasana puuttuu.");
    return;
  }

  if (!setId) {
    alert("setId puuttuu.");
    return;
  }

  const ok = confirm(`Poistetaanko sanasetti ${setId}?`);
  if (!ok) return;

  try {
    const url =
      WEBAPP_URL +
      "?action=deletePuzzle" +
      "&setId=" +
      encodeURIComponent(setId) +
      "&password=" +
      encodeURIComponent(pwd);

    const res = await jsonpRequest(url);

    if (res && res.status === "ok") {
      alert(`Poistettu! Rivejä poistettu: ${res.deleted ?? "?"}`);
      await loadPuzzleList();
    } else {
      alert("Virhe: " + (res?.message || "Tuntematon virhe"));
    }
  } catch (err) {
    console.error(err);
    alert("Poisto epäonnistui (verkko / URL / Apps Script).");
  }
}

// =========================
// ACTION: CLEAR LEADERBOARD
// =========================
async function clearLeaderboard() {
  const pwd = getAdminPassword();
  if (!pwd) {
    alert("Salasana puuttuu.");
    return;
  }

  const ok = confirm("Tyhjennetäänkö tulostaulu kokonaan?");
  if (!ok) return;

  try {
    const url =
      WEBAPP_URL + "?action=clear" + "&password=" + encodeURIComponent(pwd);

    const res = await jsonpRequest(url);

    if (res && res.status === "ok") {
      alert("Tulostaulu tyhjennetty.");
      if (res && res.status === "ok") {
        alert("Tulostaulu tyhjennetty.");
        await loadAdminLeaderboard();
      }
    } else {
      alert("Virhe: " + (res?.message || "Tuntematon virhe"));
    }
  } catch (err) {
    console.error(err);
    alert("Tyhjennys epäonnistui (verkko / URL / Apps Script).");
  }
}

// =========================
// ACTION: ADD PUZZLE SET
// =========================
async function addPuzzleSet() {
  const pwd = getAdminPassword();
  if (!pwd) {
    alert("Salasana puuttuu.");
    return;
  }

  const ta = el("puzzleInput");
  if (!ta) {
    alert("puzzleInput puuttuu admin.html:stä.");
    return;
  }

  let groups;
  try {
    groups = JSON.parse(ta.value);
  } catch (e) {
    alert("JSON ei ole validi.");
    return;
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    alert("Syötä ryhmät JSON-taulukkona.");
    return;
  }

  // VALIDATION: täsmälleen 4 sanaa / ryhmä
  for (const g of groups) {
    if (!g || typeof g.name !== "string" || !Array.isArray(g.words)) {
      alert(
        "Virhe ryhmärakenteessa: jokaisella ryhmällä pitää olla name ja words.",
      );
      return;
    }
    if (g.words.length !== 4) {
      alert(`Ryhmällä "${g.name}" pitää olla TÄSMÄLLEEN 4 sanaa.`);
      return;
    }
    if (g.words.some((w) => !String(w || "").trim())) {
      alert(`Ryhmällä "${g.name}" on tyhjä sana — korjaa.`);
      return;
    }
  }

  try {
    const url =
      WEBAPP_URL +
      "?action=addPuzzle" +
      "&password=" +
      encodeURIComponent(pwd) +
      "&groups=" +
      encodeURIComponent(JSON.stringify(groups));

    const res = await jsonpRequest(url);

    if (res && res.status === "ok") {
      alert("Sanasetti lisätty! setId: " + (res.setId || "(tuntematon)"));
      ta.value = ""; // tyhjennä
      await loadPuzzleList();
    } else {
      alert("Virhe: " + (res?.message || "Tuntematon virhe"));
    }
  } catch (err) {
    console.error(err);
    alert("Lisäys epäonnistui (verkko / URL / Apps Script).");
  }
}

// =========================
// SAFE OUTPUT (tiny helpers)
// =========================
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  // yksinkertainen: sama kuin html
  return escapeHtml(s);
}
// =========================
// ADMIN LEADERBOARD
// =========================
async function loadAdminLeaderboard() {
  const container = el("adminResults");
  if (!container) return;

  container.innerHTML = "Ladataan tuloksia...";

  try {
    // ?all=true -> backend palauttaa kaikki tulokset
    const data = await jsonpRequest(WEBAPP_URL + "?all=true");

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<i>Ei tuloksia vielä.</i>";
      return;
    }

    // järjestetään varmuuden vuoksi pienin score ensin
    const sorted = [...data].sort(
      (a, b) => (a.score ?? 999999) - (b.score ?? 999999),
    );

    let html = `
      <table>
        <tr>
          <th>Sija</th>
          <th>Nimi</th>
          <th>Aika (s)</th>
          <th>Pisteet</th>
        </tr>
    `;

    sorted.forEach((r, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(r.name ?? "")}</td>
          <td>${Number(r.timeSeconds ?? 0)}</td>
          <td>${Number(r.score ?? 0)}</td>
        </tr>
      `;
    });

    html += `</table>`;

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML =
      "<span style='color:red'>Tulosten lataus epäonnistui.</span>";
  }
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadPuzzleList();
});
