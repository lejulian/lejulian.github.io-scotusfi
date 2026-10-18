/* SCOTUS Radio — lofi oral arguments */
(() => {
    "use strict";

    // ---------- Music ----------
    // Tracks with a `source` link to the page where the track and its license are published.
    // The OpenGameArt tracks are all CC0 (public domain) and are streamed from opengameart.org.
    // To host one yourself, download the MP3 into playlist/ and change its `src` to "playlist/<file>.mp3".
    const OGA = "https://opengameart.org/sites/default/files/";
    const lofiPlaylist = [
        { title: "Floater", artist: "Auxjack", src: "playlist/Floater.mp3" },
        { title: "Jazzy Wave", artist: "yourneighborsclassicbeats", src: "playlist/Jazzy Wave.mp3" },
        { title: "Deep Sea Treasures", artist: "sleepsleepsleep", src: "playlist/Deep Sea Treasures.mp3" },
        { title: "Chill", artist: "sleepsleepsleep", src: "playlist/Chill.mp3" },
        { title: "Rude", artist: "Eternal Youth", src: "playlist/Rude.mp3" },

        { title: "Chill Lofi Inspired", artist: "omfgdude", src: OGA + "ChillLofiR_0.mp3", source: "https://opengameart.org/content/chill-lofi-inspired" },
        { title: "Dimly Lit", artist: "iamoneabe", src: OGA + "dimlylit_0.mp3", source: "https://opengameart.org/content/dimly-lit" },
        { title: "Quickie Trix", artist: "iamoneabe", src: OGA + "quickietrix_0.mp3", source: "https://opengameart.org/content/quickie-trix" },
        { title: "WiFi Trasherino", artist: "Sudocolon", src: OGA + "WiFi%20Trasherino_0.mp3", source: "https://opengameart.org/content/wifi-trasherino" },
        { title: "Cue", artist: "Tad", src: OGA + "Cue_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Bartender", artist: "Tad", src: OGA + "Bartender_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Cat Caffe", artist: "Tad", src: OGA + "Cat%20caffe_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Rainy Forest", artist: "Tad", src: OGA + "Rainy%20Forest_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Countryside", artist: "Tad", src: OGA + "Countryside_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Oceanside", artist: "Tad", src: OGA + "Oceanside_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
        { title: "Florist", artist: "Tad", src: OGA + "Florist_0.mp3", source: "https://opengameart.org/content/lofi-compilation" },
    ];

    // ---------- Arguments ----------
    // The list comes from cases.json, which a GitHub Action refreshes every morning
    // from supremecourt.gov (see scripts/update_cases.py). This is only a fallback
    // for when that file can't be loaded, e.g. when opening index.html straight from disk.
    const FALLBACK_TERMS = [{
        term: 2026,
        cases: [
            { docket: "25-459", name: "Salazar v. Paramount Global", date: "2026-10-14" },
            { docket: "25-5343", name: "Beaird v. United States", date: "2026-10-13" },
            { docket: "25-579", name: "Department of Air Force v. Prutehi Guahan", date: "2026-10-07" },
            { docket: "25-498", name: "Anderson v. Intel Corp. Investment Policy Committee", date: "2026-10-06" },
            { docket: "25-735", name: "Johnson v. United States Congress", date: "2026-10-05" },
            { docket: "25-170", name: "Suncor Energy (U.S.A.) Inc. v. Commissioners of Boulder County", date: "2026-10-05" },
        ],
    }];

    const MP3 = (docket) => `https://www.supremecourt.gov/media/audio/mp3files/${docket}.mp3`;
    const DOCKET_PAGE = (docket) => `https://www.supremecourt.gov/docket/docketfiles/html/public/${docket}.html`;
    const NEW_DAYS = 10; // cases argued this recently get a "New" tag

    // ---------- Elements ----------
    const $ = (id) => document.getElementById(id);
    const scotus = $("scotus-audio");
    const lofi = $("lofi-audio");
    const playBtn = $("play-pause-btn");
    const caseName = $("case-name");
    const caseDate = $("case-date");
    const docketLink = $("docket-link");
    const transcriptLink = $("transcript-link");
    const statusEl = $("case-status");
    const progress = $("progress");
    const tCur = $("time-current");
    const tTot = $("time-total");
    const termTabs = $("term-tabs");
    const caseList = $("case-list");
    const listUpdated = $("list-updated");
    const songSelect = $("song-select");
    const trackCredit = $("track-credit");
    const scotusVol = $("scotus-volume");
    const lofiVol = $("lofi-volume");
    const scotusMute = $("scotus-mute");
    const lofiMute = $("lofi-mute");

    // ---------- Saved preferences (per browser) ----------
    const store = {
        get(key, fallback) {
            try { const v = localStorage.getItem("scotusfi." + key); return v === null ? fallback : JSON.parse(v); }
            catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem("scotusfi." + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
        },
    };
    const positions = store.get("positions", {}); // docket -> seconds listened

    // ---------- State ----------
    let terms = [];          // [{term, cases:[...]}] newest term first
    let queue = [];          // flat list of every case, in list order
    let current = null;      // the case loaded in the player
    let shownTerm = null;    // which term's tab is open
    let songIndex = Math.floor(Math.random() * lofiPlaylist.length);
    let isPlaying = false;
    let isSeeking = false;
    let failedSongs = 0;

    // ---------- Helpers ----------
    const clampIndex = (i, len) => ((Number(i) % len) + len) % len;
    const parseDate = (iso) => (iso ? new Date(iso + "T12:00:00") : null);

    function fmt(sec) {
        if (!isFinite(sec) || sec < 0) return "--:--";
        sec = Math.floor(sec);
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
    }

    function paintRange(input) {
        const min = Number(input.min) || 0, max = Number(input.max) || 1;
        input.style.setProperty("--fill", `${((input.value - min) / (max - min)) * 100}%`);
    }

    function setStatus(text, isError = false) {
        statusEl.textContent = text;
        statusEl.classList.toggle("is-error", isError);
    }

    function setPlayingUI(playing) {
        playBtn.classList.toggle("is-playing", playing);
        document.body.classList.toggle("is-playing", playing);
        playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
        document.title = playing && current ? `▶ ${current.name} · SCOTUS Radio` : "SCOTUS Radio · lofi oral arguments";
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }

    // ---------- Playback ----------
    async function play() {
        if (!current) return;
        isPlaying = true;
        setPlayingUI(true);
        const results = await Promise.allSettled([scotus.play(), lofi.play()]);
        if (results.every((r) => r.status === "rejected")) {
            isPlaying = false;
            setPlayingUI(false);
        }
    }

    function pause() {
        isPlaying = false;
        scotus.pause();
        lofi.pause();
        savePosition();
        setPlayingUI(false);
    }

    const toggle = () => (isPlaying ? pause() : play());

    // ---------- Loading the argument list ----------
    async function loadCases() {
        try {
            const res = await fetch("cases.json", { cache: "no-cache" });
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            terms = (data.terms || []).filter((t) => t.cases && t.cases.length);
            if (data.updated) {
                const d = new Date(data.updated);
                listUpdated.textContent = `List updated ${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
            }
        } catch {
            terms = [];
        }
        if (!terms.length) terms = FALLBACK_TERMS;

        terms.sort((a, b) => b.term - a.term);
        queue = terms.flatMap((t) => t.cases.map((c) => ({ ...c, term: t.term, audio: c.audio || MP3(c.docket) })));

        const saved = store.get("case", null);
        const start = queue.find((c) => c.docket === saved) || queue[0];
        shownTerm = start.term;
        renderTabs();
        renderList();
        loadCase(start, { autoplay: false, animate: false });
    }

    function renderTabs() {
        termTabs.innerHTML = "";
        termTabs.hidden = terms.length < 2;
        terms.forEach((t) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "term-tab";
            b.role = "tab";
            b.textContent = `${t.term} term`;
            b.title = `October Term ${t.term}`;
            b.setAttribute("aria-selected", String(t.term === shownTerm));
            b.addEventListener("click", () => {
                shownTerm = t.term;
                renderTabs();
                renderList();
                caseList.scrollTop = 0;
            });
            termTabs.appendChild(b);
        });
    }

    function renderList() {
        const term = terms.find((t) => t.term === shownTerm) || terms[0];
        caseList.innerHTML = "";
        if (!term) {
            caseList.innerHTML = '<p class="list-empty">No arguments have been posted yet this term.</p>';
            return;
        }

        const today = new Date();
        let group = null, groupKey = null;
        term.cases.forEach((c) => {
            const d = parseDate(c.date);
            const key = d ? `${d.getFullYear()}-${d.getMonth()}` : "undated";
            if (key !== groupKey) {
                groupKey = key;
                const h = document.createElement("h3");
                h.className = "month";
                h.textContent = d ? d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "Other";
                group = document.createElement("ul");
                group.className = "month-group";
                caseList.append(h, group);
            }

            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.className = "case-row";
            b.dataset.docket = c.docket;
            if (current && current.docket === c.docket) b.setAttribute("aria-current", "true");

            const day = document.createElement("span");
            day.className = "row-day";
            day.textContent = d ? d.getDate() : "";

            const name = document.createElement("span");
            name.className = "row-name";
            name.textContent = c.name;

            const side = document.createElement("span");
            side.className = "row-side";
            if (d && (today - d) / 864e5 <= NEW_DAYS) {
                const n = document.createElement("span");
                n.className = "row-new";
                n.textContent = "New";
                side.append(n);
            }
            const pos = positions[c.docket];
            if (pos > 30 && !(current && current.docket === c.docket)) {
                const p = document.createElement("span");
                p.className = "row-progress";
                p.textContent = fmt(pos);
                p.title = `You stopped at ${fmt(pos)}`;
                side.append(p);
            }
            const eq = document.createElement("span");
            eq.className = "eq";
            eq.setAttribute("aria-hidden", "true");
            eq.innerHTML = "<i></i><i></i><i></i>";
            side.append(eq);

            b.append(day, name, side);
            b.addEventListener("click", () => {
                const target = queue.find((q) => q.docket === c.docket && q.term === term.term);
                if (current && target.docket === current.docket) toggle();
                else loadCase(target, { autoplay: true });
            });
            li.append(b);
            group.append(li);
        });
    }

    function markCurrentRow() {
        caseList.querySelectorAll(".case-row").forEach((row) => {
            const on = current && row.dataset.docket === current.docket;
            if (on) row.setAttribute("aria-current", "true");
            else row.removeAttribute("aria-current");
        });
    }

    // ---------- The player ----------
    function loadCase(c, { autoplay = isPlaying, animate = true } = {}) {
        if (!c) return;
        savePosition();
        current = c;
        store.set("case", c.docket);

        caseName.textContent = c.name;
        if (animate) {
            caseName.classList.remove("is-entering");
            void caseName.offsetWidth;
            caseName.classList.add("is-entering");
        }
        const d = parseDate(c.date);
        caseDate.textContent = d ? `Argued ${d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : `October Term ${c.term}`;

        docketLink.hidden = false;
        docketLink.textContent = `Docket ${c.docket}`;
        docketLink.href = DOCKET_PAGE(c.docket);
        transcriptLink.hidden = !c.transcript;
        if (c.transcript) transcriptLink.href = c.transcript;

        scotus.src = c.audio;
        progress.value = 0;
        progress.disabled = true;
        paintRange(progress);
        tCur.textContent = fmt(positions[c.docket] || 0);
        tTot.textContent = "--:--";
        setStatus("");

        // Show this case's term in the list if it isn't open
        if (c.term !== shownTerm) {
            shownTerm = c.term;
            renderTabs();
            renderList();
        } else {
            markCurrentRow();
        }
        const row = caseList.querySelector(`.case-row[aria-current="true"]`);
        if (row && animate) row.scrollIntoView({ block: "nearest", behavior: "smooth" });

        const i = queue.indexOf(c);
        $("prev-case").disabled = i <= 0;
        $("next-case").disabled = i >= queue.length - 1;

        updateMediaSession();
        if (autoplay) play(); else setPlayingUI(false);
    }

    function step(delta) {
        const i = queue.indexOf(current) + delta;
        if (i >= 0 && i < queue.length) loadCase(queue[i]);
    }
    $("prev-case").addEventListener("click", () => step(-1));
    $("next-case").addEventListener("click", () => step(1));

    // Remember where you were in each argument
    function savePosition() {
        if (!current || !isFinite(scotus.duration) || !scotus.currentTime) return;
        const t = scotus.currentTime;
        if (t > 30 && t < scotus.duration - 60) positions[current.docket] = Math.floor(t);
        else delete positions[current.docket];
        store.set("positions", positions);
    }
    setInterval(() => { if (isPlaying) savePosition(); }, 5000);
    window.addEventListener("pagehide", savePosition);

    scotus.addEventListener("loadedmetadata", () => {
        tTot.textContent = fmt(scotus.duration);
        progress.disabled = !isFinite(scotus.duration);
        const resume = current && positions[current.docket];
        if (resume && resume < scotus.duration - 60) scotus.currentTime = resume;
    });
    scotus.addEventListener("timeupdate", () => {
        if (isSeeking || !isFinite(scotus.duration)) return;
        progress.value = (scotus.currentTime / scotus.duration) * 1000;
        paintRange(progress);
        tCur.textContent = fmt(scotus.currentTime);
    });
    scotus.addEventListener("waiting", () => { if (isPlaying) { playBtn.classList.add("is-loading"); setStatus("Loading…"); } });
    scotus.addEventListener("playing", () => { playBtn.classList.remove("is-loading"); setStatus(""); });
    scotus.addEventListener("canplay", () => { playBtn.classList.remove("is-loading"); if (!statusEl.classList.contains("is-error")) setStatus(""); });
    scotus.addEventListener("error", () => {
        if (!scotus.getAttribute("src")) return;
        playBtn.classList.remove("is-loading");
        setStatus("This recording didn't load. Try another case.", true);
    });
    scotus.addEventListener("ended", () => {
        if (current) { delete positions[current.docket]; store.set("positions", positions); }
        const i = queue.indexOf(current);
        if (i < queue.length - 1) loadCase(queue[i + 1], { autoplay: true });
        else pause();
    });

    progress.addEventListener("input", () => {
        isSeeking = true;
        paintRange(progress);
        tCur.textContent = fmt((progress.value / 1000) * scotus.duration);
    });
    progress.addEventListener("change", () => {
        if (isFinite(scotus.duration)) scotus.currentTime = (progress.value / 1000) * scotus.duration;
        isSeeking = false;
        savePosition();
    });

    function seekBy(sec) {
        if (!isFinite(scotus.duration)) return;
        scotus.currentTime = Math.min(Math.max(scotus.currentTime + sec, 0), scotus.duration - 0.5);
    }
    $("back-btn").addEventListener("click", () => seekBy(-15));
    $("fwd-btn").addEventListener("click", () => seekBy(15));
    playBtn.addEventListener("click", toggle);

    // ---------- Music ----------
    lofiPlaylist.forEach((s, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `${s.title} · ${s.artist}`;
        songSelect.appendChild(opt);
    });

    function loadSong(index, { autoplay = isPlaying } = {}) {
        songIndex = clampIndex(index, lofiPlaylist.length);
        const s = lofiPlaylist[songIndex];
        lofi.src = s.src;
        songSelect.value = songIndex;
        songSelect.title = `${s.title} by ${s.artist}`;

        trackCredit.textContent = "";
        if (s.source) {
            const a = document.createElement("a");
            a.href = s.source;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = `${s.title} by ${s.artist}`;
            trackCredit.append("Music: ", a, " (CC0).");
        }
        if (autoplay) lofi.play().catch(() => {});
    }
    const nextSong = () => loadSong(songIndex + 1);

    songSelect.addEventListener("change", (e) => { failedSongs = 0; loadSong(e.target.value); });
    lofi.addEventListener("ended", () => { failedSongs = 0; nextSong(); });
    lofi.addEventListener("playing", () => { failedSongs = 0; });
    // Skip tracks that fail to load, but stop after a full lap so it never loops forever.
    lofi.addEventListener("error", () => {
        if (!lofi.getAttribute("src")) return;
        failedSongs += 1;
        if (failedSongs < lofiPlaylist.length) nextSong();
    });
    $("skip-btn").addEventListener("click", () => {
        if (isPlaying) nextSong();
        else { loadSong(songIndex + 1, { autoplay: false }); play(); }
    });

    // ---------- Mixer ----------
    function bindFader(input, audio, muteBtn, key) {
        input.value = store.get(key + "Vol", input.value);
        audio.volume = input.value;
        audio.muted = store.get(key + "Muted", false);
        muteBtn.setAttribute("aria-pressed", String(audio.muted));
        paintRange(input);

        input.addEventListener("input", () => {
            audio.volume = input.value;
            if (audio.muted && Number(input.value) > 0) {
                audio.muted = false;
                muteBtn.setAttribute("aria-pressed", "false");
                store.set(key + "Muted", false);
            }
            paintRange(input);
            store.set(key + "Vol", Number(input.value));
        });
        muteBtn.addEventListener("click", () => {
            audio.muted = !audio.muted;
            muteBtn.setAttribute("aria-pressed", String(audio.muted));
            store.set(key + "Muted", audio.muted);
        });
    }
    bindFader(scotusVol, scotus, scotusMute, "scotus");
    bindFader(lofiVol, lofi, lofiMute, "lofi");

    // ---------- Keyboard ----------
    document.addEventListener("keydown", (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = e.target.tagName;
        const inRange = tag === "INPUT" && e.target.type === "range";
        if (tag === "SELECT" || (tag === "INPUT" && !inRange) || tag === "TEXTAREA") return;

        switch (e.key) {
            case " ":
                if (tag === "BUTTON") return; // buttons handle their own space
                e.preventDefault(); toggle(); break;
            case "k": toggle(); break;
            case "ArrowLeft":  if (!inRange) { e.preventDefault(); seekBy(-15); } break;
            case "ArrowRight": if (!inRange) { e.preventDefault(); seekBy(15); } break;
            case "n": case "N": $("skip-btn").click(); break;
            case "[": step(-1); break;
            case "]": step(1); break;
            case "m": case "M": scotusMute.click(); break;
        }
    });

    // ---------- Lock screen / media keys ----------
    function updateMediaSession() {
        if (!("mediaSession" in navigator) || !current) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: current.name,
            artist: "Supreme Court of the United States",
            album: `SCOTUS Radio · October Term ${current.term}`,
            artwork: [{ src: "images/2.jpg", sizes: "4800x3200", type: "image/jpeg" }],
        });
    }
    if ("mediaSession" in navigator) {
        const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch { /* unsupported */ } };
        set("play", play);
        set("pause", pause);
        set("previoustrack", () => step(-1));
        set("nexttrack", () => step(1));
        set("seekbackward", () => seekBy(-15));
        set("seekforward", () => seekBy(15));
    }

    // ---------- Start ----------
    loadSong(songIndex, { autoplay: false });
    loadCases();
})();
