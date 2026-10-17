/* SCOTUS Radio — lofi oral arguments */
(() => {
    "use strict";

    // ---------- Data ----------
    // To add a case: copy a line, change the name and the docket number in the URL.
    const radioChannels = [
        { name: "Trump v. CASA", src: "https://www.supremecourt.gov/media/audio/mp3files/24A884.mp3" },
        { name: "Medina v. Planned Parenthood South Atlantic", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1275.mp3" },
        { name: "Ames v. Ohio Dept. of Youth Services", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1039.mp3" },
        { name: "TikTok, Inc. v. Garland", src: "https://www.supremecourt.gov/media/audio/mp3files/24-656.mp3" },
        { name: "FDA v. Wages and White Lion", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1038.mp3" },
        { name: "United States v. Miller", src: "https://www.supremecourt.gov/media/audio/mp3files/23-824.mp3" },
        { name: "Hungary v. Simon", src: "https://www.supremecourt.gov/media/audio/mp3files/23-867.mp3" },
        { name: "United States v. Skrmetti", src: "https://www.supremecourt.gov/media/audio/mp3files/23-477.mp3" },
        { name: "Kousisis v. United States", src: "https://www.supremecourt.gov/media/audio/mp3files/23-909.mp3" },
        { name: "Feliciano v. Dept. of Transportation", src: "https://www.supremecourt.gov/media/audio/mp3files/23-861.mp3" },
        { name: "Seven County Coalition v. Eagle County", src: "https://www.supremecourt.gov/media/audio/mp3files/23-975.mp3" },
        { name: "Dewberry Group, Inc. v. Dewberry Engineers Inc.", src: "https://www.supremecourt.gov/media/audio/mp3files/23-900.mp3" },
    ];

    const lofiPlaylist = [
        { title: "Floater", artist: "Auxjack", src: "playlist/Floater.mp3" },
        { title: "Jazzy Wave", artist: "yourneighborsclassicbeats", src: "playlist/Jazzy Wave.mp3" },
        { title: "Deep Sea Treasures", artist: "sleepsleepsleep", src: "playlist/Deep Sea Treasures.mp3" },
        { title: "Chill", artist: "sleepsleepsleep", src: "playlist/Chill.mp3" },
        { title: "Rude", artist: "Eternal Youth", src: "playlist/Rude.mp3" },
    ];

    // ---------- Elements ----------
    const $ = (id) => document.getElementById(id);
    const scotus = $("scotus-audio");
    const lofi = $("lofi-audio");
    const playBtn = $("play-pause-btn");
    const select = $("channel-select");
    const docketLink = $("docket-link");
    const statusEl = $("case-status");
    const progress = $("progress");
    const tCur = $("time-current");
    const tTot = $("time-total");
    const songTitle = $("song-title");
    const scotusVol = $("scotus-volume");
    const lofiVol = $("lofi-volume");
    const scotusMute = $("scotus-mute");
    const lofiMute = $("lofi-mute");

    // ---------- Saved preferences ----------
    const store = {
        get(key, fallback) {
            try { const v = localStorage.getItem("scotusfi." + key); return v === null ? fallback : JSON.parse(v); }
            catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem("scotusfi." + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
        },
    };

    let caseIndex = clampIndex(store.get("case", 0), radioChannels.length);
    let songIndex = Math.floor(Math.random() * lofiPlaylist.length);
    let isPlaying = false;
    let isSeeking = false;
    let hour12 = store.get("hour12", false);

    function clampIndex(i, len) { i = Number(i) || 0; return ((i % len) + len) % len; }
    const docketOf = (src) => src.split("/").pop().replace(/\.mp3$/i, "");

    // ---------- Helpers ----------
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
        playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
        document.title = playing ? `▶ ${radioChannels[caseIndex].name} · SCOTUS Radio` : "SCOTUS Radio · lofi oral arguments";
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }

    // ---------- Playback ----------
    async function play() {
        isPlaying = true;
        setPlayingUI(true);
        const results = await Promise.allSettled([scotus.play(), lofi.play()]);
        // If the browser blocked playback entirely, reflect that.
        if (results.every((r) => r.status === "rejected")) {
            isPlaying = false;
            setPlayingUI(false);
        }
    }

    function pause() {
        isPlaying = false;
        scotus.pause();
        lofi.pause();
        setPlayingUI(false);
    }

    const toggle = () => (isPlaying ? pause() : play());

    // ---------- Cases ----------
    radioChannels.forEach((c, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    function loadCase(index, { autoplay = isPlaying } = {}) {
        caseIndex = clampIndex(index, radioChannels.length);
        const c = radioChannels[caseIndex];
        select.value = caseIndex;
        scotus.src = c.src;
        const docket = docketOf(c.src);
        docketLink.textContent = `Docket ${docket}`;
        docketLink.href = `https://www.supremecourt.gov/docket/docketfiles/html/public/${docket}.html`;
        progress.value = 0;
        progress.disabled = true;
        paintRange(progress);
        tCur.textContent = "0:00";
        tTot.textContent = "--:--";
        setStatus("");
        store.set("case", caseIndex);
        updateMediaSession();
        if (autoplay) play(); else setPlayingUI(false);
    }

    select.addEventListener("change", (e) => loadCase(e.target.value));
    $("prev-case").addEventListener("click", () => loadCase(caseIndex - 1));
    $("next-case").addEventListener("click", () => loadCase(caseIndex + 1));

    scotus.addEventListener("loadedmetadata", () => {
        tTot.textContent = fmt(scotus.duration);
        progress.disabled = !isFinite(scotus.duration);
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
        playBtn.classList.remove("is-loading");
        setStatus("This recording didn't load. Try another case.", true);
    });
    // When an argument finishes, move on to the next one.
    scotus.addEventListener("ended", () => loadCase(caseIndex + 1, { autoplay: true }));

    // Scrubbing
    progress.addEventListener("input", () => {
        isSeeking = true;
        paintRange(progress);
        tCur.textContent = fmt((progress.value / 1000) * scotus.duration);
    });
    progress.addEventListener("change", () => {
        if (isFinite(scotus.duration)) scotus.currentTime = (progress.value / 1000) * scotus.duration;
        isSeeking = false;
    });

    function seekBy(sec) {
        if (!isFinite(scotus.duration)) return;
        scotus.currentTime = Math.min(Math.max(scotus.currentTime + sec, 0), scotus.duration - 0.5);
    }
    $("back-btn").addEventListener("click", () => seekBy(-15));
    $("fwd-btn").addEventListener("click", () => seekBy(15));

    // ---------- Music ----------
    function loadSong(index, { autoplay = isPlaying } = {}) {
        songIndex = clampIndex(index, lofiPlaylist.length);
        const s = lofiPlaylist[songIndex];
        lofi.src = s.src;
        songTitle.innerHTML = "";
        songTitle.append(s.title + " ");
        const artist = document.createElement("span");
        artist.className = "artist";
        artist.textContent = `· ${s.artist}`;
        songTitle.append(artist);
        songTitle.title = `${s.title} by ${s.artist}`;
        if (autoplay) lofi.play().catch(() => {});
    }
    const nextSong = () => loadSong(songIndex + 1);

    lofi.addEventListener("ended", nextSong);
    lofi.addEventListener("error", nextSong);
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

    playBtn.addEventListener("click", toggle);

    // ---------- Clock ----------
    const clockTime = $("clock-time");
    const clockPeriod = $("clock-period");
    function tick() {
        const now = new Date();
        let h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, "0");
        if (hour12) {
            clockPeriod.textContent = h < 12 ? "am" : "pm";
            h = h % 12 || 12;
            clockTime.textContent = `${h}:${m}`;
        } else {
            clockPeriod.textContent = "";
            clockTime.textContent = `${String(h).padStart(2, "0")}:${m}`;
        }
    }
    $("clock").addEventListener("click", () => { hour12 = !hour12; store.set("hour12", hour12); tick(); });
    tick();
    setInterval(tick, 1000);

    // ---------- Keyboard ----------
    document.addEventListener("keydown", (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = e.target.tagName;
        const inRange = tag === "INPUT" && e.target.type === "range";
        if (tag === "SELECT" || (tag === "INPUT" && !inRange) || tag === "TEXTAREA") return;

        switch (e.key) {
            case " ":
            case "k":
                if (tag === "BUTTON" && e.key === " ") return; // let buttons handle their own space
                e.preventDefault(); toggle(); break;
            case "ArrowLeft":  if (!inRange) { e.preventDefault(); seekBy(-15); } break;
            case "ArrowRight": if (!inRange) { e.preventDefault(); seekBy(15); } break;
            case "n": case "N": $("skip-btn").click(); break;
            case "[": loadCase(caseIndex - 1); break;
            case "]": loadCase(caseIndex + 1); break;
            case "m": case "M": scotusMute.click(); break;
        }
    });

    // ---------- Lock screen / media keys ----------
    function updateMediaSession() {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: radioChannels[caseIndex].name,
            artist: "Supreme Court of the United States",
            album: "SCOTUS Radio",
            artwork: [{ src: "images/2.jpg", sizes: "4800x3200", type: "image/jpeg" }],
        });
    }
    if ("mediaSession" in navigator) {
        const ms = navigator.mediaSession;
        const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported */ } };
        set("play", play);
        set("pause", pause);
        set("previoustrack", () => loadCase(caseIndex - 1));
        set("nexttrack", () => loadCase(caseIndex + 1));
        set("seekbackward", () => seekBy(-15));
        set("seekforward", () => seekBy(15));
    }

    // ---------- Init ----------
    loadCase(caseIndex, { autoplay: false });
    loadSong(songIndex, { autoplay: false });
})();
