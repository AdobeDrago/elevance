import { fetchPlaceholders, getMetadata } from "../../scripts/aem.js";

const defaultDesktop = window.matchMedia("(min-width: 900px)");
const northCarolinaDesktop = window.matchMedia("(min-width: 992px)");
const FONT_SIZE_KEY = "hbnc-font-size";
const FONT_SIZES = ["small", "default", "large"];
let searchIndexPromise;

function isDesktopView() {
	return document.body.classList.contains("north-carolina")
		? northCarolinaDesktop.matches
		: defaultDesktop.matches;
}

/**
 * Loads the configured nav fragment. DA/EDS serves the fragment at the site
 * root, while the local development server exposes the same content below
 * /content.
 * @returns {Element} a container holding the fetched nav sections
 */
async function loadNavFragment() {
	// Production (DA/EDS) serves the fragment at the metadata path (site root).
	// On localhost / aem up the same content is served under /content, so fall
	// back to /content + the metadata path before the legacy root default.
	const navMeta = getMetadata("nav") || "/nav";
	let resp = await fetch(`${navMeta}.plain.html`);
	if (!resp.ok) resp = await fetch(`/content${navMeta}.plain.html`);
	if (!resp.ok) resp = await fetch("/content/nav.plain.html");
	const container = document.createElement("div");
	if (resp.ok) container.innerHTML = await resp.text();
	// Reproduce EDS decoration: wrap each top-level section's content in a
	// .default-content-wrapper so the header CSS/JS selectors resolve the same
	// way whether loaded here or via the standard fragment pipeline.
	[...container.children].forEach((section) => {
		if (!section.querySelector(":scope > .default-content-wrapper")) {
			const wrapper = document.createElement("div");
			wrapper.className = "default-content-wrapper";
			while (section.firstChild) wrapper.append(section.firstChild);
			section.append(wrapper);
		}
	});
	return container;
}

function getTopLevelNavItems(navSections) {
	return navSections
		? navSections.querySelectorAll(":scope .default-content-wrapper > ul > li")
		: [];
}

function setNavSectionExpanded(section, expanded) {
	section.setAttribute("aria-expanded", expanded ? "true" : "false");
	section.classList.toggle("is-open", expanded);
	const toggle = section.querySelector(":scope > .nav-section-toggle");
	if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function closeAllNavSections(navSections, except = null) {
	getTopLevelNavItems(navSections).forEach((section) => {
		if (section !== except) setNavSectionExpanded(section, false);
	});
}

function closeSearch(nav, returnFocus = false) {
	const searchButton = nav.querySelector(".nav-search-button");
	const searchForm = nav.querySelector(".nav-search");
	if (!searchButton || !searchForm) return;

	const wasOpen = searchButton.getAttribute("aria-expanded") === "true";
	searchButton.setAttribute("aria-expanded", "false");
	searchButton.setAttribute("aria-label", "Open site search");
	searchForm.hidden = true;
	searchForm.setAttribute("aria-hidden", "true");
	const searchResults = searchForm.querySelector(".nav-search-results");
	searchResults.replaceChildren();
	searchResults.hidden = true;
	if (returnFocus && wasOpen) searchButton.focus();
}

function setMenuExpanded(nav, navSections, expanded) {
	nav.setAttribute("aria-expanded", expanded ? "true" : "false");
	closeAllNavSections(navSections);

	const hamburgerButton = nav.querySelector(".nav-hamburger button");
	if (hamburgerButton) {
		hamburgerButton.setAttribute("aria-expanded", expanded ? "true" : "false");
		hamburgerButton.setAttribute(
			"aria-label",
			expanded ? "Close navigation" : "Open navigation",
		);
	}

	if (!isDesktopView()) {
		const searchForm = nav.querySelector(".nav-search");
		if (searchForm) {
			searchForm.hidden = !expanded;
			searchForm.setAttribute("aria-hidden", expanded ? "false" : "true");
		}
	}
}

function toggleNavSection(navSections, section) {
	const expanded = section.getAttribute("aria-expanded") === "true";
	closeSearch(navSections.closest("nav"));
	closeAllNavSections(navSections, section);
	setNavSectionExpanded(section, !expanded);
}

function handleEscape(e) {
	if (e.code !== "Escape") return;
	const nav = document.getElementById("nav");
	if (!nav) return;

	const searchButton = nav.querySelector(
		'.nav-search-button[aria-expanded="true"]',
	);
	if (searchButton && isDesktopView()) {
		closeSearch(nav, true);
		return;
	}

	const openToggle = nav.querySelector(
		'.nav-section-toggle[aria-expanded="true"]',
	);
	const openSection = nav.querySelector('.nav-drop[aria-expanded="true"]');
	if (openToggle || openSection) {
		closeAllNavSections(nav.querySelector(".nav-sections"));
		(openToggle || openSection).focus();
		return;
	}

	if (!isDesktopView() && nav.getAttribute("aria-expanded") === "true") {
		setMenuExpanded(nav, nav.querySelector(".nav-sections"), false);
		nav.querySelector(".nav-hamburger button")?.focus();
	}
}

function handleFocusLost(e) {
	if (!isDesktopView() || e.currentTarget.contains(e.relatedTarget)) return;
	closeAllNavSections(e.currentTarget.querySelector(".nav-sections"));
	closeSearch(e.currentTarget);
}

function decorateDefaultNavSections(navSections) {
	getTopLevelNavItems(navSections).forEach((section) => {
		if (!section.querySelector(":scope > ul")) return;
		section.classList.add("nav-drop");
		section.setAttribute("tabindex", "0");
		section.setAttribute("aria-expanded", "false");
		section.addEventListener("click", () => {
			if (isDesktopView()) toggleNavSection(navSections, section);
		});
		section.addEventListener("keydown", (e) => {
			if (e.code === "Enter" || e.code === "Space") {
				e.preventDefault();
				toggleNavSection(navSections, section);
			}
		});
	});
}

function decorateNorthCarolinaNavSections(navSections) {
	getTopLevelNavItems(navSections).forEach((section, index) => {
		const submenu = section.querySelector(":scope > ul");
		if (!submenu) return;

		const label = section.querySelector(":scope > p");
		const toggle = document.createElement("button");
		const submenuId = `nav-submenu-${index + 1}`;
		toggle.type = "button";
		toggle.className = "nav-section-toggle";
		toggle.textContent = label?.textContent.trim() || "";
		toggle.setAttribute("aria-expanded", "false");
		toggle.setAttribute("aria-controls", submenuId);
		submenu.id = submenuId;

		if (label) label.replaceWith(toggle);
		else section.prepend(toggle);

		section.classList.add("nav-drop");
		setNavSectionExpanded(section, false);
		toggle.addEventListener("click", () =>
			toggleNavSection(navSections, section),
		);
		section.addEventListener("mouseenter", () => {
			if (!isDesktopView()) return;
			closeSearch(navSections.closest("nav"));
			closeAllNavSections(navSections, section);
			setNavSectionExpanded(section, true);
		});
		section.addEventListener("mouseleave", () => {
			if (isDesktopView()) setNavSectionExpanded(section, false);
		});
	});
}

function readFontSizePreference() {
	try {
		const storedSize = window.localStorage.getItem(FONT_SIZE_KEY);
		return FONT_SIZES.includes(storedSize) ? storedSize : "default";
	} catch (e) {
		return "default";
	}
}

function applyFontSize(size, controls, persist = true) {
	const selectedSize = FONT_SIZES.includes(size) ? size : "default";
	document.body.dataset.fontSize = selectedSize;
	controls.querySelectorAll("button").forEach((button) => {
		const selected = button.dataset.fontSize === selectedSize;
		button.setAttribute("aria-pressed", selected ? "true" : "false");
	});

	if (persist) {
		try {
			window.localStorage.setItem(FONT_SIZE_KEY, selectedSize);
		} catch (e) {
			// The control still works when storage is unavailable.
		}
	}
}

function createFontSizeControls() {
	const controls = document.createElement("div");
	controls.className = "nav-text-size";
	controls.setAttribute("role", "group");
	controls.setAttribute("aria-label", "Text size");

	const labels = {
		small: "Decrease text size",
		default: "Default text size",
		large: "Increase text size",
	};

	FONT_SIZES.forEach((size) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = `nav-text-size-${size}`;
		button.dataset.fontSize = size;
		button.setAttribute("aria-label", labels[size]);
		button.textContent = "A";
		button.addEventListener("click", () => applyFontSize(size, controls));
		controls.append(button);
	});

	applyFontSize(readFontSizePreference(), controls, false);
	return controls;
}

async function getSearchIndex(form) {
	if (!searchIndexPromise) {
		const navItems = Array.from(
			form.closest("nav").querySelectorAll(".nav-sections a[href]"),
		).map((link) => ({
			path: link.getAttribute("href"),
			title: link.textContent.trim(),
		}));
		searchIndexPromise = fetch("/query-index.json")
			.then((response) => (response.ok ? response.json() : { data: [] }))
			.then((json) => [...navItems, ...(json.data || [])])
			.catch(() => navItems)
			.then((items) => [
				...new Map(items.map((item) => [item.path, item])).values(),
			]);
	}
	return searchIndexPromise;
}

function clearSearchResults(form) {
	const results = form.querySelector(".nav-search-results");
	results.replaceChildren();
	results.hidden = true;
}

async function updateSearchResults(form) {
	const input = form.querySelector("input");
	const results = form.querySelector(".nav-search-results");
	const query = input.value.trim().toLowerCase();
	if (query.length < 3) {
		clearSearchResults(form);
		return;
	}

	form.dataset.query = query;
	const terms = query.split(/\s+/).filter(Boolean);
	const index = await getSearchIndex(form);
	if (form.dataset.query !== query) return;

	const matches = index
		.filter((item) => {
			const searchableText = [
				item.title,
				item.header,
				item.description,
				item.path,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return terms.every((term) => searchableText.includes(term));
		})
		.slice(0, 6);

	results.replaceChildren();
	if (!matches.length) {
		const noResults = document.createElement("li");
		noResults.className = "nav-search-no-results";
		noResults.textContent = "No results found.";
		results.append(noResults);
	} else {
		matches.forEach((item) => {
			const listItem = document.createElement("li");
			const link = document.createElement("a");
			link.href = item.path;
			link.textContent = item.title || item.header || item.path;
			listItem.append(link);
			results.append(listItem);
		});
	}
	results.hidden = false;
}

function createSearchForm() {
	const form = document.createElement("form");
	form.className = "nav-search";
	form.id = "nav-search-panel";
	form.setAttribute("role", "search");
	form.setAttribute("aria-label", "Site search");
	form.setAttribute("aria-hidden", "true");
	form.hidden = true;

	const icon = document.createElement("span");
	icon.className = "nav-search-icon";
	icon.setAttribute("aria-hidden", "true");

	const input = document.createElement("input");
	input.id = "nav-search-input";
	input.name = "q";
	input.type = "search";
	input.placeholder = "What are you searching for?";
	input.setAttribute("aria-label", "What are you searching for?");
	input.setAttribute("autocomplete", "off");
	input.addEventListener("input", () => updateSearchResults(form));
	input.addEventListener("keydown", (e) => {
		if (e.code === "Escape" && isDesktopView())
			closeSearch(form.closest("nav"), true);
	});

	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const firstResult = form.querySelector(".nav-search-results a");
		if (firstResult) window.location.assign(firstResult.href);
		else input.focus();
	});

	const results = document.createElement("ul");
	results.className = "nav-search-results";
	results.setAttribute("aria-live", "polite");
	results.hidden = true;
	form.append(icon, input, results);
	return form;
}

function decorateNorthCarolinaTools(nav, navTools, navSections) {
	const toolsWrapper = navTools.querySelector(".default-content-wrapper");
	if (!toolsWrapper) return;

	const searchButton = document.createElement("button");
	searchButton.type = "button";
	searchButton.className = "nav-search-button";
	searchButton.setAttribute("aria-label", "Open site search");
	searchButton.setAttribute("aria-controls", "nav-search-panel");
	searchButton.setAttribute("aria-expanded", "false");
	searchButton.innerHTML = '<span aria-hidden="true"></span>';

	const searchForm = createSearchForm();
	searchButton.addEventListener("click", () => {
		const expanded = searchButton.getAttribute("aria-expanded") === "true";
		closeAllNavSections(navSections);
		searchButton.setAttribute("aria-expanded", expanded ? "false" : "true");
		searchButton.setAttribute(
			"aria-label",
			expanded ? "Open site search" : "Close site search",
		);
		searchForm.hidden = expanded;
		searchForm.setAttribute("aria-hidden", expanded ? "true" : "false");
		if (!expanded) searchForm.querySelector("input").focus();
	});

	toolsWrapper.prepend(createFontSizeControls());
	toolsWrapper.append(searchButton);
	nav.append(searchForm);
}

function getDirectTextContent(menuItem) {
	const toggle = menuItem.querySelector(":scope > .nav-section-toggle");
	if (toggle) return toggle.textContent.trim();
	const menuLink = menuItem.querySelector(":scope > a, :scope > p > a");
	if (menuLink) return menuLink.textContent.trim();
	return Array.from(menuItem.childNodes)
		.filter((node) => node.nodeType === Node.TEXT_NODE)
		.map((node) => node.textContent)
		.join(" ")
		.trim();
}

async function buildBreadcrumbsFromNavTree(nav, currentUrl) {
	const crumbs = [];
	const homeLink = document.querySelector(".nav-brand a[href]");
	const homeUrl = homeLink?.href || "/";

	let menuItem = Array.from(nav?.querySelectorAll("a") || []).find(
		(a) => a.href === currentUrl,
	);
	if (menuItem) {
		do {
			const link = menuItem.querySelector(":scope > a, :scope > p > a");
			crumbs.unshift({
				title: getDirectTextContent(menuItem),
				url: link ? link.href : null,
			});
			menuItem = menuItem.closest("ul")?.closest("li");
		} while (menuItem);
	} else if (currentUrl !== homeUrl) {
		crumbs.unshift({ title: getMetadata("og:title"), url: currentUrl });
	}

	const placeholders = await fetchPlaceholders();
	crumbs.unshift({
		title: placeholders.breadcrumbsHomeLabel || "Home",
		url: homeUrl,
	});

	if (crumbs.length > 1) crumbs[crumbs.length - 1].url = null;
	crumbs[crumbs.length - 1]["aria-current"] = "page";
	return crumbs;
}

async function buildBreadcrumbs() {
	const breadcrumbs = document.createElement("nav");
	breadcrumbs.className = "breadcrumbs";
	breadcrumbs.setAttribute("aria-label", "Breadcrumb");

	const crumbs = await buildBreadcrumbsFromNavTree(
		document.querySelector(".nav-sections"),
		document.location.href,
	);
	const ol = document.createElement("ol");
	ol.append(
		...crumbs.map((item) => {
			const li = document.createElement("li");
			if (item["aria-current"])
				li.setAttribute("aria-current", item["aria-current"]);
			if (item.url) {
				const link = document.createElement("a");
				link.href = item.url;
				link.textContent = item.title;
				li.append(link);
			} else {
				li.textContent = item.title;
			}
			return li;
		}),
	);
	breadcrumbs.append(ol);
	return breadcrumbs;
}

/**
 * Loads and decorates the header navigation.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
	const fragment = await loadNavFragment();
	const isNorthCarolina = document.body.classList.contains("north-carolina");

	block.textContent = "";
	const nav = document.createElement("nav");
	nav.id = "nav";
	nav.setAttribute("aria-label", "Main navigation");
	while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

	["brand", "sections", "tools"].forEach((name, index) => {
		if (nav.children[index]) nav.children[index].classList.add(`nav-${name}`);
	});

	const navBrand = nav.querySelector(".nav-brand");
	const brandLink = navBrand?.querySelector(".button");
	if (brandLink) {
		brandLink.className = "";
		brandLink.closest(".button-container")?.removeAttribute("class");
	}

	const navSections = nav.querySelector(".nav-sections");
	if (isNorthCarolina) decorateNorthCarolinaNavSections(navSections);
	else decorateDefaultNavSections(navSections);

	const navTools = nav.querySelector(".nav-tools");
	if (isNorthCarolina && navTools) {
		decorateNorthCarolinaTools(nav, navTools, navSections);
	} else if (navTools) {
		const search = navTools.querySelector('a[href*="search"]');
		if (search && !search.textContent.trim())
			search.setAttribute("aria-label", "Search");
	}

	// hamburger for mobile
	const hamburger = document.createElement("div");
	hamburger.className = "nav-hamburger";
	hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-expanded="false"
      aria-label="Open navigation"><span class="nav-hamburger-icon"></span></button>`;
	hamburger.querySelector("button").addEventListener("click", () => {
		const expanded = nav.getAttribute("aria-expanded") === "true";
		setMenuExpanded(nav, navSections, !expanded);
	});
	nav.prepend(hamburger);
	setMenuExpanded(nav, navSections, false);

	const desktopQuery = isNorthCarolina ? northCarolinaDesktop : defaultDesktop;
	desktopQuery.addEventListener("change", () => {
		closeSearch(nav);
		setMenuExpanded(nav, navSections, false);
	});
	window.addEventListener("keydown", handleEscape);
	nav.addEventListener("focusout", handleFocusLost);

	const navWrapper = document.createElement("div");
	navWrapper.className = "nav-wrapper";
	navWrapper.append(nav);
	block.append(navWrapper);

	if (getMetadata("breadcrumbs").toLowerCase() === "true") {
		navWrapper.append(await buildBreadcrumbs());
	}
}
