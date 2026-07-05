/* ============================================================
   Shared site behaviour
   1) Slide-out menu drawer with dimmed backdrop (burger toggle)
   2) Landing page "Dive" interaction: raindrop ripple -> zoom-in -> navigate
   3) Seamless "dive arrival" entrance on the page that follows the dive
   4) Apple-style scroll reveals for content further down each page
   ============================================================ */

/* ============================================================
   SITE JOURNEY — single source of truth for the guided page-to-
   page order. Each page's journey-nav "Up next" link is still
   hand-written in its HTML (the site has no build step to
   generate it from this list), but they should always match this
   order — update both together if the sequence ever changes.
   ============================================================ */
var SITE_JOURNEY = [
  { title: "Home", href: "index.html" },
  { title: "About", href: "about.html" },
  { title: "Inspiration", href: "inspirations.html" },
  { title: "Selected Work", href: "my-work.html" },
  { title: "Work 1", href: "work-1.html" },
  { title: "Work 2", href: "work-2.html" },
  { title: "Work in Progress", href: "ongoing-work.html" },
  { title: "Ongoing 1", href: "ongoing-1.html" },
  { title: "Ongoing 2", href: "ongoing-2.html" },
  { title: "Contact", href: "about.html#contact" }
];

(function () {
  "use strict";

  // stop the browser from restoring a mid-scroll position on back/forward
  // navigation — without this, returning to the landing page via the back
  // button re-arrives already scrolled to where the dive completed, and
  // the scroll-progress handler below immediately re-triggers the dive.
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  /* ---------------- Slide-out menu ---------------- */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector("[data-menu-drawer]");
  var overlay = document.querySelector("[data-menu-overlay]");
  var closeBtn = document.querySelector("[data-menu-close]");

  function openMenu() {
    if (!drawer || !overlay || !burger) return;
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    if (closeBtn) closeBtn.focus();
  }

  function closeMenu() {
    if (!drawer || !overlay || !burger) return;
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
    burger.focus();
  }

  if (burger && drawer && overlay) {
    burger.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    overlay.addEventListener("click", closeMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------------- Shared ripple-ring burst ----------------
     spawns the same three staggered expanding rings used by the
     landing page's scroll prompt */
  function spawnRippleBurst(layer) {
    if (!layer) return;
    [0, 150, 300].forEach(function (delay) {
      setTimeout(function () {
        var ring = document.createElement("span");
        ring.className = "ripple-ring";
        layer.appendChild(ring);
        ring.addEventListener("animationend", function () {
          ring.remove();
        });
      }, delay);
    });
  }

  /* ---------------- Landing page: scroll to enter ---------------- */
  var scrollPrompt = document.getElementById("scroll-prompt");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (scrollPrompt) {
    var stage = document.getElementById("landing-stage");
    var media = document.getElementById("landing-media");
    var spacer = document.getElementById("landing-scroll-spacer");
    var zoom = document.getElementById("dive-zoom");
    var copy = document.getElementById("landing-copy");

    // "Enter Journey" is a direct-access shortcut for visitors who don't
    // want to scroll — it plays the same dive/zoom hand-off as the
    // scroll prompt instead of duplicating that logic here
    var enterJourneyBtn = document.querySelector("[data-enter-journey]");
    if (enterJourneyBtn) {
      enterJourneyBtn.addEventListener("click", function () {
        scrollPrompt.click();
      });
    }

    var hasEntered = false;
    var hasInteracted = false;
    var promptTimer = null;

    function showPrompt() {
      if (hasInteracted || hasEntered) return;
      scrollPrompt.classList.add("is-visible");
    }

    function markInteracted() {
      if (hasInteracted) return;
      hasInteracted = true;
      scrollPrompt.classList.remove("is-visible");
      if (promptTimer) clearTimeout(promptTimer);
    }

    function flagNextPage() {
      try {
        sessionStorage.setItem("diveArrival", "1");
      } catch (err) {
        /* sessionStorage unavailable (private mode etc.) — the hand-off is skipped, entry still works */
      }
    }

    var target = scrollPrompt.getAttribute("data-target") || "about.html";

    // covers back/forward-cache restores, where the page (and its JS state)
    // comes back exactly as it was mid-dive instead of re-running from
    // scratch — put it back to a fresh, un-entered landing page
    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      hasEntered = false;
      hasInteracted = false;
      window.scrollTo(0, 0);
      scrollPrompt.classList.remove("is-visible");
      if (stage) stage.classList.remove("diving");
      if (zoom) zoom.classList.remove("is-diving");
      if (media) media.style.transform = "";
      if (copy) copy.style.opacity = "";
      promptTimer = setTimeout(showPrompt, 5000);
    });

    if (reduceMotion || !stage || !media || !spacer || !zoom) {
      // no scroll-jacking, no forced motion — the prompt is just a plain button
      promptTimer = setTimeout(showPrompt, 5000);
      scrollPrompt.addEventListener("click", function () {
        if (hasEntered) return;
        hasEntered = true;
        flagNextPage();
        window.location.href = target;
      });
    } else {
      stage.classList.add("is-pinned");

      function setSpacerHeight() {
        spacer.style.height = window.innerHeight * 1.8 + "px";
      }
      setSpacerHeight();
      window.addEventListener("resize", setSpacerHeight);

      function completeEntry() {
        if (hasEntered) return;
        hasEntered = true;
        scrollPrompt.classList.remove("is-visible");
        flagNextPage();
        zoom.classList.add("is-diving");
        setTimeout(function () {
          window.location.href = target;
        }, 380);
      }

      var ticking = false;

      function applyScrollProgress() {
        ticking = false;
        if (hasEntered) return;

        var driveDistance = Math.max(1, spacer.offsetHeight - window.innerHeight);
        var progress = Math.max(0, Math.min(1, window.scrollY / driveDistance));

        if (progress > 0.015) markInteracted();

        var scale = 1 + progress * 3;
        media.style.transform = "scale(" + scale + ")";

        var fade = Math.max(0, 1 - progress * 2.2);
        if (copy) copy.style.opacity = fade;

        if (progress >= 0.88) {
          completeEntry();
        }
      }

      window.addEventListener(
        "scroll",
        function () {
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(applyScrollProgress);
          }
        },
        { passive: true }
      );

      // clicking the prompt itself still works, e.g. for anyone who
      // would rather not scroll — reuses the raindrop + zoom used
      // to feel out this interaction before scroll-driving existed
      scrollPrompt.addEventListener("click", function () {
        if (hasEntered) return;
        markInteracted();

        var rect = scrollPrompt.getBoundingClientRect();
        var originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        var originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        stage.style.setProperty("--dive-x", originX + "%");
        stage.style.setProperty("--dive-y", originY + "%");

        spawnRippleBurst(scrollPrompt.querySelector(".ripple-layer"));

        setTimeout(function () {
          media.style.transform = "";
          stage.classList.add("diving");
        }, 280);

        flagNextPage();

        // let the zoom itself (950ms, starting at 280ms) play out, and
        // only bring the cover in right at its tail so the motion reads
        // as one continuous move rather than a zoom cut short by a fade
        setTimeout(function () {
          zoom.classList.add("is-diving");
        }, 900);

        setTimeout(function () {
          window.location.href = target;
        }, 1300);

        hasEntered = true;
      });

      promptTimer = setTimeout(showPrompt, 5000);
      applyScrollProgress();
    }
  }

  /* ---------------- Dive arrival: continue the zoom on the next page ---------------- */
  var arrivingFromDive = document.documentElement.classList.contains("dive-arrival");
  var arrivingFromNav = document.documentElement.classList.contains("page-transition");

  if (arrivingFromDive || arrivingFromNav) {
    try {
      sessionStorage.removeItem("diveArrival");
      sessionStorage.removeItem("pageTransition");
    } catch (err) {
      /* ignore */
    }
    if (reduceMotion) {
      document.documentElement.classList.add("is-revealed");
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.documentElement.classList.add("is-revealed");
        });
      });
    }
  }

  /* ---------------- Site-wide page transitions ----------------
     Every ordinary internal link fades through the same veil used
     for the dive hand-off (a lighter version of it), so moving
     between pages feels like one continuous piece rather than a
     series of hard page loads. */
  var pageVeil = document.getElementById("page-veil");

  if (pageVeil && !reduceMotion) {
    document.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var link = e.target.closest ? e.target.closest("a[href]") : null;
      if (!link) return;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (link.target && link.target !== "" && link.target !== "_self") return;
      if (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
      if (link.hasAttribute("download")) return;

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor

      e.preventDefault();

      // if the link lives inside the slide-out drawer, let it close on the way out
      if (drawer && drawer.contains(link)) {
        closeMenu();
      }

      try {
        sessionStorage.setItem("pageTransition", "1");
      } catch (err) {
        /* ignore */
      }

      pageVeil.classList.add("is-visible");
      setTimeout(function () {
        window.location.href = url.href;
      }, 420);
    });
  }

  /* ---------------- Apple-style scroll reveals ---------------- */
  function initScrollReveal() {
    // the landing page has its own full-viewport hero animation — nothing to reveal on scroll there
    if (document.getElementById("landing-stage")) return;

    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var groups = [];

    document
      .querySelectorAll(".panel.wide, h1, h2, .contact")
      .forEach(function (el) {
        groups.push([el]);
      });

    document.querySelectorAll(".work-row").forEach(function (row) {
      var text = row.querySelector(".work-text");
      var media = row.querySelector(".work-media");
      if (text && media) groups.push([text, media]);
    });

    document.querySelectorAll(".article-body").forEach(function (article) {
      var paras = article.querySelectorAll(":scope > p");
      if (paras.length) groups.push(Array.prototype.slice.call(paras));
    });

    var allEls = [];
    var groupIndex = 0;

    groups.forEach(function (group) {
      var baseDelay = Math.min(groupIndex * 70, 260);
      group.forEach(function (el, i) {
        el.classList.add("reveal");
        var extra = i > 0 ? Math.min(i * 130, 260) : 0;
        el.style.transitionDelay = (baseDelay + extra) + "ms";
        allEls.push(el);
      });
      groupIndex += 1;
    });

    if (!allEls.length) return;

    // Force the browser to actually paint the hidden ("reveal") state
    // before we start observing. Without this, elements already inside
    // the viewport on load can have their IntersectionObserver callback
    // fire before the very first paint, so the class flip to
    // "reveal-visible" gets coalesced with the initial "reveal" class —
    // the transition never runs and the content just snaps into place.
    void document.body.offsetHeight;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("reveal-visible");
                io.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
        );

        allEls.forEach(function (el) {
          io.observe(el);
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollReveal);
  } else {
    initScrollReveal();
  }
})();

/* ============================================================
   Water ripple — a small WebGL2 fluid simulation that distorts a
   2D-painted text bitmap, reacting to the cursor (or a finger on
   touch devices). Reused for two surfaces:
     1) the landing page hero title (opaque, full-viewport canvas)
     2) each "Dive Deeper" bubble button's label (a small,
        transparent canvas layered over the glass button chrome,
        so the CSS glass background still shows through)
   Falls back to the plain text/CSS whenever WebGL2 / float
   buffers / the shaders aren't available, or reduced motion is on.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var vertexShaderSource =
    "#version 300 es\n" +
    "in vec2 a_position;\n" +
    "out vec2 v_uv;\n" +
    "void main() {\n" +
    "  v_uv = a_position * 0.5 + 0.5;\n" +
    "  gl_Position = vec4(a_position, 0.0, 1.0);\n" +
    "}\n";

  var fallbackSimulationShader =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "precision highp int;\n" +
    "uniform sampler2D uState;\n" +
    "uniform vec2 uResolution;\n" +
    "uniform vec4 uMouse;\n" +
    "uniform int uFrame;\n" +
    "out vec4 outColor;\n" +
    "const float delta = 1.0;\n" +
    "const float maxPressure = 2.0;\n" +
    "void main() {\n" +
    "  ivec2 coord = ivec2(gl_FragCoord.xy);\n" +
    "  ivec2 maxCoord = ivec2(uResolution) - ivec2(1);\n" +
    "  if (uFrame == 0) { outColor = vec4(0.0); return; }\n" +
    "  float pressure = texelFetch(uState, coord, 0).x;\n" +
    "  float pVel = texelFetch(uState, coord, 0).y;\n" +
    "  if (isnan(pressure) || isinf(pressure)) pressure = 0.0;\n" +
    "  if (isnan(pVel) || isinf(pVel)) pVel = 0.0;\n" +
    "  ivec2 rightCoord = ivec2(min(coord.x + 1, maxCoord.x), coord.y);\n" +
    "  ivec2 leftCoord = ivec2(max(coord.x - 1, 0), coord.y);\n" +
    "  ivec2 upCoord = ivec2(coord.x, min(coord.y + 1, maxCoord.y));\n" +
    "  ivec2 downCoord = ivec2(coord.x, max(coord.y - 1, 0));\n" +
    "  float p_right = texelFetch(uState, rightCoord, 0).x;\n" +
    "  float p_left = texelFetch(uState, leftCoord, 0).x;\n" +
    "  float p_up = texelFetch(uState, upCoord, 0).x;\n" +
    "  float p_down = texelFetch(uState, downCoord, 0).x;\n" +
    "  if (coord.x == 0) p_left = p_right;\n" +
    "  if (coord.x == maxCoord.x) p_right = p_left;\n" +
    "  if (coord.y == 0) p_down = p_up;\n" +
    "  if (coord.y == maxCoord.y) p_up = p_down;\n" +
    "  pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;\n" +
    "  pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;\n" +
    "  pressure += delta * pVel;\n" +
    "  pVel -= 0.005 * delta * pressure;\n" +
    "  pVel *= 1.0 - 0.002 * delta;\n" +
    "  pressure *= 0.999;\n" +
    "  if (uMouse.z > 0.0) {\n" +
    "    float radius = max(uMouse.w, 1.0);\n" +
    "    float dist = distance(gl_FragCoord.xy, uMouse.xy);\n" +
    "    if (dist <= radius) { pressure += uMouse.z * (1.0 - dist / radius); }\n" +
    "  }\n" +
    "  pressure = clamp(pressure, -maxPressure, maxPressure);\n" +
    "  pVel = clamp(pVel, -maxPressure, maxPressure);\n" +
    "  vec4 nextState = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);\n" +
    "  outColor = nextState;\n" +
    "}\n";

  var fallbackRenderShader =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D uState;\n" +
    "uniform sampler2D uImage;\n" +
    "uniform vec2 uResolution;\n" +
    "uniform float uTime;\n" +
    "out vec4 outColor;\n" +
    "void main() {\n" +
    "  vec2 uv = gl_FragCoord.xy / uResolution.xy;\n" +
    "  vec4 data = texture(uState, uv);\n" +
    "  vec2 gradient = (isnan(data.z) || isinf(data.z) || isnan(data.w) || isinf(data.w)) ? vec2(0.0) : data.zw;\n" +
    "  vec2 distortion = clamp(0.20 * gradient, vec2(-0.35), vec2(0.35));\n" +
    "  vec2 sampleUv = clamp(uv + distortion, vec2(0.001), vec2(0.999));\n" +
    "  vec4 color = texture(uImage, sampleUv);\n" +
    "  vec3 normal = normalize(vec3(-gradient.x, 0.20, -gradient.y));\n" +
    "  float glint = pow(max(0.0, dot(normal, normalize(vec3(-3.0, 10.0, 3.0)))), 60.0);\n" +
    "  float titleMask = smoothstep(0.18, 0.95, max(color.r, max(color.g, color.b)));\n" +
    "  vec3 finalColor = color.rgb + vec3(glint) * (0.08 + titleMask * 0.30);\n" +
    "  outColor = vec4(finalColor, color.a);\n" +
    "}\n";

  async function loadTextFile(path, fallback) {
    try {
      var response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(path + " could not be loaded.");
      return await response.text();
    } catch (error) {
      return fallback;
    }
  }

  // fetched once and shared across every ripple instance on the page —
  // each instance still compiles its own WebGLProgram (programs can't be
  // shared across canvases/contexts), but there's no need to re-fetch
  // the same .frag files for every button
  var shaderSourcesPromise = null;
  function loadShaderSources() {
    if (!shaderSourcesPromise) {
      shaderSourcesPromise = Promise.all([
        loadTextFile("shaders/water-simulation.frag", fallbackSimulationShader),
        loadTextFile("shaders/water-render.frag", fallbackRenderShader)
      ]);
    }
    return shaderSourcesPromise;
  }

  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Shader compile error.");
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message || "Program link error.");
    }
    return program;
  }

  function createFullscreenBuffer(gl) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    return buffer;
  }

  function bindFullscreenBuffer(gl, program, buffer) {
    var positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  function createStateTexture(gl, width, height) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    return texture;
  }

  function createFramebuffer(gl, texture) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
  }

  function createImageTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // transparent placeholder — matters for the (alpha: true) bubble-button
    // instances so there's no one-frame flash of an opaque block before
    // the real texture uploads; a no-op for the opaque hero canvas
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    return texture;
  }

  // paints the title as flat black text onto a milk-white 2D canvas —
  // this bitmap is what the water simulation then distorts
  function paintLandingTitleTexture(canvas, title) {
    var ctx = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    var dprScale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    ctx.fillStyle = "#fdfbf5";
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(
      width * 0.5, height * 0.46, 0,
      width * 0.5, height * 0.46, Math.max(width, height) * 0.56
    );
    glow.addColorStop(0, "rgba(0,0,0,0.05)");
    glow.addColorStop(0.42, "rgba(0,0,0,0.018)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    var fontSize = Math.min(width * 0.15, height * 0.24);
    var safeFontSize = Math.max(56 * dprScale, fontSize);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 " + safeFontSize + 'px "Neco", Arial, sans-serif';
    ctx.letterSpacing = Math.max(0, safeFontSize * -0.02) + "px";
    ctx.fillStyle = "#121317";
    ctx.fillText(title, width * 0.5, height * 0.47);
    ctx.restore();

    var shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(0,0,0,0.05)");
    shade.addColorStop(0.72, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }

  // paints a bubble button's label onto a transparent 2D canvas, sized to
  // read at the same 15px/600-weight/Neco look as the CSS .btn text it
  // replaces — only the glyphs are opaque, so the glass background (and
  // the water shader's alpha passthrough) still show through around them
  function paintBubbleLabelTexture(canvas, label, meta) {
    var ctx = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    var pxScale = width / Math.max(1, meta.cssWidth);
    var fontSize = 15 * pxScale;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 " + fontSize + 'px "Neco", Arial, sans-serif';
    ctx.letterSpacing = (fontSize * 0.02) + "px";
    ctx.fillStyle = "#121317";
    ctx.fillText(label, width * 0.5, height * 0.52);
    ctx.restore();
  }

  // painted well above the canvas's own device-pixel resolution so text
  // stays crisp under magnification (the hero's dive zoom, or simply a
  // small button viewed on a high-DPI screen) instead of blocky upscaling
  var TEXTURE_SUPERSAMPLE = 2;

  /**
   * Wires one <canvas> to a fluid water-ripple simulation that distorts a
   * label painted by `paintTexture`. `container`'s rect drives the
   * canvas resolution and is the surface that reacts to the pointer.
   *
   * config:
   *   alpha         — true for surfaces that must stay transparent where
   *                   there's no text (bubble buttons); false for the
   *                   opaque hero canvas
   *   idleTimeoutMs — how long the simulation keeps animating after the
   *                   last pointer disturbance before it goes to sleep
   *   onReady       — called once the shader has actually compiled and
   *                   the first frame is about to render, so callers can
   *                   swap away a static fallback
   */
  async function createWaterRipple(canvas, container, label, paintTexture, config) {
    config = config || {};
    var idleTimeoutMs = config.idleTimeoutMs || 6000;

    var gl = canvas.getContext("webgl2", {
      alpha: !!config.alpha,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    if (!gl) return;

    var floatBufferSupport = gl.getExtension("EXT_color_buffer_float");
    if (!floatBufferSupport) return;

    var sources = await loadShaderSources();
    var simulationShaderSource = sources[0];
    var renderShaderSource = sources[1];

    var simulationProgram;
    var renderProgram;
    try {
      simulationProgram = createProgram(gl, vertexShaderSource, simulationShaderSource);
      renderProgram = createProgram(gl, vertexShaderSource, renderShaderSource);
    } catch (error) {
      console.warn("Water ripple shader could not be created:", error);
      return;
    }

    var buffer = createFullscreenBuffer(gl);

    var simulationUniforms = {
      state: gl.getUniformLocation(simulationProgram, "uState"),
      resolution: gl.getUniformLocation(simulationProgram, "uResolution"),
      mouse: gl.getUniformLocation(simulationProgram, "uMouse"),
      frame: gl.getUniformLocation(simulationProgram, "uFrame")
    };

    var renderUniforms = {
      state: gl.getUniformLocation(renderProgram, "uState"),
      image: gl.getUniformLocation(renderProgram, "uImage"),
      resolution: gl.getUniformLocation(renderProgram, "uResolution"),
      time: gl.getUniformLocation(renderProgram, "uTime")
    };

    var sourceTexture = createImageTexture(gl);
    var sourceCanvas = document.createElement("canvas");

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    var readTarget = null;
    var writeTarget = null;
    var canvasWidth = 1;
    var canvasHeight = 1;
    var simWidth = 1;
    var simHeight = 1;
    var frame = 0;
    var rafId = null;
    var lastMoveTime = 0;
    var lastInteractionTime = 0;
    var mouseX = 0;
    var mouseY = 0;
    var mouseStrength = 0;
    var mouseRadius = 22;

    function destroyTarget(target) {
      if (!target) return;
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }

    function createTarget(width, height) {
      var texture = createStateTexture(gl, width, height);
      var framebuffer = createFramebuffer(gl, texture);
      var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Water ripple framebuffer is incomplete.");
      }
      return { texture: texture, framebuffer: framebuffer };
    }

    function updateSourceTexture(cssWidth, cssHeight, dpr) {
      sourceCanvas.width = Math.round(canvasWidth * TEXTURE_SUPERSAMPLE);
      sourceCanvas.height = Math.round(canvasHeight * TEXTURE_SUPERSAMPLE);
      paintTexture(sourceCanvas, label, { cssWidth: cssWidth, cssHeight: cssHeight, dpr: dpr });

      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    function resizeCanvas() {
      var rect = container.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasWidth = Math.max(1, Math.round(rect.width * dpr));
      canvasHeight = Math.max(1, Math.round(rect.height * dpr));
      simWidth = Math.max(160, Math.round(canvasWidth * 0.5));
      simHeight = Math.max(120, Math.round(canvasHeight * 0.5));

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = Math.max(1, rect.width) + "px";
      canvas.style.height = Math.max(1, rect.height) + "px";

      destroyTarget(readTarget);
      destroyTarget(writeTarget);
      readTarget = createTarget(simWidth, simHeight);
      writeTarget = createTarget(simWidth, simHeight);
      frame = 0;

      updateSourceTexture(rect.width, rect.height, dpr);
      startAnimation();
    }

    function updateMouseFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      var y = (event.clientY - rect.top) / Math.max(rect.height, 1);

      mouseX = Math.max(0, Math.min(1, x)) * simWidth;
      mouseY = (1 - Math.max(0, Math.min(1, y))) * simHeight;
      mouseRadius = Math.max(14, Math.min(42, Math.min(simWidth, simHeight) * 0.028));
      mouseStrength = 0.42;
      lastMoveTime = performance.now();
      lastInteractionTime = lastMoveTime;
      startAnimation();
    }

    function renderFrame(nowMs) {
      if (!readTarget || !writeTarget) {
        rafId = null;
        return;
      }

      var now = nowMs / 1000;
      var disturbanceIsFresh = nowMs - lastMoveTime < 70;
      var strength = disturbanceIsFresh ? mouseStrength : 0;

      gl.disable(gl.BLEND);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeTarget.framebuffer);
      gl.useProgram(simulationProgram);
      bindFullscreenBuffer(gl, simulationProgram, buffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
      gl.uniform1i(simulationUniforms.state, 0);
      gl.uniform2f(simulationUniforms.resolution, simWidth, simHeight);
      gl.uniform4f(simulationUniforms.mouse, mouseX, mouseY, strength, mouseRadius);
      gl.uniform1i(simulationUniforms.frame, frame);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      var oldRead = readTarget;
      readTarget = writeTarget;
      writeTarget = oldRead;

      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(renderProgram);
      bindFullscreenBuffer(gl, renderProgram, buffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
      gl.uniform1i(renderUniforms.state, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(renderUniforms.image, 1);
      gl.uniform2f(renderUniforms.resolution, canvasWidth, canvasHeight);
      gl.uniform1f(renderUniforms.time, now);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      frame += 1;

      var keepAnimating = frame < 3 || nowMs - lastInteractionTime < idleTimeoutMs;
      if (keepAnimating) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        rafId = null;
      }
    }

    function startAnimation() {
      if (!rafId) {
        rafId = requestAnimationFrame(renderFrame);
      }
    }

    container.addEventListener("pointermove", updateMouseFromEvent);
    container.addEventListener("pointerenter", updateMouseFromEvent);
    container.addEventListener(
      "touchmove",
      function (event) {
        if (event.touches && event.touches[0]) updateMouseFromEvent(event.touches[0]);
      },
      { passive: true }
    );

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    if (config.onReady) config.onReady();
  }

  // ---- landing-page hero title ----
  var rippleCanvas = document.querySelector("[data-ripple-canvas]");
  var landingStage = document.getElementById("landing-stage");
  if (rippleCanvas && landingStage) {
    createWaterRipple(
      rippleCanvas,
      landingStage,
      rippleCanvas.dataset.rippleTitle || "Milky Sea",
      paintLandingTitleTexture,
      {
        alpha: false,
        idleTimeoutMs: 6000,
        onReady: function () {
          document.body.classList.add("water-ready");
        }
      }
    );
  }

  // ---- "Dive Deeper" bubble buttons ----
  var bubbleButtons = document.querySelectorAll(".btn-bubble");
  bubbleButtons.forEach(function (button) {
    var canvas = button.querySelector(".btn-bubble-canvas");
    var labelEl = button.querySelector(".btn-bubble-label");
    if (!canvas || !labelEl) return;

    createWaterRipple(
      canvas,
      button,
      labelEl.textContent.trim(),
      paintBubbleLabelTexture,
      {
        alpha: true,
        idleTimeoutMs: 1400,
        onReady: function () {
          button.classList.add("ripple-ready");
        }
      }
    );
  });
})();
