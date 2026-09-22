(function () {
  "use strict";

  var canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var width, height;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  var mouse = { x: width / 2, y: height / 2, active: false };
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener("mouseleave", function () {
    mouse.active = false;
  });
  window.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches[0]) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
      mouse.active = true;
    }
  }, { passive: true });

  var COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"];
  var COUNT = Math.min(110, Math.floor((width * height) / 14000));

  function Particle() {
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 2 + 1;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = (Math.random() - 0.5) * 0.35;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  };
  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    if (mouse.active) {
      var dx = this.x - mouse.x;
      var dy = this.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var minDist = 120;
      if (dist < minDist && dist > 0.01) {
        var force = (minDist - dist) / minDist;
        this.x += (dx / dist) * force * 3;
        this.y += (dy / dist) * force * 3;
      }
    }
  };
  Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  var particles = [];
  for (var i = 0; i < COUNT; i++) particles.push(new Particle());

  function connect() {
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 85) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(130, 170, 250, " + (0.12 * (1 - dist / 85)) + ")";
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.fillStyle = "rgba(15, 17, 21, 0.28)";
    ctx.fillRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    connect();

    requestAnimationFrame(animate);
  }

  if (reduceMotion) {
    ctx.fillStyle = "rgba(15, 17, 21, 1)";
    ctx.fillRect(0, 0, width, height);
    particles.forEach(function (p) { p.draw(); });
    connect();
  } else {
    animate();
  }
})();
