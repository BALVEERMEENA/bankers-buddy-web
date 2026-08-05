// Banker's Buddy — client-side banking calculators. No data leaves the browser.
(function () {
  "use strict";

  // ---- Currency formatting ---------------------------------------------
  var locale = "en-IN";
  var currency = "INR";

  function money(value) {
    if (!isFinite(value)) return "—";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch (e) {
      return value.toFixed(0);
    }
  }

  function num(id) {
    var el = document.getElementById(id);
    var v = parseFloat(el && el.value);
    return isFinite(v) && v >= 0 ? v : 0;
  }

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ---- Calculators ------------------------------------------------------
  function calcEMI() {
    var p = num("emi-principal");
    var annualRate = num("emi-rate");
    var months = num("emi-years") * 12;
    var r = annualRate / 12 / 100;

    var emi;
    if (months <= 0) {
      emi = 0;
    } else if (r === 0) {
      emi = p / months;
    } else {
      var f = Math.pow(1 + r, months);
      emi = (p * r * f) / (f - 1);
    }
    var total = emi * months;
    var interest = total - p;

    set("emi-monthly", money(emi));
    set("emi-interest", money(interest));
    set("emi-total", money(total));
  }

  function calcFD() {
    var p = num("fd-principal");
    var annualRate = num("fd-rate") / 100;
    var years = num("fd-years");
    var n = parseFloat(document.getElementById("fd-freq").value) || 1;

    var maturity = p * Math.pow(1 + annualRate / n, n * years);
    var earned = maturity - p;

    set("fd-maturity", money(maturity));
    set("fd-earned", money(earned));
    set("fd-base", money(p));
  }

  function calcSIP() {
    var a = num("sip-amount");
    var annualRate = num("sip-rate");
    var months = num("sip-years") * 12;
    var i = annualRate / 12 / 100;

    var value;
    if (months <= 0) {
      value = 0;
    } else if (i === 0) {
      value = a * months;
    } else {
      // Future value of an annuity-due (invested at the start of each month).
      value = a * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    }
    var invested = a * months;
    var gains = value - invested;

    set("sip-value", money(value));
    set("sip-invested", money(invested));
    set("sip-gains", money(gains));
  }

  function recalcAll() {
    calcEMI();
    calcFD();
    calcSIP();
  }

  // ---- FD Rates ---------------------------------------------------------
  var ratesData = null;
  var ratesLoaded = false;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function bestRateFor(bank, audience) {
    var best = null;
    (bank.rates || []).forEach(function (row) {
      var v = audience === "senior" ? row.senior || row.general : row.general;
      if (v != null && (best == null || v > best.value)) {
        best = { value: v, tenure: row.tenure };
      }
    });
    return best;
  }

  function renderRates() {
    if (!ratesData) return;
    var audience = document.getElementById("rates-audience").value;
    var meta = document.getElementById("rates-meta");
    var bestEl = document.getElementById("rates-best");
    var listEl = document.getElementById("rates-list");
    var disc = document.getElementById("rates-disclaimer");

    var updated = ratesData.updatedAt
      ? new Date(ratesData.updatedAt).toLocaleDateString()
      : "unknown";
    meta.textContent = "Fixed-deposit rates across " +
      (ratesData.banks || []).length + " banks · updated " + updated;
    disc.textContent = ratesData.disclaimer || "";

    // Best-rate leaderboard
    var ranked = (ratesData.banks || [])
      .map(function (b) {
        return { bank: b, best: bestRateFor(b, audience) };
      })
      .filter(function (x) { return x.best; })
      .sort(function (a, b) { return b.best.value - a.best.value; });

    bestEl.innerHTML = ranked
      .slice(0, 3)
      .map(function (x, i) {
        var medal = ["🥇", "🥈", "🥉"][i] || "";
        return (
          '<div class="best-card">' +
          '<span class="best-medal">' + medal + "</span>" +
          '<span class="best-rate">' + x.best.value.toFixed(2) + "%</span>" +
          '<span class="best-bank">' + esc(x.bank.name) + "</span>" +
          '<span class="best-tenure">' + esc(x.best.tenure) + "</span>" +
          "</div>"
        );
      })
      .join("");

    // Per-bank tables
    listEl.innerHTML = ranked
      .map(function (x) {
        var b = x.bank;
        var badge =
          b.status === "live"
            ? '<span class="badge live">live</span>'
            : b.status === "stale"
            ? '<span class="badge stale">stale</span>'
            : b.status === "error"
            ? '<span class="badge error">unavailable</span>'
            : '<span class="badge sample">sample</span>';
        var rows = (b.rates || [])
          .map(function (r) {
            var g = r.general != null ? r.general.toFixed(2) + "%" : "—";
            var s = r.senior != null ? r.senior.toFixed(2) + "%" : "—";
            return (
              "<tr><td>" + esc(r.tenure) + "</td><td>" + g +
              "</td><td>" + s + "</td></tr>"
            );
          })
          .join("");
        return (
          '<details class="bank-card"' + (ranked.indexOf(x) === 0 ? " open" : "") + ">" +
          "<summary>" +
          '<span class="bank-name">' + esc(b.name) + " " + badge + "</span>" +
          '<span class="bank-top">up to <strong>' + x.best.value.toFixed(2) +
          "%</strong></span>" +
          "</summary>" +
          '<div class="table-scroll"><table class="rate-table">' +
          "<thead><tr><th>Tenure</th><th>General</th><th>Senior</th></tr></thead>" +
          "<tbody>" + rows + "</tbody></table></div>" +
          '<a class="bank-source" href="' + esc(b.source) +
          '" target="_blank" rel="noopener">Source ↗</a>' +
          "</details>"
        );
      })
      .join("");
  }

  function loadRates(force) {
    if (ratesLoaded && !force) return;
    ratesLoaded = true;
    var meta = document.getElementById("rates-meta");
    meta.textContent = "Loading rates…";
    fetch("data/rates.json", { cache: force ? "reload" : "default" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        ratesData = data;
        renderRates();
      })
      .catch(function (err) {
        meta.textContent =
          "Couldn't load rates (" + err.message +
          "). If viewing locally, run a server (see README) — fetch is blocked on file://.";
      });
  }

  // ---- Tabs -------------------------------------------------------------
  function activateTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("is-active", p.id === name);
    });
    var curNote = document.querySelector(".currency-note");
    if (curNote) curNote.style.display = name === "rates" ? "none" : "";
    if (name === "rates") loadRates(false);
  }

  // ---- Wire up ----------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        activateTab(t.dataset.tab);
      });
    });

    document.querySelectorAll("input, select").forEach(function (el) {
      if (el.id === "currency") return;
      el.addEventListener("input", recalcAll);
    });

    var cur = document.getElementById("currency");
    cur.addEventListener("change", function () {
      var parts = cur.value.split("|");
      locale = parts[0];
      currency = parts[1];
      recalcAll();
    });

    document
      .getElementById("rates-audience")
      .addEventListener("change", renderRates);
    document
      .getElementById("rates-refresh")
      .addEventListener("click", function () {
        loadRates(true);
      });

    recalcAll();
  });
})();
