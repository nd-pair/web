/* Physical AI and Robotics Initiative — small progressive enhancements on top of
   the ND Web Theme. Everything the pages show is already in the HTML; this file
   only adds behaviour. */
(function () {
  "use strict";

  /* Members' gate. A soft gate over public data — it keeps the preview out of
     casual view, and is not a security boundary. */
  var HASH = "7481995bf6b9ebdd5defda06e5d81290fe7dd29ae422ee1b8e0104c95296eb10";
  function sha256(s) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) {
        return x.toString(16).padStart(2, "0");
      }).join("");
    });
  }
  if (sessionStorage.getItem("nd_pair_site") !== "1" && window.crypto && crypto.subtle) {
    var gate = document.createElement("div");
    gate.className = "gate";
    gate.innerHTML =
      '<div class="gate-inner">' +
      '<h1>Physical AI and Robotics Initiative</h1>' +
      '<p>Members’ preview — please enter the access phrase.</p>' +
      '<form id="gate-form">' +
      '<label for="gate-pw">Access phrase</label>' +
      '<input id="gate-pw" class="search-input" type="password" autocomplete="current-password">' +
      '<p class="btn-list"><button class="btn btn--cta" type="submit">Enter</button></p>' +
      '<p class="gate-error" id="gate-error" role="alert"></p>' +
      '</form></div>';
    document.body.appendChild(gate);
    document.documentElement.style.overflow = "hidden";
    document.getElementById("gate-pw").focus();
    document.getElementById("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      sha256(document.getElementById("gate-pw").value).then(function (h) {
        if (h === HASH) {
          sessionStorage.setItem("nd_pair_site", "1");
          gate.remove();
          document.documentElement.style.overflow = "";
        } else {
          document.getElementById("gate-error").textContent = "That phrase is not right.";
        }
      });
    });
  }

  /* Global-menu search: scope the query to this site before handing it to Google.
     Without JavaScript the form still submits as an ordinary web search. */
  var search = document.getElementById("site-search");
  if (search) {
    search.addEventListener("submit", function () {
      var input = search.querySelector('input[name="q"]');
      if (input && input.value.indexOf("site:") === -1) {
        input.value = "site:nd-pair.github.io/web " + input.value.trim();
      }
    });
  }

  /* Publications: filter the pre-rendered list as the visitor types. */
  var q = document.getElementById("pub-q");
  if (!q) return;
  var status = document.getElementById("pub-status");
  var years = Array.prototype.slice.call(document.querySelectorAll(".pub-year"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".pub-list > li"));
  items.forEach(function (li) { li.dataset.s = li.textContent.toLowerCase().replace(/\s+/g, " "); });

  var timer;
  function apply() {
    var term = q.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (li) {
      var hit = !term || li.dataset.s.indexOf(term) !== -1;
      li.hidden = !hit;
      if (hit) shown++;
    });
    years.forEach(function (sec) {
      sec.hidden = !sec.querySelector(".pub-list > li:not([hidden])");
    });
    if (status) {
      status.textContent = term
        ? shown.toLocaleString() + (shown === 1 ? " publication matches “" : " publications match “") + q.value.trim() + "”"
        : "";
    }
  }
  q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
  q.form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
})();
