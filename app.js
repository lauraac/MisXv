/* ====== REPRODUCTOR ====== */
const btnAudio = document.getElementById("btnAudio");
const song = document.getElementById("song");
let playing = false;
const p = song.play();

// ===== Config =====
const VISIBLE = 6; // fotos visibles en el mural
const LIMIT = 200; // máximo total guardado

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
  const dtstart = "20251220T170000";
  const dtend = "20251220T233000";
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:${dtstart}Z
DTSTART:${dtstart}Z
DTEND:${dtend}Z
SUMMARY:XV de Ximena Adilene
LOCATION:Parroquia Santos Reyes Magos y Auditorio San Sebastián Chimalpa
DESCRIPTION:¡Acompáñanos a celebrar! Ceremonia 5:00 p.m. y recepción posterior.
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.getElementById("btnCalendario");
  a.href = url;
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
async function uploadOne(file) {
  const FN = `${location.origin}/.netlify/functions/upload`;
  const res = await fetch(FN, {
    method: "POST",
    headers: {
      "content-type": file.type || "application/octet-stream",
      "x-filename": file.name || "foto.jpg",
      "x-content-type": file.type || "image/jpeg",
      Accept: "application/json",
    },
    body: file,
  });

  // Mejor manejo de errores para ver el detalle
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload HTTP ${res.status}: ${txt || "sin detalle"}`);
  }

  const json = await res.json().catch(() => null);
  if (!json || !json.ok || !json.url) {
    throw new Error("Respuesta inesperada del servidor");
  }

  const mias = JSON.parse(localStorage.getItem("fotosSubidas") || "[]");
  mias.push(json.url);
  localStorage.setItem("fotosSubidas", JSON.stringify(mias));
  return json.url;
}

async function fetchFotosServer() {
  const FN = `${location.origin}/.netlify/functions/list-photos`;
  const res = await fetch(FN);
  if (!res.ok) throw new Error(`list_failed (${res.status})`);
  const data = await res.json().catch(() => ({}));
  return data.items || [];
}

async function fetchFotosServer() {
  const res = await fetch("/.netlify/functions/list-photos");
  if (!res.ok) throw new Error("list_failed");
  const data = await res.json();
  return data.items || []; // [{key,url}]
}

/* ===== Hashtag: subida, mural (6) + Álbum (todas), visor, eliminar ===== */
(function hashtagWithAlbum() {
  const dz = document.getElementById("dropzone");
  const input = document.getElementById("photoInput");
  const grid = document.getElementById("uploadGrid");
  const btnCopy = document.getElementById("copyHash");
  const btnClear = document.getElementById("clearPhotos");
  const hashEl = document.getElementById("hashTagText");

  const mural = document.getElementById("muralGrid");
  const muralSection = document.getElementById("mural"); // <section id="mural">
  if (muralSection) muralSection.style.display = "none"; // oculto al cargar

  const btnAlbum = document.getElementById("btnAlbum");
  const albumModal = document.getElementById("albumModal");
  const albumGrid = document.getElementById("albumGrid");
  const closeAlbum = document.getElementById("closeAlbum");

  const fitSelect = document.getElementById("fitMode");
  function applyFit(mode) {
    const cls = mode === "contain" ? "fit-contain" : "fit-cover";
    [mural, albumGrid].forEach((el) => {
      el?.classList.remove("fit-cover", "fit-contain");
      el?.classList.add(cls);
    });
  }
  applyFit(fitSelect?.value || "cover");
  fitSelect?.addEventListener("change", () => applyFit(fitSelect.value));

  if (!dz || !input || !mural || !albumGrid) return;

  // Estado (urls en orden de subida)
  const filesState = []; // { url } // ahora vendrá del servidor
  // ——— SINCRONIZACIÓN CON EL SERVIDOR ———
  async function loadFromServer() {
    try {
      const items = await fetchFotosServer(); // [{key,url}]
      // pisamos el estado local con lo del servidor (orden ya viene por sort)
      filesState.length = 0;
      for (const it of items) filesState.push({ url: it.url, file: null });

      toggleMuralSection();
      renderMural();
      renderAlbum();
    } catch (e) {
      console.warn("No se pudo cargar del servidor:", e?.message || e);
    }
  }

  // Muestra el <section id="mural"> solo si hay fotos
  function toggleMuralSection() {
    if (!muralSection) return;
    muralSection.style.display = filesState.length > 0 ? "" : "none";
  }

  // Exponla global para que otros módulos (QR) puedan llamarla
  window.loadFromServer = loadFromServer;

  // Helper: elimina del estado por URL y re-renderiza
  function removeByUrl(url) {
    const i = filesState.findIndex((f) => f.url === url);
    if (i > -1) {
      try {
        URL.revokeObjectURL(filesState[i].url);
      } catch {}
      filesState.splice(i, 1);
      renderMural();
      renderAlbum();
    }
  }

  // Render Mural: SOLO las 6 más recientes (con botón eliminar)
  function renderMural() {
    mural.innerHTML = "";
    const last = filesState.slice(-VISIBLE);
    last.forEach(({ url, file }) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.url = url;

      const img = document.createElement("img");
      img.src = url;
      img.alt = file?.name || "";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.title = "Eliminar foto";
      del.textContent = "🗑️";

      tile.appendChild(img);
      tile.appendChild(del);
      mural.appendChild(tile);
      toggleMuralSection();
    });

    // Mostrar/ocultar botón Ver más y contador
    const total = filesState.length;
    if (total > VISIBLE) {
      btnAlbum.style.display = "";
      btnAlbum.textContent = `📚 Ver más (${total})`;
    } else {
      btnAlbum.style.display = "none";
    }
  }

  // Render Álbum: TODAS (miniaturas) + botón eliminar en cada una
  function renderAlbum() {
    albumGrid.innerHTML = "";
    filesState.forEach(({ url, file }) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.url = url;

      const img = document.createElement("img");
      img.src = url;
      img.alt = file?.name || "";
      img.loading = "lazy";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.title = "Eliminar foto";
      del.textContent = "🗑️";

      tile.appendChild(img);
      tile.appendChild(del);
      albumGrid.appendChild(tile);
    });

    // Sincroniza el texto del botón por si cambió el total
    const total = filesState.length;
    if (total > VISIBLE) {
      btnAlbum.style.display = "";
      btnAlbum.textContent = `📚 Ver más (${total})`;
    } else {
      btnAlbum.style.display = "none";
    }
  }
  // Carga inicial desde el servidor y refresca cada 10s
  loadFromServer();
  setInterval(loadFromServer, 10000);

  // Añadir foto respetando el LÍMITE (elimina más antiguas si se excede)
  function addThumb(file) {
    const url = URL.createObjectURL(file);
    filesState.push({ file, url });

    while (filesState.length > LIMIT) {
      const removed = filesState.shift();
      try {
        URL.revokeObjectURL(removed.url);
      } catch {}
    }

    renderMural();
    renderAlbum();
  }

  async function handleFiles(list) {
    const files = Array.from(list || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    for (const f of files) {
      await uploadOne(f);
    }
    await loadFromServer();
    alert("Fotos subidas 💫");
  }

  // Drag & Drop + click
  ["dragenter", "dragover"].forEach((evt) => {
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.remove("dragover");
    });
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

  // Limpiar todo
  btnClear?.addEventListener("click", () => {
    filesState.forEach((f) => {
      try {
        URL.revokeObjectURL(f.url);
      } catch {}
    });
    filesState.length = 0;
    grid.innerHTML = "";
    renderMural();
    renderAlbum();
  });

  // Modal álbum
  btnAlbum?.addEventListener("click", () => {
    albumModal.setAttribute("aria-hidden", "false");
  });
  document.querySelector(".album-backdrop")?.addEventListener("click", () => {
    albumModal.setAttribute("aria-hidden", "true");
  });
  closeAlbum?.addEventListener("click", () => {
    albumModal.setAttribute("aria-hidden", "true");
  });

  // Visor + descarga
  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewerImg");
  const btnDownload = document.getElementById("btnDownload");
  const btnCloseViewer = document.getElementById("btnCloseViewer");
  const viewerBackdrop = viewer?.querySelector(".viewer-backdrop");
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

  // Abrir visor al tocar imagen (mural y álbum) — ignorando clicks en papelera
  function tileOpenHandler(container) {
    container.addEventListener("click", (e) => {
      if (e.target.closest(".delete-btn")) return; // no abrir si es la papelera
      const tile = e.target.closest(".tile");
      if (!tile) return;
      const img = tile.querySelector("img");
      if (img) openViewer(img.src, img.alt);
    });
  }
  tileOpenHandler(mural);
  tileOpenHandler(albumGrid);

  // Delegación eliminar (mural y álbum)
  function deleteHandler(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-btn");
      if (!btn) return;
      e.stopPropagation();
      const tile = btn.closest(".tile");
      const url = tile?.dataset.url;
      if (!url) return;
      if (confirm("¿Estás seguro de que quieres eliminar esta foto?")) {
        removeByUrl(url);
      }
    });
  }
  deleteHandler(mural);
  deleteHandler(albumGrid);

  btnCloseViewer?.addEventListener("click", closeViewer);
  viewerBackdrop?.addEventListener("click", closeViewer);

  btnDownload?.addEventListener("click", () => {
    if (!currentUrl) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(currentUrl, "_blank");
      return;
    }
    const a = document.createElement("a");
    a.href = currentUrl;
    a.download = `foto_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Init
  renderMural();
  renderAlbum();
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
  // Inicializa y refresca cada 10s
  loadFromServer();
  setInterval(loadFromServer, 10000);
})();
