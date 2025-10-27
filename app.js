/* ====== REPRODUCTOR ====== */
const btnAudio = document.getElementById("btnAudio");
const song = document.getElementById("song");
let playing = false;
const p = song.play();

const ICON_PLAY =
  '<img src="./img/iconos/musica.png" alt="Reproducir" class="icono-musica">';
const ICON_PAUSE =
  '<img src="./img/iconos/pausar.png"  alt="Pausar"     class="icono-musica">';

// Flag global: indica si el intro (video) está en pantalla
if (typeof window.__introActive === "undefined") window.__introActive = false;

// Evita inicializar dos veces si vuelves a incluir este script
if (!window.__musicInit) {
  window.__musicInit = true;

  function updateBtn() {
    btnAudio.innerHTML = playing
      ? ICON_PAUSE + "Pausar canción"
      : ICON_PLAY + "Reproducir canción";
  }

  btnAudio.addEventListener("click", async () => {
    try {
      if (song.paused) {
        song.muted = false;
        song.volume = 0.25;
        await song.play();
        playing = true;
      } else {
        song.pause();
        playing = false;
      }
      updateBtn();
    } catch (e) {
      console.log("No se pudo reproducir desde el botón:", e?.message || e);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    tryAutoplayMuted();
  });

  song.addEventListener(
    "canplaythrough",
    () => {
      if (song.paused) tryAutoplayMuted();
    },
    { once: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && playing && song.paused) song.play().catch(() => {});
  });

  (function guardSongUntilAfterIntro() {
    let armed = false;
    const handler = () => {
      if (window.__introActive || armed) return;
      armed = true;
      firstUserGesture();
      ["pointerdown", "touchstart", "click"].forEach((evt) =>
        document.removeEventListener(evt, handler, { passive: true })
      );
    };
    ["pointerdown", "touchstart", "click"].forEach((evt) =>
      document.addEventListener(evt, handler, { passive: true })
    );
  })();

  async function tryAutoplayMuted() {
    try {
      if (window.__introActive) return;
      song.muted = true;
      song.volume = 0.0;
      const p = song.play();
      if (p && typeof p.then === "function") {
        await p;
        playing = true;
        updateBtn();
      }
    } catch (e) {
      console.log("Autoplay en silencio bloqueado:", e?.message || e);
    }
  }

  (function introSplash() {
    const intro = document.getElementById("intro");
    const video = document.getElementById("introVideo");
    const skip = document.getElementById("skipIntro");
    const layer = document.getElementById("soundLayer"); // capa “toca para activar sonido”
    if (!intro || !video || !skip) return;

    window.__introActive = true;

    // Volúmenes
    const VIDEO_VOL = 0.22; // volumen del video de intro
    const SONG_TARGET_VOL = 0.18; // volumen final de la canción
    const START_SONG_AFTER_INTRO = true;

    // Mantén callada la canción mientras corre el intro
    try {
      song.pause();
      song.currentTime = 0;
      song.muted = true;
      song.volume = 0.0;
    } catch {}

    // Intenta reproducir el video CON audio de forma automática
    (async () => {
      try {
        video.muted = false; // ← intenta con sonido
        video.volume = VIDEO_VOL;
        await video.play(); // si esto falla, el navegador exige gesto
        if (layer) layer.style.display = "none"; // no se necesita toque
      } catch {
        // Fallback: inicia en mute y pide toque para activar audio
        try {
          video.muted = true;
          await video.play();
        } catch {}
        if (layer) layer.style.display = "grid";
      }
    })();

    // Al primer toque en el overlay, habilita el audio del video
    function enableVideoSound() {
      try {
        video.muted = false;
        video.volume = VIDEO_VOL;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } catch {}
      if (layer) layer.style.display = "none";
    }

    ["pointerdown", "touchstart", "click", "keydown"].forEach((evt) => {
      intro.addEventListener(evt, enableVideoSound, {
        passive: true,
        once: true,
      });
    });
    layer?.addEventListener("click", enableVideoSound);

    function startSongWithFadeIn() {
      if (!START_SONG_AFTER_INTRO) return;
      try {
        // apaga por completo el video para evitar cualquier residuo
        video.pause();
        video.muted = true;

        song.muted = false;
        song.volume = 0.0;
        const p = song.play();
        if (p && p.then) {
          p.then(() => {
            let t = 0,
              step = 100;
            const fade = setInterval(() => {
              t += step;
              song.volume = Math.min(
                SONG_TARGET_VOL,
                song.volume + SONG_TARGET_VOL / (1000 / step)
              );
              if (t >= 1000 || song.volume >= SONG_TARGET_VOL)
                clearInterval(fade);
            }, step);
          }).catch(() => {});
        }
      } catch {}
    }

    // Suavemente baja a la “siguiente sección”
    function goToNextSection() {
      const target =
        document.querySelector(".hero-wrap") ||
        document.querySelector("header.wrap") ||
        document.querySelector("section.wrap") ||
        document.body;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    let closed = false;
    function closeIntro() {
      if (closed) return;
      closed = true;
      window.__introActive = false;

      intro.classList.add("intro-hide");
      setTimeout(() => {
        intro.remove();
        document.documentElement.classList.remove("no-scroll");
        document.body.classList.remove("no-scroll");
      }, 460);
    }

    function endIntroFlow() {
      // 1) cerrar intro, 2) arrancar canción, 3) bajar a la siguiente sección
      closeIntro();
      startSongWithFadeIn();
      goToNextSection();
    }

    // Termina al acabar el video
    video.addEventListener("ended", endIntroFlow, { once: true });

    // Botón Saltar
    skip.addEventListener("click", () => {
      enableVideoSound(); // por si no hubo gesto aún
      endIntroFlow();
    });

    // Fallback (por si el video no logra reproducir): cierra y sigue
    setTimeout(() => {
      if (video.currentTime === 0) {
        endIntroFlow();
      }
    }, 12000);
  })();

  async function firstUserGesture() {
    try {
      const targetVol = 0.25;
      song.muted = false;
      song.volume = 0.0;
      await song.play();
      playing = true;
      updateBtn();
      let t = 0;
      const fade = setInterval(() => {
        t += 100;
        song.volume = Math.min(targetVol, song.volume + targetVol / 10);
        if (t >= 1000 || song.volume >= targetVol) clearInterval(fade);
      }, 100);
    } catch (e) {
      console.log(
        "No se pudo iniciar tras gesto del usuario:",
        e?.message || e
      );
    }
  }

  updateBtn();
}

/* ====== COUNTDOWN (20 dic 2025 17:00:00) ====== */
const target = new Date("2025-12-20T17:00:00");
const $d = (id) => document.getElementById(id);
function tick() {
  const now = new Date();
  let diff = (target - now) / 1000;
  if (diff < 0) diff = 0;
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  $d("d").textContent = d;
  $d("h").textContent = h.toString().padStart(2, "0");
  $d("m").textContent = m.toString().padStart(2, "0");
  $d("s").textContent = s.toString().padStart(2, "0");
}
tick();
setInterval(tick, 1000);

/* ====== GENERAR ICS (Añadir a calendario) ====== */
function buildICS() {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Invitaciones LAC//Mis XV//ES
BEGIN:VEVENT
DTSTAMP:20251201T120000
DTSTART;TZID=America/Mexico_City:20251220T160000
DTEND;TZID=America/Mexico_City:20251220T170000
SUMMARY:XV de Ximena Adilene — Misa
LOCATION:Parroquia de nuestra Señora de San Juan de los Lagos
DESCRIPTION:¡Acompáñanos a celebrar! Ceremonia 4:00 p.m. y recepción posterior.
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  document.getElementById("btnCalendario").href = url;
}
buildICS();

/* ====== CARRUSEL ====== */
(function autoCarousel() {
  const track = document.getElementById("track");
  if (!track) return;
  const slides = Array.from(track.children);
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const dotsWrap = document.getElementById("dots");
  let index = 0;

  function markActive() {
    slides.forEach((s, i) => s.classList.toggle("active", i === index));
  }
  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const b = document.createElement("button");
      if (i === index) b.classList.add("active");
      b.addEventListener("click", () => {
        go(i);
        userInteracted();
      });
      dotsWrap.appendChild(b);
    });
  }
  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    renderDots();
    markActive();
  }

  const AUTO_MS = 4000;
  const PAUSE_MS = 8000;
  let timer = null,
    pauseUntil = 0;
  function startAuto() {
    stopAuto();
    timer = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pauseUntil) return;
      go(index + 1);
    }, AUTO_MS);
  }
  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function userInteracted() {
    pauseUntil = Date.now() + PAUSE_MS;
    startAuto();
  }

  prev?.addEventListener("click", () => {
    go(index - 1);
    userInteracted();
  });
  next?.addEventListener("click", () => {
    go(index + 1);
    userInteracted();
  });

  const carousel = document.getElementById("carousel");
  carousel?.addEventListener("mouseenter", stopAuto);
  carousel?.addEventListener("mouseleave", startAuto);

  let touchStartX = 0,
    touchMoved = false;
  function addPressing(img) {
    img?.classList.add("is-pressing");
  }
  function removePressing(img) {
    img?.classList.remove("is-pressing");
  }

  slides.forEach((slide) => {
    const img = slide.querySelector("img");
    if (!img) return;
    img.addEventListener("pointerdown", () => addPressing(img));
    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
      img.addEventListener(evt, () => removePressing(img))
    );
  });

  carousel?.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      touchMoved = false;
      touchStartX = e.touches[0].clientX;
      addPressing(slides[index]?.querySelector("img"));
    },
    { passive: true }
  );

  carousel?.addEventListener(
    "touchmove",
    (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      if (Math.abs(dx) > 6) touchMoved = true;
    },
    { passive: true }
  );

  carousel?.addEventListener(
    "touchend",
    (e) => {
      const current = slides[index]?.querySelector("img");
      removePressing(current);
      if (!touchMoved) return;
      const dx = (e.changedTouches?.[0]?.clientX ?? touchStartX) - touchStartX;
      const SWIPE_MIN = 40;
      if (dx > SWIPE_MIN) go(index - 1);
      if (dx < -SWIPE_MIN) go(index + 1);
      userInteracted();
    },
    { passive: true }
  );

  renderDots();
  go(0);
  startAuto();
  markActive();
})();

/* ===== Lluvia de mariposas mágica ===== */
(function butterflyRain() {
  const field = document.getElementById("butterflies");
  const IMG_SRC = "./img/mariposa2.png";
  const DENSITY = 9,
    CHUNK = 3,
    MAX_ACTIVE = 40;

  function spawnOne(burst = false) {
    if (!field) return;
    if (field.childElementCount > MAX_ACTIVE && !burst) return;
    const img = document.createElement("img");
    img.src = IMG_SRC;
    img.alt = "";
    img.className = "butterfly";

    const vw = Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0
    );
    const startX = Math.random() * vw;
    const endX = startX + (Math.random() * 200 - 100);
    const rot = Math.random() * 40 - 20 + "deg";
    const size = 26 + Math.random() * 28;
    const dur = 8 + Math.random() * 10;
    const flap = 1.6 + Math.random() * 1.8;

    img.style.setProperty("--x", startX + "px");
    img.style.setProperty("--tx", endX + "px");
    img.style.setProperty("--r", rot);
    img.style.setProperty("--dur", dur + "s");
    img.style.setProperty("--flap", flap + "s");
    img.style.width = size + "px";
    img.style.left = startX + "px";

    img.addEventListener("animationend", () => img.remove());
    field.appendChild(img);
  }
  function spawnChunk(n = CHUNK) {
    for (let i = 0; i < n; i++) setTimeout(() => spawnOne(), i * 180);
  }

  const intervalMs = Math.max(1200, Math.floor(60000 / DENSITY));
  spawnChunk(CHUNK);
  let timer = setInterval(() => spawnChunk(CHUNK), intervalMs);

  document.addEventListener("click", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const isBtn = tag === "a" || tag === "button";
    if (isBtn) return;
    for (let i = 0; i < 8; i++) setTimeout(() => spawnOne(true), i * 60);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(timer);
      timer = null;
    } else if (!timer) {
      timer = setInterval(() => spawnChunk(CHUNK), intervalMs);
    }
  });
})();
/* =====================  HASHTAG (Drive + GAS)  ===================== */
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzhiO2c_2Zf_4jpbb31W3Uoc3F9Vkey5rL_vb6uwla3xQaD3n3AehJE8lE5j_bGMb_V/exec";

// ← Pega aquí tu URL de Apps Script (la que termina en /exec)
const VISIBLE = 6; // fotos visibles en mural
const LIMIT = 200; // tope visual

// --- REST: listar/subir contra GAS ---
async function fetchFotosServer() {
  const res = await fetch(GAS_URL, { method: "GET" });
  if (!res.ok) throw new Error(`list_failed (${res.status})`);
  const data = await res.json().catch(() => ({}));
  return data.items || [];
}
if (file.size > 8 * 1024 * 1024) {
  throw new Error("La foto es muy grande (>8MB). Reduce el tamaño.");
}

async function uploadOne(file) {
  if (file.size > 8 * 1024 * 1024) {
    // 8 MB
    throw new Error("La foto es muy grande (>8MB). Reduce el tamaño.");
  }
  const dataBase64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const payload = {
    name: file.name,
    mimeType: file.type || "image/jpeg",
    dataBase64,
  };

  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Upload HTTP ${res.status}`);

  const json = await res.json().catch(() => null);

  // 👇 FIX: aquí decía json2.error y truena SIEMPRE
  if (!json || !json.ok || !json.url) {
    console.error("Respuesta GAS:", json);
    throw new Error((json && json.error) || "Upload inválido");
  }
  return json.url;
}

// --- UI hashtag (mural 6 + álbum + visor) ---
(function hashtagSection() {
  const dz = document.getElementById("dropzone");
  const input = document.getElementById("photoInput");
  const btnCopy = document.getElementById("copyHash");
  const btnClear = document.getElementById("clearPhotos");
  const hashEl = document.getElementById("hashTagText");

  const muralSection = document.getElementById("mural");
  const mural = document.getElementById("muralGrid");
  const btnAlbum = document.getElementById("btnAlbum");
  const albumModal = document.getElementById("albumModal");
  const albumGrid = document.getElementById("albumGrid");
  const closeAlbum = document.getElementById("closeAlbum");

  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewerImg");
  const btnDownload = document.getElementById("btnDownload");
  const btnCloseV = document.getElementById("btnCloseViewer");
  const viewerBackdrop = viewer?.querySelector(".viewer-backdrop");

  if (!dz || !input || !mural || !albumGrid) return;

  const filesState = []; // ascendente: 0=la más vieja

  function toggleMuralSection() {
    muralSection.style.display = filesState.length ? "" : "none";
  }

  function renderMural() {
    mural.innerHTML = "";
    const last = filesState.slice(-VISIBLE);
    last.forEach(({ url, name }) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.url = url;
      const img = document.createElement("img");
      img.src = url;
      img.alt = name || "";
      tile.appendChild(img);
      mural.appendChild(tile);
    });
    const total = filesState.length;
    btnAlbum.style.display = total > VISIBLE ? "" : "none";
    if (total > VISIBLE) btnAlbum.textContent = `📚 Ver más (${total})`;
    toggleMuralSection();
  }

  function renderAlbum() {
    albumGrid.innerHTML = "";
    filesState.forEach(({ url, name }) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.url = url;
      const img = document.createElement("img");
      img.src = url;
      img.alt = name || "";
      img.loading = "lazy";
      tile.appendChild(img);
      albumGrid.appendChild(tile);
    });
    const total = filesState.length;
    btnAlbum.style.display = total > VISIBLE ? "" : "none";
    if (total > VISIBLE) btnAlbum.textContent = `📚 Ver más (${total})`;
  }

  async function loadFromServer() {
    try {
      const items = await fetchFotosServer();
      filesState.length = 0;
      // ordena ascendente para que slice(-6) sean las 6 más nuevas
      items.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
      for (const it of items.slice(-LIMIT)) {
        filesState.push({
          url: it.url,
          name: it.name,
          createdTime: it.createdTime,
        });
      }
      renderMural();
      renderAlbum();
    } catch (e) {
      console.warn("No se pudo cargar:", e?.message || e);
    }
  }

  async function handleFiles(list) {
    const files = Array.from(list || []).filter((f) =>
      f.type?.startsWith("image/")
    );
    if (!files.length) return;
    for (const f of files) await uploadOne(f);
    await loadFromServer();
    alert("Fotos subidas 💫");
  }

  // Drag & drop + click
  ["dragenter", "dragover"].forEach((evt) => {
    dz.addEventListener(
      evt,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.add("dragover");
      },
      { passive: false }
    );
  });
  ["dragleave", "drop"].forEach((evt) => {
    dz.addEventListener(
      evt,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove("dragover");
      },
      { passive: false }
    );
  });
  dz.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => handleFiles(e.target.files));

  // Copiar hashtag
  btnCopy?.addEventListener("click", async () => {
    const text = (hashEl?.textContent || "#XVDeXimena2025").trim();
    try {
      await navigator.clipboard.writeText(text);
      btnCopy.textContent = "✅ Copiado";
      setTimeout(() => (btnCopy.textContent = "📋 Copiar hashtag"), 1200);
    } catch {
      alert("Copia manual: " + text);
    }
  });

  // Limpiar vista local (no borra en Drive)
  btnClear?.addEventListener("click", () => {
    filesState.length = 0;
    renderMural();
    renderAlbum();
  });

  // Modal álbum
  btnAlbum?.addEventListener("click", () =>
    albumModal.setAttribute("aria-hidden", "false")
  );
  document
    .querySelector(".album-backdrop")
    ?.addEventListener("click", () =>
      albumModal.setAttribute("aria-hidden", "true")
    );
  closeAlbum?.addEventListener("click", () =>
    albumModal.setAttribute("aria-hidden", "true")
  );

  // Visor + descarga
  let currentUrl = null;
  function openViewer(url, alt) {
    currentUrl = url;
    viewerImg.src = url;
    viewerImg.alt = alt || "";
    viewer.setAttribute("aria-hidden", "false");
  }
  function closeViewer() {
    viewer.setAttribute("aria-hidden", "true");
    viewerImg.src = "";
    currentUrl = null;
  }
  function tileOpenHandler(c) {
    c.addEventListener("click", (e) => {
      const t = e.target.closest(".tile");
      if (!t) return;
      const img = t.querySelector("img");
      if (img) openViewer(img.src, img.alt);
    });
  }
  tileOpenHandler(mural);
  tileOpenHandler(albumGrid);
  btnCloseV?.addEventListener("click", closeViewer);
  viewerBackdrop?.addEventListener("click", closeViewer);
  btnDownload?.addEventListener("click", () => {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl;
    a.download = `foto_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // “Tiempo real”: cada 3 s, con pausa al ocultar pestaña
  let poll = null;
  function start() {
    if (!poll) poll = setInterval(loadFromServer, 3000);
  }
  function stop() {
    if (poll) {
      clearInterval(poll);
      poll = null;
    }
  }
  loadFromServer().then(start);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else {
      loadFromServer();
      start();
    }
  });
})();

/* ===== QR mesa con logo — render offscreen y fijar como <img> ===== */
(function renderQRWithLogo() {
  const onReady = (fn) =>
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);

  onReady(() => {
    const box = document.getElementById("qrMesa");
    if (!box || typeof QRCode === "undefined") return;

    const SIZE = 240;
    const LOGO_SRC = "./img/mariposaqr.png"; // ← asegúrate del nombre y carpeta
    const mesaURL = new URL("./mesa.html", location.href).href;

    // 1) Genera el QR en un contenedor oculto (offscreen)
    const temp = document.createElement("div");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    temp.style.top = "-9999px";
    document.body.appendChild(temp);

    new QRCode(temp, {
      text: mesaURL,
      width: SIZE,
      height: SIZE,
      colorDark: "#2a2a2a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    // 2) Espera a que exista canvas/img, dibuja logo en un canvas propio
    function makeFinal() {
      // La lib a veces crea <canvas> o <img>; en ambos casos obtén bitmap
      const srcCanvas = temp.querySelector("canvas");
      const srcImg = temp.querySelector("img");

      if (!srcCanvas && !srcImg) {
        return requestAnimationFrame(makeFinal);
      }

      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");

      const drawQR = () => {
        // Dibuja QR (desde canvas o imagen)
        if (srcCanvas) ctx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);
        else ctx.drawImage(srcImg, 0, 0, SIZE, SIZE);

        // Dibuja base blanca redondeada + logo
        const img = new Image();
        img.onload = () => {
          const pct = 0.22;
          const s = Math.round(SIZE * pct);
          const x = (SIZE - s) >> 1;
          const y = (SIZE - s) >> 1;
          const r = Math.round(s * 0.16);

          ctx.save();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + s, y, x + s, y + s, r);
          ctx.arcTo(x + s, y + s, x, y + s, r);
          ctx.arcTo(x, y + s, x, y, r);
          ctx.arcTo(x, y, x + s, y, r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          ctx.drawImage(img, x, y, s, s);

          // 3) Coloca el PNG final en la página como <img>
          const url = canvas.toDataURL("image/png");
          box.innerHTML = ""; // limpia contenedor
          const out = document.createElement("img");
          out.alt = "QR Mesa de regalos";
          out.src = url;
          box.appendChild(out);

          // botón Descargar usa el mismo PNG final
          document
            .getElementById("btnDescargarQR")
            ?.addEventListener("click", () => {
              const a = document.createElement("a");
              a.href = url;
              a.download = "MesaDeRegalos_QR.png";
              document.body.appendChild(a);
              a.click();
              a.remove();
            });

          // limpia el offscreen
          temp.remove();
        };
        img.onerror = () => {
          console.warn("No se encontró el logo:", LOGO_SRC);
          // si falla el logo, al menos muestra el QR
          const url = canvas.toDataURL("image/png");
          box.innerHTML = "";
          const out = document.createElement("img");
          out.alt = "QR Mesa de regalos";
          out.src = url;
          box.appendChild(out);
          temp.remove();
        };
        img.src = LOGO_SRC + "?v=" + Date.now(); // evita caché de iOS
      };

      // Si vino como <img>, puede que aún no cargue el dataURL: espera onload
      if (srcImg && !srcImg.complete) srcImg.onload = drawQR;
      else drawQR();
    }
    makeFinal();
  });
})();
/* ====== RSVP (WhatsApp con cantidad + bloqueo tras confirmar) ====== */
/* ====== RSVP (WhatsApp + borrar en cada visita + Cambiar) ====== */
(function initRSVP() {
  const LS_KEY = "rsvp_count";
  const LS_LOCK = "rsvp_locked";
  const numeroWhatsApp = "525662707377"; // 52 + 10 dígitos

  const onReady = (fn) =>
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);

  onReady(() => {
    const input = document.getElementById("numPersonas");
    const btnConfirmar = document.getElementById("btnConfirmar");
    const btnAsistire = document.getElementById("btnAsistire");
    const estadoCantidad = document.getElementById("estadoCantidad");
    const btnCambiar = document.getElementById("btnCambiar");

    if (!input || !btnConfirmar || !btnAsistire) return;

    // 🔄 Borra siempre al entrar (nuevo load)
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_LOCK);

    // Estado inicial (editable, sin confirmar)
    input.disabled = false;
    btnConfirmar.disabled = false;
    btnAsistire.disabled = true; // hasta confirmar
    if (estadoCantidad)
      estadoCantidad.textContent = "Ingresa la cantidad y presiona Confirmar.";

    function lockUI(num) {
      input.disabled = true;
      btnConfirmar.disabled = true;
      btnAsistire.disabled = false; // ya puede enviar WhatsApp
      if (estadoCantidad) {
        estadoCantidad.textContent = `Cantidad confirmada: ${num} persona${
          num > 1 ? "s" : ""
        }.`;
      }
    }

    function unlockUI() {
      input.disabled = false;
      btnConfirmar.disabled = false;
      btnAsistire.disabled = true; // hasta volver a confirmar
      if (estadoCantidad)
        estadoCantidad.textContent =
          "Puedes editar la cantidad y volver a confirmar.";
      input.focus();
    }

    // Confirmar (guarda SOLO para esta visita) y bloquea edición
    btnConfirmar.addEventListener("click", () => {
      const val = (input.value || "").trim();
      const num = parseInt(val, 10);
      if (!val || isNaN(num) || num < 1 || num > 20) {
        alert("Ingresa un número válido entre 1 y 20 ✨");
        input.focus();
        return;
      }
      localStorage.setItem(LS_KEY, String(num));
      localStorage.setItem(LS_LOCK, "1");
      lockUI(num);
    });

    // Cambiar (opcional)
    btnCambiar?.addEventListener("click", () => {
      localStorage.removeItem(LS_LOCK);
      localStorage.removeItem(LS_KEY);
      input.value = "";
      unlockUI();
    });

    // Asistiré (usa la cantidad confirmada)
    btnAsistire.addEventListener("click", (e) => {
      e.preventDefault();
      const stored = parseInt(localStorage.getItem(LS_KEY) || "", 10);
      if (!stored || isNaN(stored) || stored < 1) {
        alert("Primero escribe la cantidad y presiona Confirmar 💕");
        input.focus();
        return;
      }
      const mensaje =
        `¡Hola! Confirmo mi asistencia 🎉\n` +
        `Seremos ${stored} persona${stored > 1 ? "s" : ""} en total.`;

      // Más compatible en iOS/PWA:
      window.location.href = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
        mensaje
      )}`;
    });
  });
})();
