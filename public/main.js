(async function main() {
var config = {};
try {
var response = await fetch('/api/config');
config = await response.json();
} catch (error) {
console.error('ERROR: Could not load config.json:', error);
}
var ui    = config.ui    || {};   // All the text strings
var theme = config.theme || {};   // All the colours
var boot  = ui.boot      || {};   // Boot screen text
if (theme.colors) {
var root = document.documentElement; // The <html> element
var colorNames = Object.keys(theme.colors);
for (var i = 0; i < colorNames.length; i++) {
var varName = colorNames[i];   // e.g. "--green"
var value = theme.colors[varName]; // e.g. "#00ff41"
root.style.setProperty(varName, value);
}
}
if (theme.dots) {
setDotColor('dot-r',       theme.dots.red    || '#ff5f57');
setDotColor('modal-dot-r', theme.dots.red    || '#ff5f57');
setDotColor('dot-y',       theme.dots.yellow || '#febc2e');
setDotColor('modal-dot-y', theme.dots.yellow || '#febc2e');
setDotColor('dot-g',       theme.dots.green  || '#28c840');
setDotColor('modal-dot-g', theme.dots.green  || '#28c840');
}
var bootLogoEl = document.getElementById('boot-logo');
if (bootLogoEl && Array.isArray(boot.logo)) {
bootLogoEl.textContent = boot.logo.join('\n');
}
setText('boot-ready-text', boot.readyText   || '─── SYSTEM READY ───');
setText('boot-press-key',  boot.pressAnyKey || 'Press any key or scroll to continue_');
var bootScreen  = document.getElementById('boot-screen');
var bootLog     = document.getElementById('boot-log');
var bootReady   = document.getElementById('boot-ready');
var mainContent = document.getElementById('main-content');
var bootLines    = Array.isArray(boot.lines) ? boot.lines : [];
var statusLabels = boot.statusLabels || {
ok:   '[  OK  ]',
info: '[ INFO ]',
warn: '[ WARN ]',
err:  '[ FAIL ]'
};
await playBootSequence();
document.addEventListener('keydown',   dismissBoot);
document.addEventListener('wheel',     dismissBoot);
document.addEventListener('touchstart', dismissBoot);
setTimeout(dismissBoot, boot.autoDismissMs || 2000);
var name      = config.name || 'portfolio';
var nameLower = name.toLowerCase();
var navUi     = ui.nav      || {};
var titleFormat = navUi.titleFormat || '{name}@portfolio:~';
var autoTitle = titleFormat.replace('{name}', nameLower);
document.getElementById('page-title').textContent = config.meta?.title || autoTitle;
if (config.meta?.description) {
document.getElementById('page-description').content = config.meta.description;
}
setText('nav-name', autoTitle);
setText('nav-cta',  navUi.cta || '[ ./connect.sh ]');
setText('prompt-user',   nameLower);
setText('prompt-user-2', nameLower);
setText('prompt-user-3', nameLower);
setText('prompt-user-4', nameLower);
setText('prompt-user-5', nameLower);
var heroUi = ui.hero || {};
var heroCmd = document.getElementById('hero-cmd');
if (heroCmd) {
var cmd  = heroUi.command     || 'whoami';
var flag = heroUi.commandFlag || '--verbose';
heroCmd.innerHTML = safeText(cmd) + ' <span class="cmd-flag">' + safeText(flag) + '</span>';
}
var avatarWrap = document.getElementById('avatar-wrap');
var avatarImg  = document.getElementById('avatar-img');
if (avatarImg) {
var photoPath = (config.photo || 'images/profile.jpg').trim().replace(/^\/?public\//, '/');
if (!photoPath.startsWith('/') && !photoPath.startsWith('http')) photoPath = '/' + photoPath;
avatarImg.src = photoPath;
avatarImg.alt = name + ' — profile photo';
avatarImg.classList.remove('hidden');
var targetEl = avatarWrap || avatarImg;
targetEl.style.cursor = 'pointer';
(function(path) {
targetEl.addEventListener('click', function(e) {
e.stopPropagation();
openLightbox([path], 0);
});
})(photoPath);
}
setText('hero-name', name.toLowerCase());
var taglineEl = document.getElementById('tagline-text');
if (taglineEl && config.tagline) {
await sleep(400);
typeWriter(taglineEl, config.tagline);
}
var heroMeta = document.getElementById('hero-meta');
if (heroMeta) {
var gid    = heroUi.gidGroup    || 'portfolio';
var groups = heroUi.extraGroups || 'sudo,developers';
heroMeta.innerHTML =
'<span class="meta-tag">uid=1000(' + safeText(nameLower) + ')</span>' +
'<span class="meta-tag">gid=1000(' + safeText(gid) + ')</span>' +
'<span class="meta-tag">groups=' + safeText(groups) + '</span>';
}
var projUi = ui.projects || {};
var projectsCmd = document.getElementById('projects-cmd');
if (projectsCmd) {
projectsCmd.innerHTML =
safeText(projUi.command || 'ls -la') +
' <span class="cmd-arg">' + safeText(projUi.commandArg || '~/projects/') + '</span>';
}
var grid    = document.getElementById('projects-grid');
var lsTotal = document.getElementById('ls-total');
var projects = config.projects || [];
if (grid) {
setText('ls-total', String(projects.length));
var perms = projUi.permissions || 'drwxr-xr-x';
var arrow = projUi.arrowChar   || '→';
for (var p = 0; p < projects.length; p++) {
var project = projects[p];
var slug    = slugify(project.title);
var tagsHtml = '';
var tags = project.tags || [];
for (var t = 0; t < tags.length; t++) {
tagsHtml += '<span class="project-tag">' + safeText(tags[t]) + '</span>';
}
var projImagesRaw = Array.isArray(project.images) && project.images.length > 0 ? project.images : [];
var projImages = [];
for (var im = 0; im < projImagesRaw.length; im++) {
var norm = normalizeImgSrc(projImagesRaw[im]);
if (norm) projImages.push(norm);
}
var card = document.createElement('div');
card.className = 'project-card';
card.setAttribute('tabindex', '0');

var bodyHtml = '';
if (projImages.length > 0) {
var frameHtml =
'<div class="project-frame">' +
'<div class="project-frame-bar">' +
'<span class="project-frame-tag">[FRAME]</span>' +
'<span class="project-frame-zoom">⛶ EXPAND</span>' +
'</div>' +
'<div class="project-frame-viewport">' +
'<img class="project-frame-img" src="' + projImages[0] + '" alt="' + safeText(project.title) + '" loading="lazy" />' +
'</div>' +
(projImages.length > 1 ? '<div class="project-frame-strip"></div>' : '') +
'</div>';

bodyHtml =
'<div class="project-split-body">' +
'<div class="project-split-left">' + frameHtml + '</div>' +
'<div class="project-split-right">' +
'<div class="project-desc">' + safeText(project.description) + '</div>' +
(tagsHtml ? '<div class="project-tags">' + tagsHtml + '</div>' : '') +
'</div>' +
'</div>';
} else {
bodyHtml =
'<div class="project-desc">' + safeText(project.description) + '</div>' +
(tagsHtml ? '<div class="project-tags">' + tagsHtml + '</div>' : '');
}

card.innerHTML =
'<div class="project-header">' +
'<span class="project-perms">' + safeText(perms) + '</span>' +
'<span class="project-name">' + safeText(slug) + '/</span>' +
'</div>' +
bodyHtml +
'<span class="project-arrow">' + safeText(arrow) + '</span>';

if (projImages.length > 0) {
var frameEl = card.querySelector('.project-frame');
if (frameEl) {
(function(imgs) {
frameEl.addEventListener('click', function(e) {
e.stopPropagation();
openLightbox(imgs, 0);
});
})(projImages);
}

if (projImages.length > 1) {
var stripEl = card.querySelector('.project-frame-strip');
for (var sIdx = 0; sIdx < projImages.length; sIdx++) {
var stripImg = document.createElement('img');
stripImg.className = 'project-strip-thumb' + (sIdx === 0 ? ' active' : '');
stripImg.src = projImages[sIdx];
stripImg.alt = project.title + ' preview ' + (sIdx + 1);
(function(imgs, idx, container, mainImg) {
stripImg.addEventListener('click', function(e) {
e.stopPropagation();
if (mainImg) mainImg.src = imgs[idx];
var allStrips = container.querySelectorAll('.project-strip-thumb');
for (var k = 0; k < allStrips.length; k++) allStrips[k].classList.remove('active');
this.classList.add('active');
});
})(projImages, sIdx, stripEl, card.querySelector('.project-frame-img'));
stripEl.appendChild(stripImg);
}
}
}

if (project.url) {
card.addEventListener('click', openUrl(project.url));
card.addEventListener('keydown', function(url) {
return function(e) { if (e.key === 'Enter') window.open(url, '_blank'); };
}(project.url));
}
grid.appendChild(card);
}
}
var connUi = ui.connect || {};
var connectCmd = document.getElementById('connect-cmd');
if (connectCmd) {
connectCmd.innerHTML =
safeText(connUi.command || './connect.sh') +
' <span class="cmd-flag">' + safeText(connUi.commandFlag || '--via-whatsapp') + '</span>';
}
setText('connect-btn-icon', connUi.buttonIcon || '▶');
setText('connect-btn-text', connUi.buttonText || 'INITIATE SECURE CONNECTION');
var socialUi   = ui.socials || {};
var socialsEl  = document.getElementById('footer-socials');
var socialsCmd = document.getElementById('socials-cmd');
if (socialsCmd) {
socialsCmd.innerHTML =
safeText(socialUi.command || 'cat') +
' <span class="cmd-arg">' + safeText(socialUi.commandArg || '~/.social_links') + '</span>';
}
var svgIcons = {
  github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
  linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
  twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
  instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
  email: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  default: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>'
};
if (socialsEl && config.socials) {
var keys = Object.keys(config.socials);
for (var s = 0; s < keys.length; s++) {
var key   = keys[s];
var value = config.socials[key];
if (!value) continue;
var href;
if (key.toLowerCase() === 'email') {
href = 'mailto:' + value;
} else if (value.startsWith('http')) {
href = value;
} else {
href = 'https://' + value;
}
var iconHtml = svgIcons[key.toLowerCase()] || svgIcons.default;
var label = key.charAt(0).toUpperCase() + key.slice(1);
var link = document.createElement('a');
link.href      = href;
link.target     = '_blank';
link.rel        = 'noopener noreferrer';
link.className  = 'social-entry';
link.innerHTML  =
'<div class="social-icon">' + iconHtml + '</div>' +
'<span class="social-label">' + safeText(label) + '</span>';
socialsEl.appendChild(link);
}
}
var footerUi = ui.footer || {};
setText('footer-cursor', footerUi.cursorChar || '█');
setText('footer-copy',   footerUi.copy       || '');
var modalUi  = ui.modal || {};
var overlay  = document.getElementById('modal-overlay');
var panel    = document.getElementById('modal-panel');
var closeBtn = document.getElementById('modal-close');
setText('modal-title', modalUi.title || 'SECURE_HANDSHAKE.sh');
if (closeBtn) closeBtn.textContent = modalUi.closeChar || '✕';
var modalBody = panel ? panel.querySelector('.modal-body') : null;
if (modalBody) {
var logHtml = '';
var logLines = modalUi.logLines || [];
for (var l = 0; l < logLines.length; l++) {
var line = logLines[l];
if (line.status === 'prompt') {
logHtml += '<div class="log-line log-prompt-line">' + safeText(line.text) + '</div>';
} else {
var statusClass = line.status === 'ok' ? 'log-ok' : 'log-info';
var statusText  = statusLabels[line.status] || statusLabels.ok;
logHtml += '<div class="log-line"><span class="' + statusClass + '">' + safeText(statusText) + '</span> ' + safeText(line.text) + '</div>';
}
}
var fields     = modalUi.fields || {};
var fieldOrder = ['name', 'email', 'instagram', 'linkedin', 'role', 'whereMet'];
var fieldTypes = { email: 'email' };
var fieldsHtml = '';
for (var f = 0; f < fieldOrder.length; f++) {
var fieldKey  = fieldOrder[f];
var fieldCfg  = fields[fieldKey] || {};
var fieldLabel = fieldCfg.label       || fieldKey.toUpperCase();
var placeholder = fieldCfg.placeholder || '';
var errorMsg    = fieldCfg.error       || '';
var inputType   = fieldTypes[fieldKey] || 'text';
var isRequired  = fieldKey === 'name' ? 'required' : '';
fieldsHtml +=
'<div class="term-field">' +
'<label class="term-label" for="field-' + fieldKey + '">' +
'<span class="field-prompt">$</span> export <span class="env-key">' + safeText(fieldLabel) + '</span>=' +
'</label>' +
'<input class="term-input" id="field-' + fieldKey + '" name="' + fieldKey + '"' +
' type="' + inputType + '"' +
' placeholder=\'' + placeholder.replace(/'/g, '&#39;') + '\'' +
' ' + isRequired + ' />' +
(errorMsg ? '<span class="term-field-error hidden" id="error-' + fieldKey + '">' + safeText(errorMsg) + '</span>' : '') +
'</div>';
}
var submitCmd  = safeText(modalUi.submitCommand || './execute.sh');
var submitFlag = safeText(modalUi.submitFlag    || '--send-to-whatsapp');
var loadingTxt = safeText(modalUi.loadingText   || '[ processing... ]');
var formNote   = safeText(modalUi.formNote      || '');
modalBody.innerHTML =
'<div class="modal-log">' + logHtml + '</div>' +
'<form id="capture-form" novalidate autocomplete="off">' +
fieldsHtml +
'<div class="term-field submit-field">' +
'<button class="term-submit-btn" id="form-submit" type="submit">' +
'<span id="submit-text">' + submitCmd + ' <span class="cmd-flag">' + submitFlag + '</span></span>' +
'<span id="submit-spinner" class="term-spinner hidden">' + loadingTxt + '</span>' +
'</button>' +
'</div>' +
'<div class="form-note">' + formNote + '</div>' +
'</form>';
}
var heroCta = document.getElementById('hero-cta-btn');
var navCta  = document.getElementById('nav-cta');
if (heroCta) heroCta.addEventListener('click', openModal);
if (navCta)  navCta.addEventListener('click',  openModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) {
if (!panel.contains(e.target)) closeModal();
});
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape' && !overlay.hidden) closeModal();
});
if (modalBody) {
modalBody.addEventListener('submit', async function(e) {
e.preventDefault();
var nameInput = document.getElementById('field-name');
var nameError = document.getElementById('error-name');
var submitBtn = document.getElementById('form-submit');
var submitTxt = document.getElementById('submit-text');
var spinner   = document.getElementById('submit-spinner');
if (!nameInput || !nameInput.value.trim()) {
if (nameInput) nameInput.classList.add('is-error');
if (nameError) nameError.classList.remove('hidden');
if (nameInput) nameInput.focus();
return;
}
nameInput.classList.remove('is-error');
if (nameError) nameError.classList.add('hidden');
submitBtn.disabled = true;
if (submitTxt) submitTxt.classList.add('hidden');
if (spinner)   spinner.classList.remove('hidden');
var data = {
name:      nameInput.value.trim(),
email:     getFieldValue('field-email'),
instagram: getFieldValue('field-instagram'),
linkedin:  getFieldValue('field-linkedin'),
role:      getFieldValue('field-role'),
whereMet:  getFieldValue('field-whereMet'),
};
try {
var res  = await fetch('/api/capture', {
method:  'POST',
headers: { 'Content-Type': 'application/json' },
body:    JSON.stringify(data),
});
var result = await res.json();
if (!res.ok || !result.success) {
throw new Error(result.error || 'Failed');
}
showSuccess(modalBody);
setTimeout(function() {
if (result.whatsappUrl) {
window.open(result.whatsappUrl, '_blank');
}
setTimeout(closeModal, 800);
}, 1400);
} catch (error) {
console.error('Form submission failed:', error);
submitBtn.disabled = false;
if (submitTxt) submitTxt.classList.remove('hidden');
if (spinner)   spinner.classList.add('hidden');
alert(ui.errors?.submitFailed || '// ERROR: Submission failed. Please retry.');
}
});
modalBody.addEventListener('input', function(e) {
if (e.target.id === 'field-name') {
e.target.classList.remove('is-error');
var errorEl = document.getElementById('error-name');
if (errorEl) errorEl.classList.add('hidden');
}
});
}
var _lb = null;
var _lbImages = [];
var _lbIdx = 0;
function openLightbox(images, startIdx) {
_lbImages = images;
_lbIdx = startIdx || 0;
if (!_lb) {
_lb = document.createElement('div');
_lb.className = 'lb-overlay';
_lb.hidden = true;
_lb.innerHTML =
'<div class="lb-panel">' +
'<div class="lb-titlebar">' +
'<div class="term-dots" aria-hidden="true">' +
'<span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>' +
'</div>' +
'<span class="lb-title" id="lb-title">image_viewer.sh</span>' +
'<button class="modal-close-btn lb-close" id="lb-close">✕</button>' +
'</div>' +
'<div class="lb-body">' +
'<button class="lb-nav" id="lb-prev" aria-label="Previous image">‹</button>' +
'<img class="lb-img" id="lb-img" alt="" />' +
'<button class="lb-nav" id="lb-next" aria-label="Next image">›</button>' +
'</div>' +
'</div>';
document.body.appendChild(_lb);
_lb.querySelector('#lb-close').addEventListener('click', closeLightbox);
_lb.querySelector('#lb-prev').addEventListener('click', function() { _lbIdx = (_lbIdx - 1 + _lbImages.length) % _lbImages.length; updateLightbox(); });
_lb.querySelector('#lb-next').addEventListener('click', function() { _lbIdx = (_lbIdx + 1) % _lbImages.length; updateLightbox(); });
_lb.addEventListener('click', function(e) { if (e.target === _lb) closeLightbox(); });
document.addEventListener('keydown', function(e) {
if (!_lb || _lb.hidden) return;
if (e.key === 'Escape') closeLightbox();
if (e.key === 'ArrowLeft')  { _lbIdx = (_lbIdx - 1 + _lbImages.length) % _lbImages.length; updateLightbox(); }
if (e.key === 'ArrowRight') { _lbIdx = (_lbIdx + 1) % _lbImages.length; updateLightbox(); }
});
}
updateLightbox();
_lb.hidden = false;
_lb.getBoundingClientRect();
_lb.classList.add('is-open');
document.body.style.overflow = 'hidden';
document.getElementById('lb-close').focus();
}
function closeLightbox() {
if (!_lb) return;
_lb.classList.remove('is-open');
_lb.addEventListener('transitionend', function() {
_lb.hidden = true;
document.body.style.overflow = '';
}, { once: true });
}
function updateLightbox() {
var imgEl   = document.getElementById('lb-img');
var titleEl = document.getElementById('lb-title');
var prevBtn = document.getElementById('lb-prev');
var nextBtn = document.getElementById('lb-next');
if (imgEl)   imgEl.src = _lbImages[_lbIdx];
if (titleEl) titleEl.textContent = 'image_viewer.sh [' + (_lbIdx + 1) + '/' + _lbImages.length + ']';
var multi = _lbImages.length > 1;
if (prevBtn) prevBtn.style.display = multi ? '' : 'none';
if (nextBtn) nextBtn.style.display = multi ? '' : 'none';
}
function normalizeImgSrc(src) {
if (!src || typeof src !== 'string') return '';
src = src.trim();
if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
if (!src.startsWith('/')) src = '/' + src;
return src;
}
function setText(id, text) {
var el = document.getElementById(id);
if (el) el.textContent = text;
}
function getFieldValue(id) {
var el = document.getElementById(id);
return el ? el.value.trim() : '';
}
function safeText(str) {
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}
function slugify(str) {
return String(str)
.toLowerCase()
.replace(/[^a-z0-9]+/g, '-')
.replace(/(^-|-$)/g, '');
}
function sleep(ms) {
return new Promise(function(resolve) {
setTimeout(resolve, ms);
});
}
function typeWriter(element, text) {
var i = 0;
element.textContent = '';
function tick() {
if (i < text.length) {
element.textContent += text[i];
i++;
setTimeout(tick, 28 + Math.random() * 20);
}
}
tick();
}
function setDotColor(id, color) {
var el = document.getElementById(id);
if (el) {
el.style.background = color;
el.style.boxShadow  = '0 0 6px ' + color;
}
}
function openUrl(url) {
return function() {
window.open(url, '_blank', 'noopener');
};
}
async function playBootSequence() {
var delay = 200;
for (var i = 0; i < bootLines.length; i++) {
await sleep(delay);
delay = bootLines[i].delay || 80;
var row = document.createElement('div');
row.className = 'boot-line';
var label = document.createElement('span');
var statusType = bootLines[i].status || 'info';
var classMap = { ok: 'boot-status-ok', info: 'boot-status-info', warn: 'boot-status-warn', err: 'boot-status-err' };
label.className   = classMap[statusType] || 'boot-status-info';
label.textContent  = statusLabels[statusType] || statusLabels.info;
var text = document.createElement('span');
text.textContent = bootLines[i].text;
row.appendChild(label);
row.appendChild(text);
bootLog.appendChild(row);
bootLog.scrollTop = bootLog.scrollHeight;
}
await sleep(300);
bootReady.classList.remove('hidden');
}
function dismissBoot() {
document.removeEventListener('keydown',    dismissBoot);
document.removeEventListener('wheel',      dismissBoot);
document.removeEventListener('touchstart', dismissBoot);
bootScreen.classList.add('fading');
mainContent.classList.remove('hidden');
setTimeout(function() {
bootScreen.remove();
}, 600);
}
function openModal() {
overlay.hidden = false;
overlay.getBoundingClientRect();
overlay.classList.add('is-open');
document.body.style.overflow = 'hidden';
setTimeout(function() {
var firstInput = overlay.querySelector('.term-input');
if (firstInput) firstInput.focus();
}, 320);
}
function closeModal() {
overlay.classList.remove('is-open');
overlay.addEventListener('transitionend', function() {
overlay.hidden = true;
document.body.style.overflow = '';
}, { once: true }); // { once: true } = remove listener after it fires
}
function showSuccess(body) {
var successCfg = modalUi.success || {};
var lines      = successCfg.lines || [];
var html = '';
for (var i = 0; i < lines.length; i++) {
var cls = lines[i].status === 'ok' ? 'log-ok' : 'log-info';
var lbl = statusLabels[lines[i].status] || statusLabels.ok;
html += '<span><span class="' + cls + '" style="font-weight:700;">' + safeText(lbl) + '</span> ' + safeText(lines[i].text) + '</span>';
}
body.innerHTML =
'<div style="padding:24px 0; display:flex; flex-direction:column; gap:14px;">' +
'<div style="font-size:0.8rem; display:flex; flex-direction:column; gap:5px; color:var(--text-dim);">' +
html +
'</div>' +
'<div style="margin-top:8px; font-size:0.9rem; color:var(--text); text-shadow:var(--glow-sm);">' +
safeText(successCfg.message || '') +
'</div>' +
'<div style="color:var(--text-comment); font-size:0.75rem; font-style:italic;">' +
safeText(successCfg.note || '') +
'</div>' +
'</div>';
}
})(); // End of main()
