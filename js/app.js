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

    const pages = {
        home(root) {
            const box = root.querySelector("[data-countdown]");
            if (!box) return;
            const target = Number(box.dataset.countdown) * 1000;
            const unit = name => box.querySelector(`[data-unit="${name}"]`);
            const pad = n => String(n).padStart(2, "0");
            const tick = () => {
                if (!box.isConnected) { clearInterval(countdownTimer); return; }
                const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
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
        },

        leaderboard(root) {
            const search = root.querySelector("#lb-search");
            if (!search) return;
            const rows = [...root.querySelectorAll("#lb-rows tr")];
            const podium = root.querySelector("#podium");
            const none = root.querySelector("#lb-none");
            search.addEventListener("input", () => {
                const q = search.value.trim().toLowerCase();
                let shown = 0;
                for (const r of rows) {
                    const hit = !q || r.dataset.name.toLowerCase().includes(q);
                    r.hidden = !hit;
                    if (hit) shown++;
                }
                podium.hidden = !!q;
                none.style.display = shown ? "none" : "block";
            });
        },
    };

    const initPage = () => {
        pages[app.dataset.page]?.(app);
        updateNav();
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
            const current = doc.querySelector('.nav-links [aria-current="page"]')?.getAttribute("href");
            nav.querySelectorAll(".nav-links a").forEach(a => {
                if (a.getAttribute("href") === current) a.setAttribute("aria-current", "page");
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
