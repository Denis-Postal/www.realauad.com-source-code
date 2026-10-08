(function () {
    const nav = document.querySelector(".nav");
    const app = document.getElementById("app");
    const progress = document.querySelector(".route-progress");
    if (!nav || !app) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateNav = () => nav.classList.toggle("scrolled", app.dataset.page !== "home" || scrollY > 40);
    addEventListener("scroll", updateNav, { passive: true });

    const toggle = nav.querySelector(".nav-toggle");
    const setMenu = open => {
        document.documentElement.classList.toggle("menu-open", open);
        toggle.setAttribute("aria-expanded", open);
        toggle.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
    matchMedia("(min-width: 821px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

    let countdownTimer = null;
    let clockOffset = 0;
    const clockSync = fetch("/ads.txt", { method: "HEAD", cache: "no-store" }).then(res => {
        const server = Date.parse(res.headers.get("date"));
        if (!Number.isNaN(server)) {
            const diff = server + 500 - Date.now();
            if (Math.abs(diff) > 2000) clockOffset = diff;
        }
    }).catch(() => {});
    const now = () => Date.now() + clockOffset;

    const pages = {
        home(root) {
            const modes = root.querySelector(".modes");
            if (modes) {
                const tiles = [...modes.querySelectorAll(".mode")];
                const dots = [...root.querySelectorAll("[data-modes-go]")];
                const arrows = [...root.querySelectorAll("[data-modes-step]")];
                let current = 0;
                const go = i => {
                    i = Math.max(0, Math.min(tiles.length - 1, i));
                    modes.scrollTo({ left: tiles[i].offsetLeft - tiles[0].offsetLeft, behavior: reducedMotion ? "instant" : "smooth" });
                };
                const sync = () => {
                    const left = modes.scrollLeft;
                    current = tiles.reduce((best, t, i) => Math.abs(t.offsetLeft - tiles[0].offsetLeft - left) < Math.abs(tiles[best].offsetLeft - tiles[0].offsetLeft - left) ? i : best, 0);
                    dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
                    arrows[0].disabled = current === 0;
                    arrows[1].disabled = current === tiles.length - 1;
                };
                modes.addEventListener("scroll", sync, { passive: true });
                dots.forEach(d => d.addEventListener("click", () => go(Number(d.dataset.modesGo))));
                arrows.forEach(a => a.addEventListener("click", () => go(current + Number(a.dataset.modesStep))));
                sync();
            }

            const player = root.querySelector("[data-player]");
            if (player) {
                const play = id => {
                    player.dataset.id = id;
                    player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
                };
                player.addEventListener("click", e => { if (e.target.closest(".player-start")) play(player.dataset.id); });
                root.querySelectorAll("[data-video]").forEach(btn => btn.addEventListener("click", () => {
                    root.querySelectorAll("[data-video]").forEach(b => b.classList.toggle("is-active", b === btn));
                    root.querySelector("[data-player-title]").textContent = btn.dataset.title;
                    root.querySelector("[data-player-date]").textContent = btn.dataset.date;
                    play(btn.dataset.video);
                    if (player.getBoundingClientRect().top < 70) player.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "center" });
                }));
            }

            const downloads = root.querySelector("[data-downloads]");
            if (downloads) {
                const ua = navigator.userAgent;
                const want = /Android/i.test(ua) ? "Android" : /Linux|X11|CrOS/i.test(ua) && !/Android/i.test(ua) ? "Linux" : null;
                const primary = downloads.querySelector("[data-primary]");
                const alt = want && downloads.querySelector(`.hero-alt [data-platform="${want}"]`);
                if (primary && alt) {
                    const mine = { href: primary.href, platform: primary.dataset.platform, meta: primary.dataset.meta };
                    primary.href = alt.href;
                    primary.dataset.platform = alt.dataset.platform;
                    primary.dataset.meta = alt.dataset.meta;
                    primary.querySelector("[data-name]").textContent = alt.dataset.platform;
                    primary.querySelector("[data-meta-out]").textContent = alt.dataset.meta;
                    alt.href = mine.href;
                    alt.dataset.platform = mine.platform;
                    alt.dataset.meta = mine.meta;
                    alt.textContent = mine.platform;
                }
            }

            const notes = root.querySelector("[data-release-notes]");
            const more = root.querySelector("[data-release-more]");
            if (notes && more) {
                const fits = notes.scrollHeight <= notes.clientHeight + 4;
                notes.classList.toggle("fits", fits);
                more.hidden = fits;
                more.addEventListener("click", () => {
                    const open = notes.classList.toggle("is-open");
                    more.textContent = open ? "Show less" : "Show all notes";
                });
            }

            const box = root.querySelector("[data-countdown]");
            if (!box) return;
            const target = Number(box.dataset.countdown) * 1000;
            const unit = name => box.querySelector(`[data-unit="${name}"]`);
            const pad = n => String(n).padStart(2, "0");
            const tick = () => {
                if (!box.isConnected) { clearInterval(countdownTimer); return; }
                const left = Math.max(0, Math.floor((target - now()) / 1000));
                unit("days").textContent = pad(Math.floor(left / 86400));
                unit("hours").textContent = pad(Math.floor(left % 86400 / 3600));
                unit("minutes").textContent = pad(Math.floor(left % 3600 / 60));
                unit("seconds").textContent = pad(left % 60);
                box.querySelector("[data-days]").hidden = left < 86400;
                box.classList.toggle("is-done", left === 0);
                if (left === 0) clearInterval(countdownTimer);
            };
            clearInterval(countdownTimer);
            tick();
            countdownTimer = setInterval(tick, 1000);
            clockSync.then(tick);
        },

        leaderboard(root) {
            const box = root.querySelector("[data-lb]");
            if (!box) return;
            const search = root.querySelector("#lb-search");
            const podium = root.querySelector("#podium");
            const rowsEl = root.querySelector("#lb-rows");
            const none = root.querySelector("#lb-none");
            const foot = root.querySelector("[data-lb-foot]");
            const errorEl = root.querySelector("[data-lb-error]");
            const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
            const num = v => Number(v || 0).toLocaleString("en-US");
            const where = p => [p.country ? `<span>${esc(p.country)}</span>` : "", p.online ? '<span class="on">Online</span>' : ""].join("");
            let fetchedAt = 0, offset = 0, firstLoad = true, timer = null, ticker = null;

            const filter = () => {
                const q = search.value.trim().toLowerCase();
                let shown = 0;
                for (const r of rowsEl.rows) {
                    const hit = !q || (r.dataset.name || "").toLowerCase().includes(q);
                    r.hidden = !hit;
                    if (hit) shown++;
                }
                podium.hidden = !!q;
                none.style.display = q && !shown ? "block" : "none";
            };
            search.addEventListener("input", filter);

            const age = () => {
                const secs = Math.max(0, Math.round((Date.now() + offset) / 1000 - fetchedAt));
                foot.textContent = "Updated " + (secs < 5 ? "just now" : secs < 120 ? secs + " seconds ago" : Math.floor(secs / 60) + " minutes ago") + ". Refreshes every minute.";
            };

            function render(data) {
                const players = data.players;
                fetchedAt = data.fetched;
                offset = data.now * 1000 - Date.now();
                root.querySelector("[data-lb-count]").textContent = players.length;
                root.querySelector("[data-lb-online]").textContent = players.filter(p => p.online).length;

                podium.innerHTML = players.slice(0, 3).map((p, i) => `
                    <div class="podium-card ${["gold", "silver", "bronze"][i]}${firstLoad ? " pop-in" : ""}" style="--i:${i}">
                        <div class="place">${p.rank}</div>
                        <div class="who">${esc(p.name)}</div>
                        <div class="from">${where(p)}</div>
                        <div class="score">${num(p.score)}<small>pts</small></div>
                        <div class="line"><span>${num(p.wins)} wins</span><span>${num(p.games)} games</span><span>${num(p.tasks)} tasks</span></div>
                    </div>`).join("");

                rowsEl.innerHTML = players.map((p, i) => `
                    <tr data-name="${esc(p.name + " " + (p.country || ""))}"${firstLoad && i < 30 ? ` class="pop-in" style="--i:${i + 3}"` : ""}>
                        <td class="rank">${p.rank}</td>
                        <td class="name">${esc(p.name)}${p.country || p.online ? `<span class="country">${where(p)}</span>` : ""}</td>
                        <td class="score">${num(p.score)}</td>
                        <td class="hide-sm">${num(p.wins)}</td>
                        <td class="hide-md">${num(p.games)}</td>
                        <td class="hide-sm">${p.games > 0 ? Math.round(p.wins / p.games * 100) : 0}%</td>
                        <td class="hide-md">${num(p.tasks)}</td>
                    </tr>`).join("");

                none.textContent = `No player by that name in the top ${players.length}.`;
                search.disabled = false;
                box.setAttribute("aria-busy", "false");
                errorEl.hidden = true;
                firstLoad = false;
                filter();
                age();
            }

            async function load() {
                clearTimeout(timer);
                if (!box.isConnected) return stop();
                try {
                    const res = await fetch("/api/leaderboard", { cache: "no-cache" });
                    if (!res.ok) throw new Error(res.status);
                    render(await res.json());
                } catch {
                    if (firstLoad) {
                        podium.hidden = true;
                        rowsEl.closest("table").hidden = true;
                        errorEl.hidden = false;
                        foot.textContent = "";
                        box.setAttribute("aria-busy", "false");
                    }
                }
                if (box.isConnected && !document.hidden) timer = setTimeout(load, 60000);
            }

            function stop() {
                clearTimeout(timer);
                clearInterval(ticker);
                document.removeEventListener("visibilitychange", onVisible);
            }

            function onVisible() {
                if (!box.isConnected) return stop();
                if (document.hidden) clearTimeout(timer);
                else load();
            }

            root.querySelector("[data-lb-retry]").addEventListener("click", () => {
                podium.hidden = false;
                rowsEl.closest("table").hidden = false;
                errorEl.hidden = true;
                foot.textContent = "Loading the leaderboard…";
                load();
            });

            document.addEventListener("visibilitychange", onVisible);
            ticker = setInterval(() => { if (!box.isConnected) stop(); else if (fetchedAt) age(); }, 1000);
            load();
        },
    };

    const initPage = () => {
        pages[app.dataset.page]?.(app);
        updateNav();
        window.siteFx?.page(app);
    };

    function routable(a, e) {
        if (!a || (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey))) return null;
        if ((a.target && a.target !== "_self") || a.hasAttribute("download") || "reload" in a.dataset) return null;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return null;
        if (/^\/(play|assets|new|app)\//.test(url.pathname) || /\.[a-z0-9]+$/i.test(url.pathname)) return null;
        if (url.pathname === location.pathname && url.search === location.search && url.hash) return null;
        return url;
    }

    const cache = new Map();
    const CACHE_MS = 30000;

    function load(href) {
        const key = href.split("#")[0];
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
        const promise = fetch(key, { credentials: "same-origin" }).then(async res => {
            if (!(res.headers.get("content-type") || "").includes("text/html")) throw new Error("not a page");
            return { url: res.url, html: await res.text() };
        });
        promise.catch(() => cache.delete(key));
        cache.set(key, { at: Date.now(), promise });
        return promise;
    }

    function prefetch(e) {
        const url = routable(e.target.closest?.("a"));
        if (url) load(url.href).catch(() => {});
    }
    document.addEventListener("pointerenter", prefetch, { capture: true, passive: true });
    document.addEventListener("touchstart", prefetch, { capture: true, passive: true });
    document.addEventListener("focusin", prefetch);

    let navId = 0;
    let shownPath = location.pathname + location.search;

    async function navigate(url, { push = true, scrollY: restoreY = null } = {}) {
        const id = ++navId;
        const slow = setTimeout(() => progress?.classList.add("active"), 120);

        let page;
        try {
            page = await load(url.href);
        } catch {
            location.href = url.href;
            return;
        } finally {
            clearTimeout(slow);
        }
        if (id !== navId) return;

        const doc = new DOMParser().parseFromString(page.html, "text/html");
        const next = doc.getElementById("app");
        if (!next) { location.href = url.href; return; }

        const finalUrl = new URL(page.url);
        finalUrl.hash = url.hash;

        if (push) {
            history.replaceState({ ...history.state, scrollY }, "");
            history.pushState({ scrollY: 0 }, "", finalUrl.href);
        }

        const swap = () => {
            shownPath = finalUrl.pathname + finalUrl.search;
            app.innerHTML = next.innerHTML;
            app.dataset.page = next.dataset.page;
            document.title = doc.title;
            for (const sel of ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:url"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
                const mine = document.head.querySelector(sel), theirs = doc.head.querySelector(sel);
                if (mine && theirs) mine.replaceWith(theirs.cloneNode());
            }
            const pageLinks = [...doc.querySelectorAll(".nav-links a")];
            nav.querySelectorAll(".nav-links a").forEach((a, i) => {
                const pageLink = pageLinks[i];
                if (!pageLink) return;
                a.setAttribute("href", pageLink.getAttribute("href"));
                if (pageLink.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
                else a.removeAttribute("aria-current");
            });
            setMenu(false);
            initPage();

            const target = finalUrl.hash && document.getElementById(decodeURIComponent(finalUrl.hash.slice(1)));
            if (restoreY !== null) scrollTo({ top: restoreY, behavior: "instant" });
            else if (target) target.scrollIntoView({ behavior: "instant" });
            else scrollTo({ top: 0, behavior: "instant" });
        };

        if (document.startViewTransition && !reducedMotion) await document.startViewTransition(swap).updateCallbackDone;
        else swap();

        progress?.classList.remove("active");
        app.focus({ preventScroll: true });
    }

    document.addEventListener("click", e => {
        const a = e.target.closest("a");
        const url = routable(a, e);
        if (a && a.closest(".nav-links")) setMenu(false);
        if (!url) return;
        e.preventDefault();
        if (url.href === location.href) { scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }); return; }
        navigate(url);
    });

    history.scrollRestoration = "manual";
    history.replaceState({ ...history.state, scrollY }, "");
    addEventListener("pagehide", () => history.replaceState({ ...history.state, scrollY }, ""));
    addEventListener("popstate", e => {
        if (location.pathname + location.search === shownPath) return;
        navigate(new URL(location.href), { push: false, scrollY: e.state?.scrollY ?? 0 });
    });

    initPage();
})();
