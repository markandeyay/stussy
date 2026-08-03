(() => {
  const main = document.querySelector("#main-content");
  const footer = document.querySelector(".mobile-footer");
  const pathname = window.location.pathname.replace(/\/$/, "") || "/";
  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/);
  const productMatch = pathname.match(/^(?:\/collections\/[^/]+)?\/products\/([^/]+)$/);
  const newsDetailMatch = pathname.match(/^\/blogs\/news\/([^/]+)$/);
  const chapterDetailMatch = pathname.match(/^\/blogs\/chapters\/([^/]+)$/);

  const routeName = collectionMatch
    ? "collection"
    : productMatch
      ? "product"
      : pathname === "/blogs/news" || newsDetailMatch
        ? "archive"
        : pathname === "/blogs/chapters" || chapterDetailMatch
          ? "chapters"
          : pathname === "/account"
            ? "account"
            : pathname === "/search"
              ? "search"
              : pathname.startsWith("/pages/")
                ? "info"
                : pathname === "/"
                  ? "home"
                  : "not-found";

  document.body.classList.add(`route-${routeName}`);

  if (pathname === "/") return;

  main.className = `route-main ${routeName}-main`;
  main.innerHTML = '<div class="route-loading">Loading</div>';

  const escapeHTML = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const clean = (value = "") => {
    if (typeof value !== "string" || !/[ÃÂâð]/.test(value)) return value;
    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  };

  const titleCase = (value = "") => clean(value).toLowerCase().replace(/(^|[\s/&+'-])([a-z])/g, (_, before, letter) => before + letter.toUpperCase());

  const price = (value = "0") => {
    const amount = Number(value);
    return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
  };

  const imageURL = (source, width = 1000) => {
    if (!source) return "";
    const separator = source.includes("?") ? "&" : "?";
    return `${source}${separator}width=${width}`;
  };

  const localize = (href = "") => {
    try {
      return new URL(href, window.location.origin).pathname;
    } catch {
      return href || "#";
    }
  };

  const media = (source, alt, width, loading = "lazy") => `<img class="remote-media" src="${escapeHTML(imageURL(source, width))}" alt="${escapeHTML(alt)}" loading="${loading}" onerror="this.classList.add('is-missing')" />`;

  const getJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    return response.json();
  };

  const setTitle = (title) => {
    document.title = title ? `${titleCase(title)} | Stüssy` : "Stüssy";
  };

  const routeError = (message = "Page not found") => {
    main.className = "route-main route-error";
    main.innerHTML = `<p>${escapeHTML(message)}</p><a href="/">Return home</a>`;
    setTitle("Page not found");
  };

  const option = (product, name) => product.options?.find((item) => item.name.toLowerCase() === name.toLowerCase());

  const productColor = (product) => {
    const color = option(product, "Color")?.values?.[0] || product.variants?.[0]?.option1 || "";
    return titleCase(color);
  };

  const productSizes = (product) => {
    const values = option(product, "Size")?.values;
    return Array.isArray(values) ? values : [];
  };

  const productCardHTML = (product, store, index = 0) => {
    const familyCount = Object.values(store.products).filter((item) => item.family && item.family === product.family).length;
    const sizes = productSizes(product);
    const first = product.images?.[0];
    const second = product.images?.[1];
    const href = `/products/${product.handle}`;
    return `<li class="product-card" data-product-card data-price="${Number(product.variants?.[0]?.price || 0)}" data-index="${index}" data-sizes="${escapeHTML(sizes.join(" "))}">
      <a class="product-card-media" href="${href}" aria-label="${escapeHTML(titleCase(product.title))}">
        ${media(first, titleCase(product.title), 700, index < 8 ? "eager" : "lazy")}
        ${second ? media(second, "", 700) : ""}
      </a>
      <div class="product-card-info">
        <a class="product-card-title" href="${href}">${escapeHTML(titleCase(product.title))}</a>
        <span class="product-card-price">${price(product.variants?.[0]?.price)}</span>
        ${familyCount > 1 ? `<span class="product-card-colors">${familyCount} Colors</span>` : ""}
      </div>
      ${sizes.length ? `<div class="product-card-sizes">${sizes.map((size) => `<span>${escapeHTML(size)}</span>`).join("")}</div>` : ""}
    </li>`;
  };

  const setupCollectionControls = (products, store) => {
    const toggle = document.querySelector("[data-toggle-filter]");
    const drawer = document.querySelector("#mobile-filter-drawer");
    const sortButtons = [...drawer.querySelectorAll(".filter-group:first-child button")];
    const sizeButtons = [...drawer.querySelectorAll(".filter-group:last-child button")];
    let selectedSize = "";
    let sortMode = "Featured";

    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const open = !drawer.classList.contains("is-open");
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      toggle.textContent = open ? "Close" : "Filter";
      document.querySelector("#site-header").classList.toggle("has-surface", open);
    });

    const refresh = () => {
      let visible = products.filter((product) => !selectedSize || productSizes(product).includes(selectedSize));
      if (sortMode === "Newest") visible = [...visible].reverse();
      if (sortMode === "Price: Low to High") visible = [...visible].sort((a, b) => Number(a.variants?.[0]?.price) - Number(b.variants?.[0]?.price));
      if (sortMode === "Price: High to Low") visible = [...visible].sort((a, b) => Number(b.variants?.[0]?.price) - Number(a.variants?.[0]?.price));
      document.querySelector(".collection-grid").innerHTML = visible.map((product, index) => productCardHTML(product, store, index)).join("");
    };

    sortButtons.forEach((button) => button.addEventListener("click", () => {
      sortMode = button.textContent.trim();
      sortButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      refresh();
    }));

    sizeButtons.forEach((button) => button.addEventListener("click", () => {
      selectedSize = selectedSize === button.textContent.trim() ? "" : button.textContent.trim();
      sizeButtons.forEach((item) => item.classList.toggle("is-active", item.textContent.trim() === selectedSize));
      refresh();
    }));
  };

  const renderCollection = async (handle) => {
    const store = await getJSON("/data/storefront.json");
    const collection = store.collections[handle];
    if (!collection) return routeError("Collection not found");
    const products = collection.products.map((productHandle) => store.products[productHandle]).filter(Boolean);
    setTitle(collection.title);
    main.innerHTML = `<h1 class="sr-only">${escapeHTML(titleCase(collection.title))}</h1><ul class="collection-grid">${products.map((product, index) => productCardHTML(product, store, index)).join("")}</ul>`;
    setupCollectionControls(products, store);
  };

  const renderProduct = async (handle) => {
    const store = await getJSON("/data/storefront.json");
    const product = store.products[handle];
    if (!product) return routeError("Product not found");
    const sizes = productSizes(product);
    const firstAvailable = product.variants?.find((variant) => variant.available) || product.variants?.[0];
    const familyProducts = Object.values(store.products).filter((item) => item.family && item.family === product.family);
    const color = productColor(product);
    setTitle(product.title);
    main.innerHTML = `<div class="product-layout">
      <div class="product-media-rail" aria-label="Product images">
        ${(product.images || []).map((source, index) => `<button type="button" class="product-media-item" data-zoom-image="${escapeHTML(source)}" aria-label="Enlarge image ${index + 1}">${media(source, `${titleCase(product.title)} ${index + 1}`, 1500, index < 2 ? "eager" : "lazy")}</button>`).join("")}
      </div>
      <section class="product-info">
        <div class="product-info-inner">
          <div class="product-heading"><h1>${escapeHTML(titleCase(product.title))}</h1><p>${price(firstAvailable?.price)}</p></div>
          <p class="product-color">${escapeHTML(color)}</p>
          ${sizes.length ? `<div class="product-selector"><span class="sr-only">Select Size</span><div class="selector-options">${sizes.map((size) => {
            const variant = product.variants.find((item) => item.option2 === size);
            return `<button type="button" data-size="${escapeHTML(size)}" ${variant?.available ? "" : "disabled"}>${escapeHTML(size)}</button>`;
          }).join("")}</div></div>` : ""}
          <div class="color-swatches" aria-label="Select Color">${familyProducts.map((item) => `<a class="color-swatch${item.handle === product.handle ? " is-selected" : ""}" href="/products/${escapeHTML(item.handle)}" aria-label="${escapeHTML(productColor(item))}">${media(item.images?.at(-2) || item.images?.[0], productColor(item), 180, "eager")}</a>`).join("")}</div>
          <button type="button" class="add-to-bag" data-add-to-bag>Add to Bag</button>
          <div class="detail-list">
            <div class="detail-item"><button type="button" aria-expanded="false">Product Details</button><div class="detail-panel">${clean(product.description || "")}</div></div>
            <div class="detail-item"><button type="button" aria-expanded="false">Size Guide</button><div class="detail-panel"><p>Measurements are in inches and are intended as a general guide. Fit may vary by style.</p><p><a href="/pages/size-guide"><u>View full size guide</u></a></p></div></div>
            <div class="detail-item"><button type="button" aria-expanded="false">Shipping &amp; Returns</button><div class="detail-panel"><p>Orders are processed during regular business hours. Unworn items may be returned within the stated return window.</p><p><a href="/pages/shipping-returns"><u>View shipping &amp; returns</u></a></p></div></div>
            <div class="product-chat"><button type="button">Chat</button></div>
          </div>
          <p class="product-notice">Free standard shipping in US for orders over $200 USD. Exclusions apply.</p>
        </div>
      </section>
    </div>
    <div class="product-zoom" data-product-zoom aria-hidden="true"><button type="button" data-close-zoom>Close</button><img alt="${escapeHTML(titleCase(product.title))}" /></div>`;

    let selectedSize = firstAvailable?.option2 || sizes[0] || "One Size";
    const sizeButtons = [...main.querySelectorAll("[data-size]")];
    const selectSize = (button) => {
      selectedSize = button.dataset.size;
      sizeButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    };
    const preferred = sizeButtons.find((button) => button.dataset.size === selectedSize && !button.disabled) || sizeButtons.find((button) => !button.disabled);
    if (preferred) selectSize(preferred);
    sizeButtons.forEach((button) => button.addEventListener("click", () => selectSize(button)));

    main.querySelectorAll(".detail-item > button").forEach((button) => button.addEventListener("click", () => {
      const item = button.parentElement;
      item.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(item.classList.contains("is-open")));
    }));
    main.querySelector(".product-chat button")?.addEventListener("click", () => window.alert("Chat is disabled in this interface study."));

    main.querySelector("[data-add-to-bag]").addEventListener("click", () => {
      const cart = document.querySelector("#cart-drawer");
      cart.querySelector(".cart-content").innerHTML = `<div class="cart-line-item">${media(product.images?.[0], titleCase(product.title), 300, "eager")}<div class="cart-line-copy"><p>${escapeHTML(titleCase(product.title))}</p><p>${escapeHTML(color)} / ${escapeHTML(selectedSize)}</p><p>Qty: 1</p><p>${price(firstAvailable?.price)}</p></div></div>`;
      cart.querySelector("footer").innerHTML = `<div class="cart-total"><span>Total</span><span>${price(firstAvailable?.price)}</span></div><button type="button" data-cart-checkout>Checkout</button>`;
      cart.querySelector("[data-cart-checkout]").addEventListener("click", () => window.alert("Checkout is disabled in this interface study."));
      const openButton = window.matchMedia("(min-width: 1025px)").matches ? document.querySelector(".desktop-actions [data-open-cart]") : document.querySelector(".mobile-actions [data-open-cart]");
      openButton?.click();
    });

    const zoom = main.querySelector("[data-product-zoom]");
    const closeZoom = () => {
      zoom.classList.remove("is-open");
      zoom.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
    };
    main.querySelectorAll("[data-zoom-image]").forEach((button) => button.addEventListener("click", () => {
      zoom.querySelector("img").src = imageURL(button.dataset.zoomImage, 2000);
      zoom.classList.add("is-open");
      zoom.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
    }));
    zoom.querySelector("[data-close-zoom]").addEventListener("click", closeZoom);
  };

  const archiveEntryHTML = (entry, compact = false) => {
    const lines = clean(entry.content || "").split("\n").filter(Boolean);
    const dateLine = lines.find((line) => /^20\d\d-/.test(line)) || clean(entry.date || "");
    const copy = lines.filter((line) => line !== dateLine).join("\n");
    return `<article class="archive-entry">
      ${dateLine ? `<p class="archive-date">${escapeHTML(dateLine)}</p>` : ""}
      ${copy ? `<p class="archive-copy">${escapeHTML(copy)}</p>` : ""}
      ${entry.images?.length ? `<div class="archive-gallery">${entry.images.map((source, index) => `<figure>${media(source, `${copy || "Archive"} ${index + 1}`, 1200, index < 2 ? "eager" : "lazy")}</figure>`).join("")}</div>` : ""}
      ${entry.handle && !compact ? `<a class="archive-link" href="/blogs/news/${escapeHTML(entry.handle)}">View Article</a>` : ""}
    </article>`;
  };

  const renderArchive = async (handle = "") => {
    const data = await getJSON("/data/news.json");
    const entries = data.articles || [];
    const selected = handle ? entries.filter((entry) => entry.handle === handle) : entries;
    if (handle && !selected.length) return routeError("Article not found");
    setTitle(handle ? selected[0].content.split("\n")[0] : "Archive");
    main.innerHTML = `<h1 class="sr-only">Archive</h1><div class="archive-feed">${selected.map((entry) => archiveEntryHTML(entry, Boolean(handle))).join("")}</div>`;
  };

  const featureHTML = (chapter) => `<article class="chapter-feature">
    <a href="/blogs/chapters/${escapeHTML(chapter.handle)}">${media(chapter.image, titleCase(chapter.title), 1440, "lazy")}</a>
    <div class="chapter-meta"><a href="/blogs/chapters/${escapeHTML(chapter.handle)}">${escapeHTML(titleCase(chapter.title))}</a><address>${escapeHTML(clean(chapter.address))}</address></div>
  </article>`;

  const renderChapters = async (handle = "") => {
    const data = await getJSON("/data/chapters.json");
    if (handle) {
      const chapter = data.featured.find((item) => item.handle === handle);
      if (!chapter) return routeError("Chapter not found");
      setTitle(chapter.title);
      main.innerHTML = `<div class="chapters-content">${featureHTML(chapter)}</div>`;
      return;
    }
    setTitle("Chapters");
    main.innerHTML = `<div class="chapters-content"><h1 class="chapter-directory-heading">Chapter Directory</h1>
      ${data.featured.map(featureHTML).join("")}
      <h2 class="chapter-index-heading">Chapter Store Index</h2>
      <div class="chapter-index">${data.index.map((chapter) => `<article><a href="${escapeHTML(localize(chapter.href))}">${escapeHTML(titleCase(chapter.title))}</a><address>${escapeHTML(clean(chapter.address))}</address></article>`).join("")}</div>
    </div>`;
  };

  const accordionHTML = (items) => `<div class="support-faq detail-list">${items.map(([question, answer]) => `<div class="detail-item"><button type="button" aria-expanded="false">${escapeHTML(question)}</button><div class="detail-panel"><p>${escapeHTML(answer)}</p></div></div>`).join("")}</div>`;

  const setupInfoAccordions = () => main.querySelectorAll(".detail-item > button").forEach((button) => button.addEventListener("click", () => {
    const item = button.parentElement;
    item.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(item.classList.contains("is-open")));
  }));

  const pageContent = {
    "shipping-returns": ["Shipping & Returns", "Orders are processed Monday through Friday, excluding holidays. You will receive tracking information once your order has shipped.", "Items must be returned unworn, unwashed, and with original tags attached. Final sale items are not eligible for return."],
    "size-guide": ["Size Guide", "Use the product measurements and fit notes as a general guide. Measurements can vary slightly between styles.", "For additional sizing help, contact our customer support team before placing your order."],
    "eyegear-warranty": ["Eyegear Warranty", "Stüssy eyegear is warranted against manufacturing defects under normal use. Damage caused by misuse, accidents, or normal wear is not covered.", "Contact customer support with your order number and clear photographs of the issue."],
    "accessibility": ["Accessibility", "Stüssy is committed to providing a website that is accessible to the widest possible audience.", "If you experience difficulty using this site, please contact customer support and describe the page and issue."],
    "legal": ["Legal", "All site content is provided for personal and informational use. Product availability, descriptions, and pricing may change without notice.", "Stüssy names, marks, artwork, and imagery remain the property of their respective owners. This local build is an interface research study."],
  };

  const configureInfoRail = () => {
    const rail = document.querySelector(".rail-top");
    if (!rail) return;
    const originalNewsletter = rail.querySelector("[data-open-newsletter]");
    const originalCountry = rail.querySelector("[data-open-country]");
    rail.innerHTML = `<a href="/collections/new-arrivals">New Arrivals</a><a href="/blogs/news">Archive</a><a href="/blogs/chapters">Chapters</a><a href="/pages/customer-support">Support</a><a href="#" data-chat-link>Chat</a><a href="/pages/shipping-returns">Shipping &amp; Returns</a><a href="/pages/size-guide">Size Guide</a><a href="/pages/eyegear-warranty">Warranty</a><a href="/pages/accessibility">Accessibility</a><span class="nav-dash" aria-hidden="true"></span><a href="/account">Account</a><button type="button" data-open-newsletter-alt>Newsletter</button><span class="info-rail-spacer" aria-hidden="true"></span><a href="/pages/legal">Legal</a><button type="button" data-open-country-alt>US / $</button>`;
    rail.querySelector(`[href="${pathname}"]`)?.classList.add("is-current");
    rail.querySelector("[data-chat-link]")?.addEventListener("click", (event) => { event.preventDefault(); window.alert("Chat is disabled in this interface study."); });
    rail.querySelector("[data-open-newsletter-alt]")?.addEventListener("click", () => originalNewsletter?.click());
    rail.querySelector("[data-open-country-alt]")?.addEventListener("click", () => originalCountry?.click());
  };

  const renderInfo = (handle) => {
    configureInfoRail();
    if (handle === "customer-support") {
      const faqs = [
        "Can I make modifications to my order after it's been placed?",
        "I used the incorrect address. How can I update it?",
        "How can I cancel my order?",
        "How do I start a return?",
        "How do I know my order is confirmed?",
        "When will I receive my order?",
        "Do you ship internationally?",
        "My tracking information states that my order was delivered. But I have not received it. What does this mean?",
        "Why was my order canceled?",
        "What payment methods do you take?",
        "How do I know if an item will fit?",
        "How do I find out when new styles are released?",
        "When can I expect a response from customer support?",
        "My package is being returned to sender. What are the next steps?",
        "I placed multiple orders, can I combine them?",
        "I received a damaged product, what should I do?",
        "Can I return my online order in store?",
        "I received a tracking number, but the shipment hasn't moved.",
        "Can I return collaboration items?",
        "If an item is sold out, when will it be available again?",
        "My order is a gift, do you include the price in the package?",
        "Do you offer gift receipts or gift cards?",
        "I received an item from stussy.com as a gift. Can I return it or exchange it?",
        "Can I get some free stickers?",
      ];
      setTitle("Customer Support");
      main.innerHTML = `<div class="info-content support-page"><h1><u>Contact Us</u></h1><div class="support-intro">
        <section><h2>Chat</h2><button type="button" data-support-chat>Start a Live Chat</button></section>
        <section><h2>Contact</h2><a href="mailto:support@stussy.com">support@stussy.com</a></section>
        <section><h2>Customer Support Hours</h2><p>Monday – Friday 8:00AM - 4:00PM PST</p><p><em>Excluding the weekend and major holidays.</em></p></section>
        <nav class="support-social" aria-label="Social media"><a href="#">Instagram</a><a href="#">Vimeo</a><a href="#">Wechat</a><a href="#">Weibo</a></nav>
      </div><h2 class="support-faq-heading"><u>Frequently Asked Questions</u></h2><div class="support-faq-live">${faqs.map((question) => `<div class="detail-item"><button type="button" aria-expanded="false">${escapeHTML(question)}</button><div class="detail-panel"><p>For assistance with this question, contact support@stussy.com and include your order number when applicable.</p></div></div>`).join("")}</div></div>`;
      setupInfoAccordions();
      main.querySelector("[data-support-chat]")?.addEventListener("click", () => window.alert("Chat is disabled in this interface study."));
      return;
    }
    const content = pageContent[handle] || [titleCase(handle.replaceAll("-", " ")), "This information page is included in the storefront interface study.", "Contact customer support if you need further information."];
    setTitle(content[0]);
    main.innerHTML = `<div class="info-content"><h1>${escapeHTML(content[0])}</h1><div class="info-copy"><p>${escapeHTML(content[1])}</p><p>${escapeHTML(content[2])}</p></div></div>`;
  };

  const renderAccount = () => {
    configureInfoRail();
    setTitle("Account");
    main.innerHTML = `<div class="account-content"><h1>Account Login</h1><form class="account-form"><label for="account-email">Email</label><input id="account-email" type="email" autocomplete="email" required /><label for="account-password">Password</label><input id="account-password" type="password" autocomplete="current-password" required /><button type="submit">Sign In</button></form></div>`;
    main.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      window.alert("Account sign-in is disabled in this interface study.");
    });
  };

  const renderSearch = async () => {
    const store = await getJSON("/data/storefront.json");
    setTitle("Search");
    main.innerHTML = `<div class="search-content"><h1>Search</h1><form class="search-route-form"><label class="sr-only" for="route-search">Search</label><input id="route-search" type="search" placeholder="Search here" autofocus /><button type="submit">Search</button></form><div class="search-results"></div></div>`;
    const form = main.querySelector("form");
    const search = () => {
      const query = form.querySelector("input").value.trim().toLowerCase();
      const products = Object.values(store.products).filter((product) => product.title.toLowerCase().includes(query)).slice(0, 24);
      const results = main.querySelector(".search-results");
      results.innerHTML = query ? `<ul class="collection-grid">${products.map((product, index) => productCardHTML(product, store, index)).join("")}</ul>` : "";
      if (query && !products.length) results.innerHTML = "<p>No results found</p>";
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      search();
    });
    const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
    if (initialQuery) {
      form.querySelector("input").value = initialQuery;
      search();
    }
  };

  const run = async () => {
    if (collectionMatch) return renderCollection(collectionMatch[1]);
    if (productMatch) return renderProduct(productMatch[1]);
    if (pathname === "/blogs/news") return renderArchive();
    if (newsDetailMatch) return renderArchive(newsDetailMatch[1]);
    if (pathname === "/blogs/chapters") return renderChapters();
    if (chapterDetailMatch) return renderChapters(chapterDetailMatch[1]);
    if (pathname === "/account") return renderAccount();
    if (pathname === "/search") return renderSearch();
    if (pathname.startsWith("/pages/")) return renderInfo(pathname.split("/").pop());
    routeError();
  };

  run().catch((error) => {
    console.error(error);
    routeError("This page could not be loaded");
  });

  footer?.querySelector("input")?.setAttribute("autocomplete", "email");
})();
