(function () {
  "use strict";

  var taskInput = document.getElementById("taskInput");
  var amountInput = document.getElementById("amountInput");
  var unitInput = document.getElementById("unitInput");
  var correctBtn = document.getElementById("correctBtn");
  var result = document.getElementById("result");
  var receipt = document.getElementById("receipt");
  var shareBtn = document.getElementById("shareBtn");

  var SITE_URL = "https://okjoshwaa.github.io/estimation-corrector/";

  var RULES = [
    { label: "\"just\"", pattern: /\bjust\b/i, multiplier: 1.5, reason: "famous last words" },
    { label: "\"simple\" / \"easy\"", pattern: /\b(simple|easy)\b/i, multiplier: 1.4, reason: "there's no such thing" },
    { label: "\"small\"", pattern: /\bsmall\b/i, multiplier: 1.3, reason: "small is not a unit of time" },
    { label: "\"quick\"", pattern: /\bquick\b/i, multiplier: 2.2, reason: "it is never quick" },
    { label: "CSS / styling", pattern: /\b(css|styling|stylesheet)\b/i, multiplier: 1.8, reason: "CSS is never quick, ever" },
    { label: "migration / database", pattern: /\b(migration|database|schema)\b/i, multiplier: 2.3, reason: "schema changes always hide something" },
    { label: "\"one small change\"", pattern: /\b(one small change|one more thing|just one change)\b/i, multiplier: 3.2, reason: "there is no such thing as one small change" },
    { label: "refactor", pattern: /\brefactor\b/i, multiplier: 1.9, reason: "scope creep incoming" },
    { label: "third-party / integration", pattern: /\b(third[- ]party|integration|external api)\b/i, multiplier: 2.1, reason: "their docs are lying to you" },
    { label: "\"client wants\"", pattern: /\bclient (wants|asked|needs)\b/i, multiplier: 1.7, reason: "they'll want three more things after this" }
  ];

  var NO_FLAG_LINES = [
    "No red flags detected. Either this is genuinely simple, or you're in denial. We'll allow it this once.",
    "Clean description, no hedge words. Suspicious, but we respect it.",
    "Nothing here to correct. You described the task like an adult."
  ];

  function detectMultipliers(text) {
    var lower = text.toLowerCase();
    var matches = [];
    RULES.forEach(function (rule) {
      if (rule.pattern.test(lower)) matches.push(rule);
    });
    return matches;
  }

  function combineMultiplier(matches) {
    var sorted = matches.slice().sort(function (a, b) { return b.multiplier - a.multiplier; });
    var total = 1;
    sorted.forEach(function (rule, i) {
      var extra = rule.multiplier - 1;
      var decay = Math.pow(0.65, i);
      total += extra * decay;
    });
    return total;
  }

  function toHours(amount, unit) {
    if (unit === "minutes") return amount / 60;
    if (unit === "days") return amount * 8;
    return amount;
  }

  function formatHours(hours) {
    if (hours < 1) {
      var mins = Math.round(hours * 60);
      return mins + (mins === 1 ? " minute" : " minutes");
    }
    if (hours < 8) {
      var h = Math.round(hours * 10) / 10;
      return h + (h === 1 ? " hour" : " hours");
    }
    var days = Math.round((hours / 8) * 10) / 10;
    return days + (days === 1 ? " day" : " days");
  }

  function verdictLine(totalMultiplier) {
    if (totalMultiplier >= 4) return "This is now a two-sprint conversation. Tell someone today.";
    if (totalMultiplier >= 2.5) return "Tell your manager now, not after you're already late.";
    if (totalMultiplier >= 1.5) return "Still doable. Pad it and don't promise the original number out loud.";
    return "Barely adjusted. You may actually be right about this one.";
  }

  function escapeText(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function buildReceipt(task, amount, unit, matches, totalMultiplier, correctedHours) {
    var lines = [];
    lines.push('<span class="line">DEV ESTIMATE RECEIPT</span>');
    lines.push('<span class="line divider">--------------------------------</span>');
    var taskLine = task.trim() || "(no description given)";
    if (taskLine.length > 60) taskLine = taskLine.slice(0, 57) + "...";
    lines.push('<span class="line">Task:  ' + escapeText(taskLine) + '</span>');
    lines.push('<span class="line">Quote: ' + amount + " " + unit + '</span>');
    lines.push('<span class="line divider">--------------------------------</span>');

    if (matches.length === 0) {
      lines.push('<span class="line">(no red flags detected)</span>');
    } else {
      matches.forEach(function (rule) {
        var pad = 26 - rule.label.length;
        var dots = pad > 0 ? " " + new Array(pad).join(".") : "";
        lines.push(
          '<span class="line">+ ' + escapeText(rule.label) + dots +
          ' <span class="multiplier">x' + rule.multiplier.toFixed(1) + '</span></span>' +
          '<span class="line" style="color:#6b7280; font-size:11px;">  ' + escapeText(rule.reason) + '</span>'
        );
      });
    }

    lines.push('<span class="line divider">--------------------------------</span>');
    lines.push('<span class="line">Combined multiplier: x' + totalMultiplier.toFixed(2) + '</span>');
    lines.push('<span class="line total">CORRECTED ESTIMATE: ' + formatHours(correctedHours) + '</span>');
    lines.push('<span class="line divider">--------------------------------</span>');

    var snark = matches.length === 0
      ? NO_FLAG_LINES[Math.floor(Math.random() * NO_FLAG_LINES.length)]
      : verdictLine(totalMultiplier);
    lines.push('<span class="line snark">' + escapeText(snark) + '</span>');

    return lines.join("\n");
  }

  var lastResult = null;

  function buildShareText(task, amount, unit, totalMultiplier, correctedHours) {
    var taskShort = task.trim() || "a task";
    if (taskShort.length > 80) taskShort = taskShort.slice(0, 77) + "...";

    var lines;
    if (totalMultiplier === 1) {
      lines = [
        'I asked the Estimation Corrector to catch me lying about "' + taskShort + '"',
        "My estimate: " + amount + " " + unit + ". No red flags found. Suspicious.",
        "",
        SITE_URL
      ];
    } else {
      lines = [
        'I said "' + taskShort + '" would take ' + amount + " " + unit + ".",
        "The Estimation Corrector said " + formatHours(correctedHours) + " (x" + totalMultiplier.toFixed(2) + ").",
        "It was right.",
        "",
        SITE_URL
      ];
    }
    return lines.join("\n");
  }

  function openShareIntent() {
    if (!lastResult) return;
    var text = buildShareText(
      lastResult.task,
      lastResult.amount,
      lastResult.unit,
      lastResult.totalMultiplier,
      lastResult.correctedHours
    );
    var url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function run() {
    var task = taskInput.value;
    var amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount < 0) amount = 0;
    var unit = unitInput.value;

    var matches = detectMultipliers(task);
    var totalMultiplier = matches.length ? combineMultiplier(matches) : 1;
    var correctedHours = toHours(amount, unit) * totalMultiplier;

    receipt.innerHTML = buildReceipt(task, amount, unit, matches, totalMultiplier, correctedHours);
    result.classList.remove("hidden");

    lastResult = {
      task: task,
      amount: amount,
      unit: unit,
      totalMultiplier: totalMultiplier,
      correctedHours: correctedHours
    };
  }

  correctBtn.addEventListener("click", run);
  shareBtn.addEventListener("click", openShareIntent);

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      taskInput.value = chip.getAttribute("data-task");
      amountInput.value = chip.getAttribute("data-amount");
      unitInput.value = chip.getAttribute("data-unit");
      run();
    });
  });

  taskInput.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  });
})();
