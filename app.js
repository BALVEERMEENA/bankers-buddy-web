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

  // ---- Tabs -------------------------------------------------------------
  function activateTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("is-active", p.id === name);
    });
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

    recalcAll();
  });
})();
