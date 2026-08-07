const THEME_TOKENS = ['background', 'surface', 'surfaceContainer', 'surfaceContainerHigh', 'onBackground', 'onSurface', 'onSurfaceVariant', 'primary', 'onPrimary', 'outline', 'outlineVariant', 'error', 'tertiary'];
const TYPE_LABELS = { app: 'App', widget: 'Widget', overlay: 'Overlay', configuration: 'Konfiguration' };
const state = { catalog: [], query: '', type: 'all', sort: 'popular', activePlugin: null, catalogConnected: false };
const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  Object.assign(elements, {
    grid: document.querySelector('#catalog-grid'),
    empty: document.querySelector('#empty-state'),
    emptyTitle: document.querySelector('#empty-title'),
    emptyDescription: document.querySelector('#empty-description'),
    summary: document.querySelector('#catalog-summary'),
    status: document.querySelector('#catalog-status'),
    statusLabel: document.querySelector('#catalog-status-label'),
    search: document.querySelector('#catalog-search'),
    clearSearch: document.querySelector('#clear-search'),
    sort: document.querySelector('#sort-order'),
    filters: document.querySelector('#type-filters'),
    pluginDialog: document.querySelector('#plugin-dialog'),
    pluginDialogTitle: document.querySelector('#plugin-dialog-title'),
    pluginDialogType: document.querySelector('#plugin-dialog-type'),
    pluginDialogBody: document.querySelector('#plugin-dialog-body'),
    uploadDialog: document.querySelector('#upload-dialog'),
    toast: document.querySelector('#toast')
  });

  removeTechnicalQueryParameters();
  bindEvents();
  setupHudiyBridge();
  loadCatalog();
});

function bindEvents() {
  elements.search.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase('de-DE');
    elements.clearSearch.hidden = !event.target.value;
    renderCatalog();
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.search.value = '';
    state.query = '';
    elements.clearSearch.hidden = true;
    elements.search.focus();
    renderCatalog();
  });

  elements.sort.addEventListener('change', (event) => {
    state.sort = event.target.value;
    renderCatalog();
  });

  elements.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    state.type = button.dataset.type;
    elements.filters.querySelectorAll('[data-type]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderCatalog();
  });

  document.querySelectorAll('#reload-catalog, #empty-retry').forEach((button) => button.addEventListener('click', loadCatalog));
  document.querySelector('#open-upload').addEventListener('click', () => elements.uploadDialog.showModal());
  document.querySelector('#google-login').addEventListener('click', startGoogleLogin);
  document.querySelector('#install-plugin').addEventListener('click', installActivePlugin);

  document.addEventListener('click', (event) => {
    const detailsButton = event.target.closest('[data-plugin-id]');
    if (detailsButton) openPluginDialog(detailsButton.dataset.pluginId);

    const closeButton = event.target.closest('[data-close-dialog]');
    if (closeButton) document.querySelector('#' + closeButton.dataset.closeDialog).close();
  });

  [elements.pluginDialog, elements.uploadDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}
function getConfig() {
  return window.hudiyMarketplaceConfig && typeof window.hudiyMarketplaceConfig === 'object' ? window.hudiyMarketplaceConfig : {};
}

function removeTechnicalQueryParameters() {
  const url = new URL(window.location.href);
  ['rev', 'fresh', 'cache'].forEach((key) => url.searchParams.delete(key));
  const cleanUrl = url.pathname + url.search + url.hash;
  if (cleanUrl !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

async function loadCatalog() {
  setCatalogStatus('loading', 'Katalog wird geladen');
  document.querySelector('.catalog-section').setAttribute('aria-busy', 'true');
  state.catalog = [];
  state.catalogConnected = false;
  renderCatalog();

  try {
    const bridgeCatalog = window.hudiy && Array.isArray(window.hudiy.marketplaceCatalog) ? window.hudiy.marketplaceCatalog : null;
    let payload = bridgeCatalog;

    if (payload === null) {
      const endpoint = getCatalogEndpoint();
      const configuredHeaders = getConfig().catalogHeaders && typeof getConfig().catalogHeaders === 'object' ? getConfig().catalogHeaders : {};
      const headers = { Accept: 'application/json' };
      ['apikey', 'Authorization'].forEach((name) => {
        if (typeof configuredHeaders[name] === 'string') headers[name] = configuredHeaders[name];
      });

      const response = await fetch(endpoint, { headers, credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('catalog_' + response.status);
      payload = await response.json();
    }

    const rawPlugins = Array.isArray(payload) ? payload : payload && Array.isArray(payload.plugins) ? payload.plugins : [];
    state.catalog = rawPlugins.map(normalizePlugin).filter(Boolean);
    state.catalogConnected = true;
    setCatalogStatus('connected', state.catalog.length + (state.catalog.length === 1 ? ' Erweiterung' : ' Erweiterungen'));
  } catch {
    setCatalogStatus('error', 'Kein Katalog verbunden');
    state.catalog = [];
    state.catalogConnected = false;
  }

  document.querySelector('.catalog-section').setAttribute('aria-busy', 'false');
  renderCatalog();
}

function getCatalogEndpoint() {
  const configured = getConfig().catalogEndpoint;
  if (!configured) return 'api/catalog';
  if (!configured.includes(':') && !configured.startsWith('//')) return configured;
  return isSafeExternalUrl(configured) ? configured : 'api/catalog';
}

function normalizePlugin(plugin) {
  if (!plugin || typeof plugin !== 'object') return null;

  const required = ['id', 'name', 'description', 'author', 'version', 'supportedHudiyVersion', 'checksum'];
  if (required.some((key) => typeof plugin[key] !== 'string' || !plugin[key].trim())) return null;
  if (!Object.prototype.hasOwnProperty.call(TYPE_LABELS, plugin.type)) return null;
  if (!Array.isArray(plugin.permissions) || !Array.isArray(plugin.files) || !plugin.files.length) return null;
  if (!plugin.files.every(isAllowedPluginPath) || !plugin.entrypoints || !Object.values(plugin.entrypoints).every(isAllowedPluginPath)) return null;
  if (!/^sha256:[\da-f]{64}$/i.test(plugin.checksum.trim())) return null;

  const safeLinks = Array.isArray(plugin.links)
    ? plugin.links
        .filter((link) => link && typeof link.label === 'string' && isSafeExternalUrl(link.url))
        .map((link) => ({ label: link.label, url: link.url }))
    : [];

  return {
    id: plugin.id.trim(),
    name: plugin.name.trim(),
    description: plugin.description.trim(),
    author: plugin.author.trim(),
    version: plugin.version.trim(),
    type: plugin.type,
    supportedHudiyVersion: plugin.supportedHudiyVersion.trim(),
    permissions: plugin.permissions.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean),
    files: plugin.files.filter((item) => typeof item === 'string'),
    entrypoints: plugin.entrypoints,
    checksum: plugin.checksum.trim(),
    downloads: Number.isFinite(Number(plugin.downloads)) ? Number(plugin.downloads) : 0,
    rating: Number.isFinite(Number(plugin.rating)) ? Math.max(0, Math.min(5, Number(plugin.rating))) : 0,
    updatedAt: typeof plugin.updatedAt === 'string' ? plugin.updatedAt : '',
    links: safeLinks
  };
}

function renderCatalog() {
  const filtered = state.catalog
    .filter((plugin) => {
      const matchesType = state.type === 'all' || plugin.type === state.type;
      const haystack = [plugin.name, plugin.description, plugin.author, TYPE_LABELS[plugin.type]].join(' ').toLocaleLowerCase('de-DE');
      return matchesType && (!state.query || haystack.includes(state.query));
    })
    .sort((a, b) => {
      if (state.sort === 'name') return a.name.localeCompare(b.name, 'de');
      if (state.sort === 'recent') return dateValue(b.updatedAt) - dateValue(a.updatedAt);
      return b.downloads - a.downloads || b.rating - a.rating;
    });

  elements.grid.replaceChildren();
  filtered.forEach((plugin) => elements.grid.append(createPluginCard(plugin)));

  const hasCatalog = state.catalogConnected;
  elements.grid.hidden = !hasCatalog || filtered.length === 0;
  elements.empty.hidden = hasCatalog && filtered.length > 0;

  if (!hasCatalog) {
    elements.emptyTitle.textContent = 'Noch kein Katalog verbunden';
    elements.emptyDescription.textContent = 'Hudiy Marketplace zeigt ohne echten Community-Katalog keine Beispielinhalte oder Platzhalter.';
  } else if (!filtered.length) {
    elements.emptyTitle.textContent = 'Keine Treffer';
    elements.emptyDescription.textContent = 'Passe Suche oder Filter an, um weitere Community-Erweiterungen zu finden.';
  }

  elements.summary.textContent = hasCatalog
    ? filtered.length + ' von ' + state.catalog.length + ' Community-Erweiterungen'
    : 'Verfügbare Erweiterungen werden hier aufgelistet.';
}

function createPluginCard(plugin) {
  const card = document.createElement('article');
  card.className = 'plugin-card';

  const top = document.createElement('div');
  top.className = 'card-top';

  const mark = document.createElement('div');
  mark.className = 'plugin-mark';
  mark.textContent = plugin.name.slice(0, 1).toLocaleUpperCase('de-DE');
  mark.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'community-label';
  label.textContent = 'Community-made · ungeprüft';
  top.append(mark, label);

  const title = document.createElement('h3');
  title.textContent = plugin.name;

  const description = document.createElement('p');
  description.textContent = plugin.description;

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.append(metaItem('category', TYPE_LABELS[plugin.type]), metaItem('person', plugin.author), metaItem('download', formatNumber(plugin.downloads)));

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const version = document.createElement('span');
  version.className = 'card-meta';
  version.textContent = 'v' + plugin.version;

  const details = document.createElement('button');
  details.type = 'button';
  details.dataset.pluginId = plugin.id;
  details.textContent = 'Details ansehen';

  footer.append(version, details);
  card.append(top, title, description, meta, footer);
  return card;
}

function metaItem(icon, text) {
  const icons = { category: '◈', person: '●', download: '↓' };
  const item = document.createElement('span');
  const iconElement = document.createElement('span');
  iconElement.className = 'material-symbols';
  iconElement.setAttribute('aria-hidden', 'true');
  iconElement.textContent = icons[icon] || '•';
  item.append(iconElement, document.createTextNode(text));
  return item;
}

function isAllowedPluginPath(value) {
  return typeof value === 'string'
    && /^(dist|assets|config)\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes('..')
    && /\.(?:js|mjs|json|css|html|svg|png|jpe?g|webp|woff2?|ttf)$/i.test(value);
}

function openPluginDialog(id) {
  const plugin = state.catalog.find((item) => item.id === id);
  if (!plugin) return;

  state.activePlugin = plugin;
  elements.pluginDialogTitle.textContent = plugin.name;
  elements.pluginDialogType.textContent = TYPE_LABELS[plugin.type] + ' · Community-made · ungeprüft';
  elements.pluginDialogBody.replaceChildren(createDetailContent(plugin));
  elements.pluginDialog.showModal();
}

function createDetailContent(plugin) {
  const fragment = document.createDocumentFragment();
  const description = document.createElement('p');
  description.className = 'detail-description';
  description.textContent = plugin.description;

  const details = document.createElement('dl');
  details.className = 'detail-grid';

  [
    ['Autor', plugin.author],
    ['Version', 'v' + plugin.version],
    ['Plugin-Typ', TYPE_LABELS[plugin.type]],
    ['Downloads', formatNumber(plugin.downloads)],
    ['Bewertung', plugin.rating ? plugin.rating.toFixed(1) + ' / 5' : 'Noch keine Bewertung'],
    ['Aktualisiert', formatDate(plugin.updatedAt)],
    ['Unterstütztes Hudiy', plugin.supportedHudiyVersion],
    ['Checksumme', plugin.checksum]
  ].forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'detail-item';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    item.append(dt, dd);
    details.append(item);
  });

  fragment.append(description, details);

  const permissionSection = document.createElement('section');
  permissionSection.className = 'detail-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Benötigte Berechtigungen';
  const list = document.createElement('ul');
  list.className = 'permission-list';

  (plugin.permissions.length ? plugin.permissions : ['Keine Berechtigungen angegeben']).forEach((permission) => {
    const item = document.createElement('li');
    item.textContent = permission;
    list.append(item);
  });

  permissionSection.append(heading, list);
  fragment.append(permissionSection);

  if (plugin.links.length) {
    const linksSection = document.createElement('section');
    linksSection.className = 'detail-section';
    const linksHeading = document.createElement('h3');
    linksHeading.textContent = 'Weitere Informationen';
    linksSection.append(linksHeading);

    plugin.links.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.label;
      linksSection.append(anchor);
    });

    fragment.append(linksSection);
  }

  return fragment;
}

function installActivePlugin() {
  if (!state.activePlugin) return;

  const installer = window.hudiy && window.hudiy.installMarketplacePlugin;
  if (typeof installer !== 'function') {
    showToast('Die sichere Hudiy-Installationsschnittstelle ist in dieser Preview nicht verbunden.');
    return;
  }

  installer({
    id: state.activePlugin.id,
    version: state.activePlugin.version,
    checksum: state.activePlugin.checksum
  });
}

function startGoogleLogin() {
  const endpoint = getConfig().googleOAuthEndpoint;
  if (!endpoint || !isSafeExternalUrl(endpoint)) {
    showToast('Google-Login ist erst verfügbar, wenn ein OAuth-Backend verbunden ist.');
    return;
  }

  window.open(endpoint, '_blank', 'noopener,noreferrer');
}

function setupHudiyBridge() {
  applyTheme(window.hudiy && window.hudiy.colorScheme ? window.hudiy.colorScheme : null);

  const bridge = window.hudiy;
  if (!bridge) return;

  bridge.onAttached = () => applyTheme(bridge.colorScheme || null);
  bridge.onColorSchemeChanged = () => applyTheme(bridge.colorScheme || null);
  bridge.onInputFocusChanged = () => {
    document.body.dataset.hudiyInputFocus = String(Boolean(bridge.inputFocus));
  };
  bridge.onActivatedChanged = () => {
    document.body.dataset.hudiyActive = String(Boolean(bridge.activated));
  };
  bridge.onMoveToNextControl = () => moveFocus(1);
  bridge.onMoveToPreviousControl = () => moveFocus(-1);
  bridge.onTriggered = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.click();
  };
  bridge.onGoBack = () => {
    if (elements.pluginDialog.open) {
      elements.pluginDialog.close();
      return true;
    }
    if (elements.uploadDialog.open) {
      elements.uploadDialog.close();
      return true;
    }
    return false;
  };
}

function moveFocus(direction) {
  const controls = Array.from(document.querySelectorAll('button, input, select, [tabindex="0"]'))
    .filter((control) => !control.disabled && control.offsetParent !== null);

  if (!controls.length) return false;

  const currentIndex = controls.indexOf(document.activeElement);
  const nextIndex = currentIndex < 0
    ? direction > 0 ? 0 : controls.length - 1
    : (currentIndex + direction + controls.length) % controls.length;

  controls[nextIndex].focus();
  return true;
}

async function applyTheme(theme) {
  let nextTheme = theme;

  if (!nextTheme) {
    try {
      const response = await fetch('hudiy-theme.json', { cache: 'no-store' });
      if (response.ok) nextTheme = await response.json();
    } catch {
      nextTheme = null;
    }
  }

  if (!nextTheme || typeof nextTheme !== 'object') return;

  const root = document.documentElement;
  THEME_TOKENS.forEach((token) => {
    if (typeof nextTheme[token] === 'string' && isSafeColor(nextTheme[token])) {
      root.style.setProperty('--' + token.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()), nextTheme[token]);
    }
  });
}

function setCatalogStatus(stateName, label) {
  elements.status.dataset.state = stateName;
  elements.statusLabel.textContent = label;
}

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeColor(value) {
  return /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    || /^rgb(a)?\([\d\s,./%]+\)$/i.test(value);
}

function dateValue(value) {
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : date;
}

function formatDate(value) {
  if (!value) return 'Nicht angegeben';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nicht angegeben' : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 4200);
}
