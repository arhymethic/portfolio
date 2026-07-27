# Frontend Developer Guide

This document preserves the instructional comments that were removed from the public frontend files (`index.html`, `style.css`, and `main.js`) to secure the site.

## HTML Structure (`public/index.html`)

- **`<div class="scanlines">`**: The faint horizontal lines that make it look like a CRT monitor. Pure decoration. Remove this div to turn them off.
- **`<div id="boot-screen">`**: The fake Linux startup animation. Shows first, disappears after 2 seconds (or any key). All boot text comes from `config.json` → `ui.boot`.
- **`<div class="term-titlebar">`**: The bar at the top with the 3 coloured dots and your name. Stays sticky at the top when you scroll.
- **`<section class="cmd-block">`**: Each section starts with a fake command line prompt (e.g. `$ whoami --verbose`). 
- **`<div class="modal-overlay">`**: The popup form that collects details before redirecting to WhatsApp. Built dynamically by `main.js`.

## CSS Styling (`public/style.css`)

The CSS file is heavily optimized and divided into sections:
1. **Colours & Variables**: Edit these to change the entire colour scheme (or override them in `config.json` → `theme.colors`). `--green` is the primary colour, `--cyan` is for accents, `--bg` is the background.
2. **Scanlines**: The CRT monitor effect.
3. **Boot Screen**: The fake Linux startup.
4. **Animations**: Contains `@keyframes blink`, `@keyframes glitch`, and `@keyframes fadeUp`.
5. **Command Blocks**: The prompt lines (`user@host:~$`).
6. **Project Cards**: The grid of your work. On mobile, this drops to 1 column. 
7. **Mobile Breakpoints (480px / 768px)**: Look at the very bottom of the CSS file for how the site adapts to phones. The modal uses `100dvh` to ensure it stays full-screen even when the software keyboard pops open.

## Logic (`public/main.js`)

`main.js` does THREE main things:
1. **Loads Config**: Fetches `config.json` and `data/projects.json` from the server via `/api/config`.
2. **Injects Data**: Populates every string, tag, project, and social link on the page using standard DOM manipulation (`document.getElementById`).
3. **Handles Capture Modal**: Builds the form dynamically, handles the "Submit" click, sends the payload to `/api/capture`, and then redirects the user to the generated WhatsApp deep-link.

*Security Note: All text injected into the HTML from the config goes through a `safeText()` helper function which escapes HTML brackets to prevent Cross-Site Scripting (XSS) attacks.*
