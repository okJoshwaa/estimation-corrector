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

    return { html: lines.join("\n"), snark: snark };
  }

  var lastResult = null;

  function buildShareCaption(totalMultiplier) {
    if (totalMultiplier === 1) {
      return "Ran my estimate through the Estimation Corrector. No red flags found. Suspicious.\n\n" + SITE_URL;
    }
    return "Ran my estimate through the Estimation Corrector. It caught me.\n\n" + SITE_URL;
  }

  // ---- Shareable panel (drawn on canvas, not a DOM screenshot) ----

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function glow(ctx, x, y, r, color) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    var words = text.split(/\s+/).filter(Boolean);
    var lines = [];
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines) break;
      } else {
        line = test;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (words.length && lines.length === maxLines) {
      var last = lines[maxLines - 1] || "";
      while (ctx.measureText(last + "…").width > maxWidth && last.length > 0) {
        last = last.slice(0, -1);
      }
      var consumed = lines.slice(0, maxLines - 1).join(" ").length;
      if (consumed + last.length < text.length) last += "…";
      lines[maxLines - 1] = last;
    }
    return lines;
  }

  function pill(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.font = opts.font || "700 20px monospace";
    var padX = opts.padX != null ? opts.padX : 16;
    var h = opts.height || 40;
    var w = ctx.measureText(text).width + padX * 2;
    ctx.fillStyle = opts.bg || "rgba(96,165,250,0.12)";
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.stroke();
    }
    ctx.fillStyle = opts.color || "#60a5fa";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  }

  function drawSharePanel(r) {
    var W = 1200, H = 600, M = 56;
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif";
    var MONO = '"SF Mono", Menlo, Consolas, monospace';

    ctx.fillStyle = "#0b0d11";
    ctx.fillRect(0, 0, W, H);
    glow(ctx, 90, 40, 280, "rgba(96,165,250,0.22)");
    glow(ctx, W - 60, H - 40, 320, "rgba(167,139,250,0.2)");

    ctx.strokeStyle = "rgba(96,165,250,0.22)";
    ctx.lineWidth = 2;
    roundRect(ctx, 16, 16, W - 32, H - 32, 22);
    ctx.stroke();

    // badge
    pill(ctx, "⏱ ESTIMATE ≠ REALITY", M, 48, {
      font: "700 16px " + MONO,
      bg: "rgba(96,165,250,0.1)",
      border: "rgba(96,165,250,0.3)",
      color: "#60a5fa",
      height: 34,
      padX: 14
    });

    // title
    var grad = ctx.createLinearGradient(M, 0, M + 620, 0);
    grad.addColorStop(0, "#60a5fa");
    grad.addColorStop(1, "#a78bfa");
    ctx.fillStyle = grad;
    ctx.font = "800 44px " + FONT;
    ctx.fillText("The Estimation Corrector", M, 148);

    // task
    ctx.fillStyle = "#8b91a0";
    ctx.font = "700 15px " + MONO;
    ctx.fillText("TASK", M, 190);

    ctx.fillStyle = "#eef0f4";
    ctx.font = "26px " + FONT;
    var taskText = (r.task || "").trim() || "(no description given)";
    var taskLines = wrapLines(ctx, taskText, W - M * 2, 2);
    taskLines.forEach(function (line, i) {
      ctx.fillText(line, M, 224 + i * 34);
    });
    var afterTaskY = 224 + taskLines.length * 34 + 14;

    // matched rule pills
    var pillY = afterTaskY;
    if (r.matches && r.matches.length) {
      var px = M;
      var rowLimit = W - M;
      r.matches.slice(0, 5).forEach(function (rule) {
        var label = rule.label.replace(/\\"/g, '"') + " x" + rule.multiplier.toFixed(1);
        var w = ctx.measureText(label).width; // rough pre-measure font not set yet, set below
        ctx.font = "700 15px " + MONO;
        w = ctx.measureText(label).width + 28;
        if (px + w > rowLimit) {
          px = M;
          pillY += 44;
        }
        var used = pill(ctx, label, px, pillY, {
          font: "700 15px " + MONO,
          bg: "rgba(251,191,36,0.1)",
          border: "rgba(251,191,36,0.3)",
          color: "#fbbf24",
          height: 34,
          padX: 14
        });
        px += used + 10;
      });
      pillY += 44 + 14;
    } else {
      pill(ctx, "no red flags detected", M, pillY, {
        font: "700 15px " + MONO,
        bg: "rgba(52,211,153,0.1)",
        border: "rgba(52,211,153,0.3)",
        color: "#34d399",
        height: 34,
        padX: 14
      });
      pillY += 44 + 14;
    }

    // stats row
    var statsY = Math.max(pillY, 388);
    ctx.fillStyle = "#8b91a0";
    ctx.font = "700 15px " + MONO;
    ctx.fillText("QUOTED", M, statsY);
    ctx.fillStyle = "#f87171";
    ctx.font = "800 46px " + MONO;
    var quotedStr = r.amount + " " + r.unit;
    ctx.fillText(quotedStr, M, statsY + 52);

    var arrowX = M + Math.max(ctx.measureText(quotedStr).width, 160) + 40;
    ctx.fillStyle = "#4b5160";
    ctx.font = "40px " + FONT;
    ctx.fillText("→", arrowX, statsY + 40);

    var correctedX = arrowX + 64;
    ctx.fillStyle = "#8b91a0";
    ctx.font = "700 15px " + MONO;
    ctx.fillText("CORRECTED", correctedX, statsY);
    ctx.fillStyle = "#34d399";
    ctx.font = "800 46px " + MONO;
    ctx.fillText(formatHours(r.correctedHours), correctedX, statsY + 52);

    // multiplier badge, right aligned
    var multLabel = "×" + r.totalMultiplier.toFixed(2);
    ctx.font = "800 26px " + MONO;
    var multW = ctx.measureText(multLabel).width + 32;
    var multX = W - M - multW;
    pill(ctx, multLabel, multX, statsY - 6, {
      font: "800 26px " + MONO,
      bg: "rgba(167,139,250,0.12)",
      border: "rgba(167,139,250,0.35)",
      color: "#a78bfa",
      height: 56,
      padX: 16
    });

    // snark / verdict line
    var snarkY = statsY + 100;
    ctx.fillStyle = "#a78bfa";
    ctx.font = "italic 22px " + FONT;
    var snarkLines = wrapLines(ctx, r.snark || "", W - M * 2, 2);
    snarkLines.forEach(function (line, i) {
      ctx.fillText(line, M, snarkY + i * 30);
    });

    // footer
    ctx.fillStyle = "#5a6070";
    ctx.font = "16px " + MONO;
    ctx.fillText(SITE_URL, M, H - 40);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, "image/png");
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function canUseNativeShare(file) {
    return !!(navigator.share && navigator.canShare && file && navigator.canShare({ files: [file] }));
  }

  function openShareIntent() {
    if (!lastResult) return;
    var canvas = drawSharePanel(lastResult);
    var caption = buildShareCaption(lastResult.totalMultiplier);

    canvasToBlob(canvas).then(function (blob) {
      if (!blob) return;
      var file;
      try {
        file = new File([blob], "estimation-corrector.png", { type: "image/png" });
      } catch (e) {
        file = null;
      }

      if (canUseNativeShare(file)) {
        navigator.share({
          files: [file],
          text: caption
        }).catch(function () {
          // user cancelled the share sheet — nothing to do
        });
        return;
      }

      downloadBlob(blob, "estimation-corrector.png");
      var url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(caption + "\n\n(attach the image that just downloaded)");
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  function run() {
    var task = taskInput.value;
    var amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount < 0) amount = 0;
    var unit = unitInput.value;

    var matches = detectMultipliers(task);
    var totalMultiplier = matches.length ? combineMultiplier(matches) : 1;
    var correctedHours = toHours(amount, unit) * totalMultiplier;

    var built = buildReceipt(task, amount, unit, matches, totalMultiplier, correctedHours);
    receipt.innerHTML = built.html;
    result.classList.remove("hidden");

    lastResult = {
      task: task,
      amount: amount,
      unit: unit,
      matches: matches,
      totalMultiplier: totalMultiplier,
      correctedHours: correctedHours,
      snark: built.snark
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
