const header = document.querySelector("#site-header");
const menuDrawer = document.querySelector("#mobile-nav-drawer");
const searchDrawer = document.querySelector("#mobile-search-drawer");
const cartDrawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("[data-modal-backdrop]");
const desktopSearchInput = document.querySelector("#desktop-search-input");
const mobileSearchInput = document.querySelector("#mobile-search-input");
const menuToggle = document.querySelector("[data-toggle-menu]");
const searchToggles = [...document.querySelectorAll("[data-toggle-search]")];
let menuOpen = false;
let searchOpen = false;
let cartOpen = false;
let activeDialog = null;
let lastFocused = null;

function isDesktop() {
  return window.matchMedia("(min-width: 1025px)").matches;
}

function syncBodyLock() {
  document.body.classList.toggle("is-locked", menuOpen || cartOpen || Boolean(activeDialog));
}

function setMenu(open) {
  menuOpen = Boolean(open) && !isDesktop();
  if (menuOpen) setSearch(false);
  menuDrawer.classList.toggle("is-open", menuOpen);
  menuDrawer.setAttribute("aria-hidden", String(!menuOpen));
  menuToggle.textContent = menuOpen ? "Close" : "Menu";
  menuToggle.setAttribute("aria-expanded", String(menuOpen));
  header.classList.toggle("is-menu-open", menuOpen);
  header.classList.toggle("has-surface", menuOpen || searchOpen);
  syncBodyLock();
}

function setSearch(open) {
  searchOpen = Boolean(open);
  if (searchOpen && menuOpen) setMenu(false);
  header.classList.toggle("is-searching", searchOpen);
  header.classList.toggle("has-surface", menuOpen || searchOpen);
  searchDrawer.classList.toggle("is-open", searchOpen && !isDesktop());
  searchDrawer.setAttribute("aria-hidden", String(!searchOpen || isDesktop()));
  searchToggles.forEach((button) => {
    button.textContent = searchOpen ? "Close" : "Search";
    button.setAttribute("aria-expanded", String(searchOpen));
  });

  if (searchOpen) {
    requestAnimationFrame(() => (isDesktop() ? desktopSearchInput : mobileSearchInput).focus());
  }
}

function setCart(open) {
  cartOpen = Boolean(open);
  if (cartOpen) {
    lastFocused = document.activeElement;
    setMenu(false);
    setSearch(false);
  }
  cartDrawer.classList.toggle("is-open", cartOpen);
  cartDrawer.setAttribute("aria-hidden", String(!cartOpen));
  syncBodyLock();
  if (cartOpen) {
    requestAnimationFrame(() => cartDrawer.querySelector("[data-close-cart]").focus());
  } else if (lastFocused instanceof HTMLElement) {
    lastFocused.focus();
  }
}

function openDialog(name) {
  closeDialog(false);
  lastFocused = document.activeElement;
  activeDialog = document.querySelector(`[data-dialog="${name}"]`);
  if (!activeDialog) return;
  setMenu(false);
  setSearch(false);
  backdrop.hidden = false;
  activeDialog.hidden = false;
  syncBodyLock();
  requestAnimationFrame(() => activeDialog.querySelector("button, input")?.focus());
}

function closeDialog(restoreFocus = true) {
  if (activeDialog) activeDialog.hidden = true;
  activeDialog = null;
  backdrop.hidden = true;
  syncBodyLock();
  if (restoreFocus && lastFocused instanceof HTMLElement) lastFocused.focus();
}

document.querySelectorAll("[data-asset-shell]").forEach((shell) => {
  const image = shell.querySelector("[data-asset]");
  const markLoaded = () => shell.classList.add("asset-loaded");
  const markMissing = () => shell.classList.remove("asset-loaded");
  image.addEventListener("load", markLoaded);
  image.addEventListener("error", markMissing);
  if (image.complete && image.naturalWidth > 0) markLoaded();
});

document.querySelectorAll("[data-demo-link]").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

menuToggle.addEventListener("click", () => setMenu(!menuOpen));
searchToggles.forEach((button) => button.addEventListener("click", () => setSearch(!searchOpen)));
document.querySelectorAll("[data-open-cart]").forEach((button) => button.addEventListener("click", () => setCart(true)));
document.querySelectorAll("[data-close-cart]").forEach((button) => button.addEventListener("click", () => setCart(false)));
document.querySelectorAll("[data-open-newsletter]").forEach((button) => button.addEventListener("click", () => openDialog("newsletter")));
document.querySelectorAll("[data-open-country]").forEach((button) => button.addEventListener("click", () => openDialog("country")));
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeDialog()));
backdrop.addEventListener("click", () => closeDialog());

document.querySelectorAll("[data-accordion] > button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.parentElement;
    const open = !item.classList.contains("is-open");
    item.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  });
});

document.querySelector("#hide-announcement").addEventListener("click", () => {
  document.querySelector("#announcement").classList.add("is-hidden");
});

document.querySelectorAll("[data-search-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector('input[type="search"]');
    const query = input?.value.trim() || "";
    window.location.assign(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  });
});

document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    form.reset();
    showToast("Thanks for subscribing");
    if (activeDialog) closeDialog();
  });
});

const toast = document.querySelector("[data-toast]");
let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

const slides = [...document.querySelectorAll("[data-slide]")];
let activeSlide = 0;
function showSlide(nextIndex) {
  activeSlide = (nextIndex + slides.length) % slides.length;
  slides.forEach((slide, index) => {
    const active = index === activeSlide;
    slide.classList.toggle("is-active", active);
    slide.classList.toggle("is-entering", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
}

let carouselTimer = slides.length > 1 ? setInterval(() => showSlide(activeSlide + 1), 5200) : null;
document.querySelector(".campaign")?.addEventListener("pointerdown", () => {
  if (carouselTimer) clearInterval(carouselTimer);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (activeDialog) closeDialog();
    else if (cartOpen) setCart(false);
    else if (menuOpen) setMenu(false);
    else if (searchOpen) setSearch(false);
  }
  if (!menuOpen && !searchOpen && !cartOpen && !activeDialog && event.key === "ArrowRight") showSlide(activeSlide + 1);
  if (!menuOpen && !searchOpen && !cartOpen && !activeDialog && event.key === "ArrowLeft") showSlide(activeSlide - 1);
});

window.addEventListener("resize", () => {
  if (isDesktop() && menuOpen) setMenu(false);
  header.classList.toggle("has-surface", menuOpen || searchOpen);
});
