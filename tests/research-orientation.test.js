const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/research-orientation.js', `file://${__filename}`), 'utf8');
const styles = fs.readFileSync(new URL('../styles/research-orientation.css', `file://${__filename}`), 'utf8');
const english = fs.readFileSync(new URL('../research-orientation.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../jp/research-orientation.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');

test('interactive steps share the same top edge while the no-script fallback remains spaced', () => {
  assert.match(styles, /\.tour-step \+ \.tour-step\s*\{\s*margin-top:\s*4rem;/);
  assert.match(styles, /\.tour-js \.tour-step\s*\{\s*margin-top:\s*0;/);
});

test('each language places one dynamic status beside the skip control', () => {
  for (const html of [english, japanese]) {
    assert.equal((html.match(/data-status/g) || []).length, 1);
    assert.equal((html.match(/class="step-label"/g) || []).length, 0);
    assert.equal((html.match(/class="step-eyebrow"/g) || []).length, 0);
    assert.match(html, /<div class="tour-exit">\s*<p data-status[^>]*>[^<]+<\/p>\s*<button class="skip"[^>]*data-skip>/);
  }
  assert.match(styles, /\.tour-exit\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.progress\s*\{[^}]*grid-column:\s*2;/);
});

function load(hash = '') {
  const listeners = {};
  const docListeners = {};
  const steps = ['welcome','hub','workflow','outputs','contact','ideas','faq'].map(id => {
    const heading = { focus() { heading.focused = true; } };
    const back = { disabled: false };
    const preview = { scrollTop: 0 };
    const guide = { scrollTop: 0 };
    const details = { open: false, attrs: {}, removeAttribute(name) { delete this.attrs[name]; } };
    const panel = { hidden: false };
    const accordion = {
      attrs: { 'aria-expanded': 'false', 'aria-controls': id + '-panel' },
      classes: new Set(),
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name] || null; },
      classList: { remove(...names) { names.forEach(name => accordion.classes.delete(name)); } }
    };
    preview.contains = element => element === panel;
    preview.querySelectorAll = selector => {
      if (selector === 'details') return [details];
      if (selector === '[aria-expanded="true"]') return accordion.attrs['aria-expanded'] === 'true' ? [accordion] : [];
      if (selector.includes('.expanded')) return accordion.classes.size ? [accordion] : [];
      return [];
    };
    return {
      id,
      hidden: false,
      querySelector(selector) {
        if (selector === 'h2') return heading;
        if (selector === '[data-back]') return back;
        if (selector === '.tour-stage > :first-child') return preview;
        if (selector === '.callout') return guide;
        return null;
      },
      heading,
      back,
      preview,
      guide,
      details,
      accordion,
      panel
    };
  });
  const dots = steps.map(() => ({ attrs: {}, setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];} }));
  const status = { textContent: '' };
  const tour = {
    dataset: { stepWord: 'Step', ofWord: 'of' },
    querySelectorAll: selector => selector === '[data-step]' ? steps : dots,
    querySelector: () => status,
    addEventListener(type, fn) { listeners[type] = fn; }
  };
  const location = { hash };
  const history = {
    pushState(a,b,value) { location.hash = value; },
    replaceState(a,b,value) { location.hash = value; }
  };
  const document = {
    documentElement: { classList: { add() {} } }, readyState: 'complete',
    querySelectorAll: () => [tour],
    getElementById: id => steps.find(step => id === step.id + '-panel')?.panel || null,
    addEventListener(type, fn) { docListeners[type] = fn; }
  };
  const window = { location, history, addEventListener(type, fn) { listeners[type] = fn; } };
  vm.runInNewContext(source, { document, window, Array });
  function target(action) {
    return { closest(selector) { return selector === action ? {} : null; } };
  }
  return { steps, dots, status, location, listeners, docListeners, target };
}

test('opens a valid shared step hash and updates accessible progress', () => {
  const app = load('#faq');
  assert.equal(app.steps[6].hidden, false);
  assert.equal(app.steps.filter(step => !step.hidden).length, 1);
  assert.equal(app.dots[6].attrs['aria-current'], 'step');
  assert.equal(app.status.textContent, 'Step 7 of 7');
});

test('invalid hash safely resolves to welcome', () => {
  const app = load('#not-a-step');
  assert.equal(app.location.hash, '#welcome');
  assert.equal(app.steps[0].hidden, false);
  assert.equal(app.steps[0].back.disabled, true);
});

test('next, back, skip, restart, and keyboard navigation change steps', () => {
  const app = load('#welcome');
  app.listeners.click({ target: app.target('[data-next]') });
  assert.equal(app.location.hash, '#hub');
  app.listeners.click({ target: app.target('[data-back]') });
  assert.equal(app.location.hash, '#welcome');
  app.listeners.click({ target: app.target('[data-skip]') });
  assert.equal(app.location.hash, '#faq');
  app.listeners.click({ target: app.target('[data-restart]') });
  assert.equal(app.location.hash, '#welcome');
  app.docListeners.keydown({ target: { closest: () => null }, key: 'ArrowRight', preventDefault() {} });
  assert.equal(app.location.hash, '#hub');
  app.docListeners.keydown({ target: { closest: () => null }, key: 'Escape', preventDefault() {} });
  assert.equal(app.location.hash, '#faq');
});

test('every step navigation resets the active preview and guide panels independently', () => {
  const app = load('#welcome');
  for (let index = 1; index < app.steps.length; index += 1) {
    app.steps[index].preview.scrollTop = 120 + index;
    app.steps[index].guide.scrollTop = 240 + index;
    app.listeners.click({ target: app.target('[data-next]') });
    assert.equal(app.steps[index].preview.scrollTop, 0);
    assert.equal(app.steps[index].guide.scrollTop, 0);
  }

  app.steps[0].preview.scrollTop = 360;
  app.steps[0].guide.scrollTop = 480;
  app.listeners.click({ target: app.target('[data-restart]') });
  assert.equal(app.steps[0].preview.scrollTop, 0);
  assert.equal(app.steps[0].guide.scrollTop, 0);

  app.steps[3].preview.scrollTop = 600;
  app.steps[3].guide.scrollTop = 720;
  app.location.hash = '#outputs';
  app.listeners.hashchange();
  assert.equal(app.steps[3].preview.scrollTop, 0);
  assert.equal(app.steps[3].guide.scrollTop, 0);
});

test('destination preview accordions reset before the step becomes visible', () => {
  const app = load('#welcome');
  const destination = app.steps[1];
  destination.details.open = true;
  destination.details.attrs.open = '';
  destination.accordion.attrs['aria-expanded'] = 'true';
  destination.accordion.classes.add('expanded');
  destination.accordion.classes.add('is-open');
  destination.panel.hidden = false;

  let resetBeforeReveal = false;
  Object.defineProperty(destination, 'hidden', {
    configurable: true,
    set(value) {
      if (!value) {
        resetBeforeReveal = !destination.details.open &&
          destination.accordion.attrs['aria-expanded'] === 'false' &&
          destination.accordion.classes.size === 0 &&
          destination.panel.hidden;
      }
    }
  });
  app.listeners.click({ target: app.target('[data-next]') });

  assert.equal(resetBeforeReveal, true);
  assert.equal(destination.details.attrs.open, undefined);
});

test('arrow keys do not override interactive controls', () => {
  const app = load('#welcome');
  app.docListeners.keydown({ target: { closest: () => ({}) }, key: 'ArrowRight', preventDefault() { throw Error('should not prevent'); } });
  assert.equal(app.location.hash, '#welcome');
});

test('step one mounts the shared homepage entrance as an interactive preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /data-home-entrance-preview/);
    assert.match(html, /home-entrance-preview\.js/);
    assert.doesNotMatch(html, /class="entrance-map"/);
    assert.match(html, /class="preview-guidance"/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('\.hero-inner > div:first-child'\)/);
  assert.match(previewSource, /className = 'home-entrance-preview-content light-preview'/);
  assert.match(previewSource, /researchProfile = entrance\.querySelector\('details'\)/);
  assert.match(previewSource, /content\.appendChild\(researchProfile\.cloneNode\(true\)\)/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /setAttribute\('rel', 'noopener noreferrer'\)/);
  assert.match(previewSource, /philosophyLink\.classList\.add\('intro-philosophy-link'\)/);
  assert.match(previewSource, /disabled\.disabled = true/);
  assert.match(previewSource, /setAttribute\('aria-disabled', 'true'\)/);
  assert.doesNotMatch(previewSource, /iframe/i);
  assert.match(styles, /\.home-entrance-preview-content\.light-preview\s*\{[^}]*color-scheme:\s*light;/s);
  assert.match(styles, /\.light-preview \.guide-marker\.preview-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.96\);[^}]*color:\s*#1f2937 !important;/s);
  assert.match(styles, /\.light-preview \.intro-philosophy-link\s*\{[^}]*border:\s*1px solid #cbd5e1;[^}]*background:\s*rgba\(255,255,255,\.96\) !important;[^}]*color:\s*#1f2937 !important;/s);
  assert.match(styles, /\.light-preview \.intro-philosophy-link:focus-visible\s*\{[^}]*outline:\s*3px solid #2563eb;/s);
  assert.match(styles, /\.light-preview \.preview-orientation-control\s*\{[^}]*background:\s*#f1f5f9;[^}]*color:\s*#475569;/s);
});

test('step two mounts the shared homepage Research Hub as an interactive light preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /data-home-hub-preview/);
    assert.match(html, /class="hub-overview orientation-preview--light"/);
    assert.match(html, /class="preview-guidance"/);
    assert.match(html, /class="hub-members-path"[^>]*>.*<a href="members\.html" target="_blank" rel="noopener noreferrer">/);
    assert.doesNotMatch(html, /class="hub-logo-grid"/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('\.profile-card'\)/);
  assert.match(previewSource, /content\.classList\.add\('hub-preview-content', 'light-preview'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-hub-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /className = 'research-hub-preview-stage'/);
  assert.match(previewSource, /scale = Math\.min\(1, availableWidth \/ naturalWidth\)/);
  assert.match(previewSource, /stageSizer\.style\.height = \(content\.offsetHeight \* scale\)/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-architect'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-profiles'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-assistant'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-explore'/);
  assert.match(styles, /\.research-hub-preview-stage\s*\{[^}]*width:\s*430px;[^}]*transform:\s*scale\(var\(--hub-preview-scale, 1\)\);[^}]*transform-origin:\s*top left;/s);
  assert.match(styles, /\.hub-preview-content\s*\{[^}]*padding:\s*14px;[^}]*border-radius:\s*16px;[^}]*background:\s*rgba\(255,255,255,\.72\);/s);
  assert.match(styles, /\.hub-preview-markers \.guide-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.96\);[^}]*color:\s*#1f2937 !important;/s);
  assert.doesNotMatch(styles, /\.hub-preview-content \.research-identifiers[^}]*padding-right/);
  assert.doesNotMatch(styles, /\.hub-preview-content \.preview-link[^}]*box-shadow/);
  assert.match(styles, /\.orientation-preview--light\s*\{[^}]*color-scheme:\s*light;[^}]*--card-color:\s*#ffffff;[^}]*--text:\s*#111827;/s);
  assert.match(styles, /\.orientation-preview--light \.hub-preview-content img\s*\{[^}]*filter:\s*none !important;[^}]*opacity:\s*1 !important;/s);
  assert.match(styles, /\.orientation-preview--light \.hub-preview-content \.assistant-button:hover\s*\{[^}]*border-color:\s*transparent !important;[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s);
  assert.match(styles, /\.hub-preview-content \.preview-link:focus-visible\s*\{[^}]*outline:\s*3px solid #155ed0;/s);
});

test('steps one and two match every preview pin with a right-panel guide label', () => {
  const labels = [
    ['Start Here', 'ここからスタート'],
    ['Research Philosophy', '研究哲学'],
    ['Begin the Tour', 'ツアーを始める'],
    ['Concept Architect', 'Concept Architect'],
    ['Research Profiles', '研究プロフィール'],
    ['Assistant GPT🤖', 'Assistant GPT🤖'],
    ['Explore the Hub', 'ハブを探索']
  ];

  for (const [englishLabel, japaneseLabel] of labels) {
    assert.match(english, new RegExp(`<(?:h3|dt)(?: [^>]*)?>📍 ${englishLabel}</(?:h3|dt)>`));
    assert.match(japanese, new RegExp(`<(?:h3|dt)(?: [^>]*)?>📍 ${japaneseLabel}</(?:h3|dt)>`));
  }
  assert.match(styles, /#welcome \.callout section\s*\{[^}]*border-left:\s*2px solid rgba\(244,114,182,\.65\);/s);
  assert.match(styles, /\.hub-guide div\s*\{[^}]*border-left:\s*2px solid rgba\(244,114,182,\.65\);/s);
});

test('step three mounts only the shared homepage Projects and Method research map', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /id="workflow"[^>]*data-step/);
    assert.match(html, /data-home-research-preview/);
    assert.match(html, /class="research-map-overview orientation-preview--light"/);
    assert.doesNotMatch(html, /<div class="visual visual-flow"/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('#projects'\)/);
  assert.match(previewSource, /source\.querySelector\('#method'\)/);
  assert.match(previewSource, /clone\.removeAttribute\('id'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-research-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /setAttribute\('rel', 'noopener noreferrer'\)/);
  assert.match(previewSource, /addMarker\(headings\[0\], 'research-marker research-marker-projects'/);
  assert.match(previewSource, /addMarker\(headings\[1\], 'research-marker research-marker-method'/);
  assert.match(styles, /\.research-map-preview-stage\s*\{[^}]*width:\s*980px;[^}]*transform:\s*scale\(var\(--research-preview-scale, 1\)\);[^}]*transform-origin:\s*top left;/s);
  assert.match(styles, /\.research-map-preview-content \.cards\s*\{[^}]*grid-template-columns:\s*repeat\(4, 1fr\);/s);
  assert.match(styles, /\.research-map-preview-content \.card\s*\{[^}]*min-height:\s*132px;[^}]*padding:\s*14px 14px 12px;/s);
  assert.match(styles, /\.research-map-preview-content \.guide-marker\.research-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.97\);[^}]*color:\s*#1f2937 !important;/s);
});


test('step four mounts the shared homepage Outputs archive as a live light preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /id="outputs"[^>]*data-step/);
    assert.match(html, /data-home-outputs-preview/);
    assert.match(html, /class="outputs-overview orientation-preview--light"/);
    assert.equal((html.match(/id="outputs"/g) || []).length, 1);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('#outputs'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-outputs-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /zenodo_records\.json/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /noopener noreferrer/);
  assert.match(previewSource, /content\.querySelector\('summary a\[href\*="cosmic-phase"\]'\)/);
  assert.match(previewSource, /media = document\.createElement\('span'\)/);
  assert.match(previewSource, /media\.classList\.add\('preview-disabled-media'\)/);
  assert.match(previewSource, /media\.setAttribute\('aria-disabled', 'true'\)/);
  assert.match(previewSource, /Available on the main site/);
  assert.match(styles, /\.outputs-preview-content \.preview-disabled-media\s*\{[^}]*cursor:\s*default;/s);
  assert.match(englishHome, /href="[^"]*Structure Art Viewer-cosmic-phase\.html"[^>]*target="_blank"/);
  assert.match(japaneseHome, /href="[^"]*Structure Art Viewer-cosmic-phase\.html"[^>]*target="_blank"/);
  assert.match(previewSource, /archiveMarkerRow\.className = 'outputs-archive-marker-row'/);
  assert.match(previewSource, /summary\.querySelector\('\.outputs-heading'\)\.after\(archiveMarkerRow\)/);
  assert.doesNotMatch(previewSource, /addMarker\(paper\.closest\('li'\), 'outputs-marker outputs-marker-archive'/);
  assert.match(previewSource, /categoriesMarkerRow\.className = 'outputs-categories-marker-row'/);
  assert.match(previewSource, /firstCategory\.before\(categoriesMarkerRow\)/);
  assert.doesNotMatch(previewSource, /addMarker\(headings\[1\], 'outputs-marker outputs-marker-categories'/);
  assert.match(styles, /\.outputs-preview-stage\s*\{[^}]*width:\s*980px;[^}]*transform:\s*scale\(var\(--outputs-preview-scale, 1\)\)/s);
  assert.match(styles, /\.outputs-preview-content \.guide-marker\.outputs-marker-archive\s*\{[^}]*position:\s*static;[^}]*display:\s*inline-flex;/s);
  assert.match(styles, /\.outputs-categories-marker-row\s*\{[^}]*justify-content:\s*flex-end;[^}]*min-height:\s*32px;/s);
  assert.match(styles, /\.outputs-preview-content \.guide-marker\.outputs-marker-categories\s*\{[^}]*position:\s*static;[^}]*display:\s*inline-flex;/s);
  assert.match(styles, /\.outputs-preview-content \.fold-body\s*\{[^}]*background:\s*#fff !important;[^}]*background-image:\s*none !important;[^}]*color:\s*#111827 !important;/s);
  assert.match(styles, /\[data-theme="dark"\] \.orientation-preview--light \.outputs-preview-content details\.fold\s*\{[^}]*background:\s*#fff !important;[^}]*background-image:\s*none !important;/s);
  assert.match(styles, /\[data-theme="dark"\] \.orientation-preview--light \.outputs-preview-content \.outputs-grid li\s*\{[^}]*background:\s*#fff !important;[^}]*background-image:\s*none !important;[^}]*color:\s*#111827 !important;/s);
  assert.match(styles, /#outputs \.outputs-callout/);
});

test('step five mounts the shared homepage Contact section as a live light preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /id="contact"[^>]*data-step/);
    assert.match(html, /data-home-contact-preview/);
    assert.match(html, /class="contact-overview orientation-preview--light"/);
    assert.match(html, /Next: Ideas &amp; Conversations|次へ：アイデアと対話/);
    assert.doesNotMatch(html, /id="zenodo"[^>]*data-step/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('#collab'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-contact-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /languageFlags\.classList\.add\('language-flags'\)/);
  assert.match(previewSource, /images\/twemoji\/.*flag\[1\].*\.svg/);
  assert.equal((previewSource.match(/'1f1[a-f0-9]{2}-1f1[a-f0-9]{2}'/g) || []).length, 9);
  assert.match(previewSource, /addMarker\(policy \|\| content, 'contact-marker contact-marker-policy'/);
  assert.match(previewSource, /'contact-marker contact-marker-style'/);
  assert.match(previewSource, /'contact-marker contact-marker-language'/);
  assert.match(previewSource, /'contact-marker contact-marker-email'/);
  assert.match(styles, /\.contact-preview-stage\s*\{[^}]*width:\s*760px;[^}]*transform:\s*scale\(var\(--contact-preview-scale, 1\)\)/s);
  assert.match(styles, /\.contact-preview-content \.language-flags img\.emoji\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/s);
  assert.match(styles, /\.contact-preview-content \.guide-marker\.contact-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.97\);[^}]*color:\s*#1f2937 !important;/s);
  assert.match(styles, /#contact \.contact-callout/);
});


test('step six mounts only the homepage Essays and Great Minds areas as a live light preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /id="ideas"[^>]*data-step/);
    assert.match(html, /data-home-ideas-preview/);
    assert.match(html, /class="ideas-overview orientation-preview--light"/);
    assert.match(html, /Next: Research FAQ|次へ：研究FAQ/);
    assert.equal((html.match(/<article class="tour-step"/g) || []).length, 7);
    assert.doesNotMatch(html, /id="explore"[^>]*data-step/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('#essays'\)/);
  assert.match(previewSource, /source\.querySelector\('#great-minds'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-ideas-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /clone\.querySelectorAll\('\[id\]'\).*removeAttribute\('id'\)/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /setAttribute\('rel', 'noopener noreferrer'\)/);
  assert.match(previewSource, /href === '#'/);
  assert.match(previewSource, /'ideas-marker ideas-marker-heading'/);
  assert.match(previewSource, /'ideas-marker ideas-marker-control'/);
  assert.match(styles, /\.ideas-preview-stage\s*\{[^}]*width:\s*760px;[^}]*transform:\s*scale\(var\(--ideas-preview-scale, 1\)\)/s);
  assert.match(styles, /\.ideas-preview-section details\.fold\s*\{[^}]*background:\s*#fff !important;[^}]*color:\s*#111827 !important;/s);
  assert.match(styles, /\[data-theme="dark"\] \.orientation-preview--light \.ideas-preview-content/);
  assert.match(styles, /\.ideas-preview-section \.outputs-grid a:focus-visible\s*\{[^}]*outline:\s*3px solid #155ed0;/s);
  assert.match(styles, /#ideas \.ideas-callout/);
});


test('step seven mounts the complete homepage FAQ and concludes the tour', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /id="faq"[^>]*data-step/);
    assert.match(html, /class="faq-overview orientation-preview--light"/);
    assert.match(html, /data-home-faq-preview/);
    assert.match(html, /class="callout faq-callout"/);
    assert.equal((html.match(/data-status/g) || []).length, 1);
    assert.doesNotMatch(html, /STEP 7 OF 7/i);
    assert.match(html, /class="tour-button tour-finish" href="\/"/);
    assert.doesNotMatch(html, /tour-finish[^>]*target=/);
  }
  assert.match(english, /Still have questions\?/);
  assert.match(english, /You’re ready to explore:/);
  const questions = [
    'Is this a business activity?', 'Are the conclusions final?',
    'Is this established theory?', 'Can I cite or examine this as research material?',
    'Why emphasize “Matsuoka × GPT”?', 'Do you work across any domain?'
  ];
  questions.forEach(question => assert.match(englishHome, new RegExp(question.replace(/[?]/g, '\\?'))));
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('#faq'\)/);
  assert.match(previewSource, /source\.querySelector\('footer'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-faq-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /faqClone\.querySelectorAll\('\[id\]'\).*removeAttribute\('id'\)/);
  assert.match(previewSource, /'faq-marker-philosophy'/);
  assert.match(previewSource, /'faq-marker-verification'/);
  assert.match(previewSource, /'faq-marker-collaboration'/);
  assert.match(previewSource, /'faq-marker-scope'/);
  assert.match(previewSource, /'faq-marker faq-marker-complete'/);
  assert.match(styles, /\.faq-preview-stage\s*\{[^}]*width:\s*760px;[^}]*transform:\s*scale\(var\(--faq-preview-scale, 1\)\)/s);
  assert.match(styles, /\.faq-preview-content \.two\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(styles, /\.faq-marker-row\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /#faq \.faq-callout/);
  assert.match(source, /skip\.hidden = current === steps\.length - 1/);
});
