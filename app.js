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

  // ---- Rate comparison (FD + Home Loan) --------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function statusBadge(status) {
    if (status === "live") return '<span class="badge live">live</span>';
    if (status === "stale") return '<span class="badge stale">stale</span>';
    if (status === "error") return '<span class="badge error">unavailable</span>';
    return '<span class="badge sample">sample</span>';
  }

  // Per-panel state. Each rate tab has its own data + config.
  var panels = {
    rates: {
      file: "data/rates.json",
      noun: "Fixed-deposit",
      data: null,
      loaded: false,
      // Best FD figure = highest of general/senior for the chosen audience.
      pick: function (bank) {
        var audience =
          (document.getElementById("rates-audience") || {}).value || "general";
        var best = null;
        (bank.rates || []).forEach(function (r) {
          var v = audience === "senior" ? r.senior || r.general : r.general;
          if (v != null && (best == null || v > best.value)) {
            best = { value: v, label: r.tenure };
          }
        });
        return best;
      },
      better: "higher",
      headCols: ["Tenure", "General", "Senior"],
      row: function (r) {
        var g = r.general != null ? r.general.toFixed(2) + "%" : "—";
        var s = r.senior != null ? r.senior.toFixed(2) + "%" : "—";
        return "<tr><td>" + esc(r.tenure) + "</td><td>" + g + "</td><td>" + s + "</td></tr>";
      },
    },
    homeloan: {
      file: "data/home-loan-rates.json",
      noun: "Home-loan",
      data: null,
      loaded: false,
      // Best home-loan figure = lowest starting (min) rate.
      pick: function (bank) {
        var best = null;
        (bank.rates || []).forEach(function (r) {
          if (r.min != null && (best == null || r.min < best.value)) {
            best = { value: r.min, label: r.category };
          }
        });
        return best;
      },
      better: "lower",
      headCols: ["Category", "Interest rate (p.a.)"],
      row: function (r) {
        var rate =
          r.min != null
            ? r.max != null && r.max !== r.min
              ? r.min.toFixed(2) + "% – " + r.max.toFixed(2) + "%"
              : r.min.toFixed(2) + "%"
            : "—";
        return "<tr><td>" + esc(r.category) + "</td><td>" + rate + "</td></tr>";
      },
    },
  };

  function renderPanel(key) {
    var cfg = panels[key];
    if (!cfg.data) return;
    var lower = cfg.better === "lower";
    var meta = document.getElementById(key + "-meta");
    var bestEl = document.getElementById(key + "-best");
    var listEl = document.getElementById(key + "-list");
    var disc = document.getElementById(key + "-disclaimer");

    var updated = cfg.data.updatedAt
      ? new Date(cfg.data.updatedAt).toLocaleDateString()
      : "unknown";
    meta.textContent =
      cfg.noun + " rates across " + (cfg.data.banks || []).length +
      " banks · updated " + updated;
    disc.textContent = cfg.data.disclaimer || "";

    var ranked = (cfg.data.banks || [])
      .map(function (b) { return { bank: b, best: cfg.pick(b) }; })
      .filter(function (x) { return x.best; })
      .sort(function (a, b) {
        return lower ? a.best.value - b.best.value : b.best.value - a.best.value;
      });

    bestEl.innerHTML = ranked
      .slice(0, 3)
      .map(function (x, i) {
        var medal = ["🥇", "🥈", "🥉"][i] || "";
        return (
          '<div class="best-card">' +
          '<span class="best-medal">' + medal + "</span>" +
          '<span class="best-rate">' +
          (lower ? "from " : "") + x.best.value.toFixed(2) + "%</span>" +
          '<span class="best-bank">' + esc(x.bank.name) + "</span>" +
          '<span class="best-tenure">' + esc(x.best.label) + "</span>" +
          "</div>"
        );
      })
      .join("");

    var head =
      "<thead><tr>" +
      cfg.headCols.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead>";

    listEl.innerHTML = ranked
      .map(function (x, idx) {
        var b = x.bank;
        var top = lower
          ? 'from <strong>' + x.best.value.toFixed(2) + "%</strong>"
          : 'up to <strong>' + x.best.value.toFixed(2) + "%</strong>";
        var rows = (b.rates || []).map(cfg.row).join("");
        return (
          '<details class="bank-card"' + (idx === 0 ? " open" : "") + ">" +
          "<summary>" +
          '<span class="bank-name">' + esc(b.name) + " " + statusBadge(b.status) +
          "</span>" +
          '<span class="bank-top">' + top + "</span>" +
          "</summary>" +
          '<div class="table-scroll"><table class="rate-table">' + head +
          "<tbody>" + rows + "</tbody></table></div>" +
          '<a class="bank-source" href="' + esc(b.source) +
          '" target="_blank" rel="noopener">Source ↗</a>' +
          "</details>"
        );
      })
      .join("");
  }

  function loadPanel(key, force) {
    var cfg = panels[key];
    if (cfg.loaded && !force) return;
    cfg.loaded = true;
    var meta = document.getElementById(key + "-meta");
    meta.textContent = "Loading rates…";
    fetch(cfg.file, { cache: force ? "reload" : "default" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        cfg.data = data;
        renderPanel(key);
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
    var isRateTab = name === "rates" || name === "homeloan";
    var curNote = document.querySelector(".currency-note");
    if (curNote) curNote.style.display = isRateTab ? "none" : "";
    if (isRateTab) loadPanel(name, false);
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
      .addEventListener("change", function () {
        renderPanel("rates");
      });
    document
      .getElementById("rates-refresh")
      .addEventListener("click", function () {
        loadPanel("rates", true);
      });
    document
      .getElementById("homeloan-refresh")
      .addEventListener("click", function () {
        loadPanel("homeloan", true);
      });

    recalcAll();
  });
})();
