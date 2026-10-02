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
      "dashboard.html": "account",
      "account.html": "account",
      "register.html": "account",
      "recipe.html": "features",
    };

    const key = map[file];
    if (!key) return;

    const el = root.querySelector(`[data-nav="${key}"]`);
    if (!el) return;
    el.setAttribute("aria-current", "page");
  };

  const updateAccountMenu = async (root) => {
    try {
      const response = await fetch('/.netlify/functions/auth-session', { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.toLowerCase().includes('application/json')) return;
      const state = await response.json();
      if (!state.account) return;
      root.querySelectorAll('[data-account-item="signed-out"]').forEach((item) => { item.hidden = true; });
      root.querySelectorAll('[data-account-item="signed-in"]').forEach((item) => { item.hidden = false; });
      root.querySelector('[data-sign-out]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const signOut = await fetch('/.netlify/functions/auth-logout', { method: 'POST', cache: 'no-store' });
          if (signOut.ok) window.location.assign('./account.html');
          else button.disabled = false;
        } catch {
          button.disabled = false;
        }
      });
    } catch {
      // Keep the sign-in links available when account services are offline.
    }
  };

  const inject = async () => {
    const res = await fetch(navbarUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Navbar load failed (${res.status})`);
    const html = await res.text();

    for (const mount of mountPoints) {
      mount.innerHTML = html;
      setActive(mount);
      updateAccountMenu(mount);
    }
  };

  inject().catch(() => {
    for (const mount of mountPoints) {
      mount.innerHTML = "";
    }
  });
})();

