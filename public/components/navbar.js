(() => {
  const mountPoints = document.querySelectorAll("[data-navbar]");
  if (!mountPoints.length) return;

  const navbarUrl = new URL("./components/navbar.html", window.location.href);

  const setActive = (root) => {
    const path = (window.location.pathname || "").toLowerCase();
    const file = path.split("/").pop() || "index.html";

    const map = {
      "index.html": "home",
      "about.html": "about",
      "contacts.html": "contact",
      "bmi.html": "features",
      "calories.html": "features",
      "goal.html": "features",
      "basic_redirect.html": "features",
      "recipe.html": "features",
    };

    const key = map[file];
    if (!key) return;

    const el = root.querySelector(`[data-nav="${key}"]`);
    if (!el) return;
    el.setAttribute("aria-current", "page");
  };

  const inject = async () => {
    const res = await fetch(navbarUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Navbar load failed (${res.status})`);
    const html = await res.text();

    for (const mount of mountPoints) {
      mount.innerHTML = html;
      setActive(mount);
    }
  };

  inject().catch(() => {
    for (const mount of mountPoints) {
      mount.innerHTML = "";
    }
  });
})();

