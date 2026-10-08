(function () {
    const app = document.getElementById("app");
    if (!app) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COLORS = [
        ["Skobeloff", "#007977", "#005d5b"],
        ["Glaucous", "#6181b6", "#4c638b"],
        ["Teal", "#1aac9d", "#117a74"],
        ["Highlighter", "#c9ff30", "#6cae4d"],
        ["Peach", "#fe978c", "#d4787e"],
        ["Mountbatten", "#997b8c", "#7d6473"],
        ["Celadon", "#abe0ae", "#86ae8a"],
        ["Frost", "#abc1b5", "#96a59b"],
        ["Periwinkle", "#b6b5ff", "#8a8ffd"],
        ["Crystal", "#edd2ff", "#cc7cfe"],
        ["Seafoam", "#aff4b6", "#7efe8c"],
        ["Banana", "#fefdd6", "#fbfe8b"],
        ["Falu", "#b9392e", "#8f3127"],
        ["Gamboge", "#e49b0f", "#ae7a15"],
        ["Maroon", "#7c3232", "#4d201f"],
        ["Coconut", "#86441a", "#653415"],
        ["Mango", "#ff8242", "#d86d36"],
        ["Tangerine", "#ff6c20", "#cf5a1b"],
        ["Raspberry", "#b9124d", "#90123f"],
        ["Phlox", "#e001fe", "#b501cd"],
        ["Fire", "#ff5922", "#c9021a"],
    ];
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const rand = (a, b) => a + Math.random() * (b - a);

    function crewmate([, body, shade]) {
        return `<svg viewBox="0 0 169 218" aria-hidden="true" style="--crew-body:${body};--crew-shade:${shade}"><use href="#crew"/></svg>`;
    }

    function startSpace() {
        if (calm) return;
        const space = document.createElement("div");
        space.className = "space";
        space.setAttribute("aria-hidden", "true");
        document.body.prepend(space);

        const count = innerWidth < 700 ? 3 : 6;
        for (let i = 0; i < count; i++) {
            const el = document.createElement("div");
            el.className = "floater";
            space.appendChild(el);
            launch(el, true);
            el.addEventListener("animationend", () => launch(el, false));
        }
    }

    function launch(el, first) {
        const leftToRight = Math.random() < .5;
        const size = rand(34, innerWidth < 700 ? 60 : 92);
        const duration = rand(30, 60);
        const y0 = rand(5, 90);
        el.innerHTML = crewmate(pick(COLORS));
        el.style.cssText = `
            --size:${size}px; --x0:${leftToRight ? -20 : 120}vw; --x1:${leftToRight ? 120 : -20}vw;
            --y0:${y0}vh; --y1:${Math.min(95, Math.max(0, y0 + rand(-25, 25)))}vh;
            --spin:${(Math.random() < .5 ? -1 : 1) * rand(180, 720)}deg; --o:${rand(.35, .7)};
            animation-duration:${duration}s; animation-delay:${first ? -rand(0, duration) : rand(0, 6)}s;`;
        el.classList.remove("go");
        void el.offsetWidth;
        el.classList.add("go");
    }

    const REVEAL = [
        ".page-head", ".section > .wrap", ".join .wrap", ".news-card", ".release-card",
        ".update", ".post", ".doc article section", ".stat", ".about-card", ".mode", ".lobby-settings", ".lineup", ".platform-card", ".first-step", ".start-help",
    ].join(",");
    let observer = null;

    function reveal(root) {
        if (calm || !("IntersectionObserver" in window)) return;
        observer?.disconnect();
        observer = new IntersectionObserver(entries => {
            let n = 0;
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const el = entry.target;
                el.style.setProperty("--d", Math.min(n++, 8) * 70 + "ms");
                el.classList.add("in");
                observer.unobserve(el);
                el.addEventListener("transitionend", () => { el.classList.remove("reveal", "in"); el.style.removeProperty("--d"); }, { once: true });
            }
        }, { rootMargin: "0px 0px -8% 0px", threshold: .05 });

        root.querySelectorAll(REVEAL).forEach(el => {
            el.classList.add("reveal");
            observer.observe(el);
        });
    }

    function popDigits(root) {
        if (calm) return;
        root.querySelectorAll(".countdown-unit b").forEach(b => {
            new MutationObserver(() => {
                b.classList.remove("pop");
                void b.offsetWidth;
                b.classList.add("pop");
            }).observe(b, { childList: true, characterData: true, subtree: true });
        });
    }

    let clicks = [];
    function eject() {
        if (document.querySelector(".eject")) return;
        const color = pick(COLORS);
        const screen = document.createElement("div");
        screen.className = "eject";
        screen.innerHTML = `<div class="eject-body">${crewmate(color)}</div><p class="eject-text"></p>`;
        document.body.appendChild(screen);

        const text = `${color[0]} was not The Impostor.`;
        const out = screen.querySelector(".eject-text");
        let i = 0;
        setTimeout(function type() {
            out.textContent = text.slice(0, ++i);
            if (i < text.length) setTimeout(type, 70);
        }, calm ? 0 : 900);

        const close = () => { screen.classList.add("bye"); setTimeout(() => screen.remove(), 400); };
        screen.addEventListener("click", close);
        setTimeout(close, 6000);
    }

    document.addEventListener("click", e => {
        if (!e.target.closest(".logo")) return;
        const t = Date.now();
        clicks = clicks.filter(c => t - c < 2000).concat(t);
        if (clicks.length >= 5) { clicks = []; eject(); }
    });

    window.siteFx = {
        page(root) {
            reveal(root);
            popDigits(root);
        },
    };

    startSpace();
    window.siteFx.page(app);
})();
