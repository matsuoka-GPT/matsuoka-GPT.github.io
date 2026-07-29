(function () {
  'use strict';

  function absoluteUrl(value, base) {
    return new URL(value, base).href;
  }

  function addMarker(container, className, text) {
    var marker = document.createElement('span');
    marker.className = 'guide-marker preview-marker ' + className;
    marker.textContent = text;
    marker.setAttribute('aria-hidden', 'true');
    container.appendChild(marker);
  }

  function buildPreview(container, source, homeUrl) {
    var entrance = source.querySelector('.hero-inner > div:first-child');
    if (!entrance) throw new Error('Homepage entrance was not found');

    var content = document.createElement('div');
    content.className = 'home-entrance-preview-content light-preview';
    ['.title-row', '.lead'].forEach(function (selector) {
      var item = entrance.querySelector(selector);
      if (item) content.appendChild(item.cloneNode(true));
    });

    // Keep this section tied to the homepage source rather than maintaining a
    // second Orientation-specific copy. cloneNode(true) is intentional: the
    // complete expanded content (and any links added later) must remain live.
    var researchProfile = entrance.querySelector('details');
    if (!researchProfile) throw new Error('Homepage Research Profile was not found');
    content.appendChild(researchProfile.cloneNode(true));

    content.querySelectorAll('[src]').forEach(function (element) {
      element.setAttribute('src', absoluteUrl(element.getAttribute('src'), homeUrl));
    });
    content.querySelectorAll('a[href]').forEach(function (link) {
      link.setAttribute('href', absoluteUrl(link.getAttribute('href'), homeUrl));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.classList.add('preview-link');
    });

    var philosophyLink = content.querySelector('.title-row a[href*="/essays/welcome-"]');
    if (philosophyLink) philosophyLink.classList.add('intro-philosophy-link');

    var orientationLink = content.querySelector('.orientation-entry a');
    if (orientationLink) {
      var disabled = document.createElement('button');
      disabled.type = 'button';
      disabled.className = 'preview-orientation-control';
      disabled.disabled = true;
      disabled.setAttribute('aria-disabled', 'true');
      disabled.textContent = '◇ ' + container.dataset.orientationLabel;
      orientationLink.replaceWith(disabled);
    }

    var japanese = container.ownerDocument.documentElement.lang === 'ja';
    addMarker(content, 'preview-marker-start', japanese ? '📍 ここからスタート' : '📍 Start Here');
    addMarker(content, 'preview-marker-philosophy', japanese ? '📍 研究哲学' : '📍 Research Philosophy');
    addMarker(content, 'preview-marker-tour', japanese ? '📍 ツアーを始める' : '📍 Begin the Tour');
    container.replaceChildren(content);
    container.setAttribute('aria-busy', 'false');
  }

  function buildHubPreview(container, source, homeUrl) {
    var hub = source.querySelector('.profile-card');
    if (!hub) throw new Error('Homepage Research Hub was not found');

    // The homepage remains the single source for the hub's copy, destinations,
    // image alternatives, and expandable behavior. Only tour annotations are
    // added here.
    var content = hub.cloneNode(true);
    content.classList.add('hub-preview-content', 'light-preview');
    content.removeAttribute('aria-label');

    content.querySelectorAll('[src]').forEach(function (element) {
      element.setAttribute('src', absoluteUrl(element.getAttribute('src'), homeUrl));
    });
    content.querySelectorAll('a[href]').forEach(function (link) {
      link.setAttribute('href', absoluteUrl(link.getAttribute('href'), homeUrl));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.classList.add('preview-link');
    });

    var stage = document.createElement('div');
    stage.className = 'research-hub-preview-stage';
    stage.appendChild(content);

    var stageSizer = document.createElement('div');
    stageSizer.className = 'research-hub-preview-sizer';
    stageSizer.appendChild(stage);

    // Tour labels belong to the viewport rather than the scaled homepage card,
    // so they remain legible at every preview size.
    var markers = document.createElement('div');
    markers.className = 'hub-preview-markers';
    var japanese = container.ownerDocument.documentElement.lang === 'ja';
    addMarker(markers, 'hub-marker hub-marker-architect', '📍 Concept Architect');
    addMarker(markers, 'hub-marker hub-marker-profiles', japanese ? '📍 研究プロフィール' : '📍 Research Profiles');
    addMarker(markers, 'hub-marker hub-marker-assistant', '📍 Assistant GPT');
    addMarker(markers, 'hub-marker hub-marker-explore', japanese ? '📍 ハブを探索' : '📍 Explore the Hub');
    container.replaceChildren(stageSizer, markers);

    function sizeStage() {
      var availableWidth = stageSizer.clientWidth;
      var naturalWidth = stage.offsetWidth;
      var scale = Math.min(1, availableWidth / naturalWidth);
      stage.style.setProperty('--hub-preview-scale', scale);
      stageSizer.style.height = (content.offsetHeight * scale) + 'px';
    }
    sizeStage();
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(sizeStage);
      observer.observe(stageSizer);
      observer.observe(content);
    } else {
      window.addEventListener('resize', sizeStage);
    }
    container.setAttribute('aria-busy', 'false');
  }

  function buildResearchPreview(container, source, homeUrl) {
    var projects = source.querySelector('#projects');
    var method = source.querySelector('#method');
    if (!projects || !method) throw new Error('Homepage Projects or Method section was not found');

    var content = document.createElement('div');
    content.className = 'research-map-preview-content light-preview';
    [projects, method].forEach(function (section) {
      var clone = section.cloneNode(true);
      // The Orientation document owns its own navigation IDs. The homepage IDs
      // are intentionally omitted from the live copy to keep every ID unique.
      clone.removeAttribute('id');
      clone.classList.add('research-map-section');
      content.appendChild(clone);
    });

    content.querySelectorAll('[src]').forEach(function (element) {
      element.setAttribute('src', absoluteUrl(element.getAttribute('src'), homeUrl));
    });
    content.querySelectorAll('a[href]').forEach(function (link) {
      link.setAttribute('href', absoluteUrl(link.getAttribute('href'), homeUrl));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.classList.add('preview-link');
    });

    var headings = content.querySelectorAll('h2');
    var japanese = container.ownerDocument.documentElement.lang === 'ja';
    if (headings[0]) addMarker(headings[0], 'research-marker research-marker-projects', japanese ? '📍 プロジェクト' : '📍 Projects');
    if (headings[1]) addMarker(headings[1], 'research-marker research-marker-method', japanese ? '📍 方法論' : '📍 Method');

    var stage = document.createElement('div');
    stage.className = 'research-map-preview-stage';
    stage.appendChild(content);
    var sizer = document.createElement('div');
    sizer.className = 'research-map-preview-sizer';
    sizer.appendChild(stage);
    container.replaceChildren(sizer);

    function sizeStage() {
      var scale = Math.min(1, sizer.clientWidth / stage.offsetWidth);
      stage.style.setProperty('--research-preview-scale', scale);
      sizer.style.height = (content.offsetHeight * scale) + 'px';
    }
    sizeStage();
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(sizeStage);
      observer.observe(sizer);
      observer.observe(content);
    } else {
      window.addEventListener('resize', sizeStage);
    }
    container.setAttribute('aria-busy', 'false');
  }

  function buildOutputsPreview(container, source, homeUrl) {
    var outputs = source.querySelector('#outputs');
    if (!outputs) throw new Error('Homepage Outputs section was not found');

    var content = outputs.cloneNode(true);
    content.removeAttribute('id');
    content.className = 'outputs-preview-content light-preview';
    content.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
    content.querySelectorAll('[src]').forEach(function (element) {
      element.setAttribute('src', absoluteUrl(element.getAttribute('src'), homeUrl));
    });
    content.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === '#') {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        return;
      }
      link.setAttribute('href', absoluteUrl(href, homeUrl));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.classList.add('preview-link');
    });

    var summary = content.querySelector('[data-zenodo-summary]');
    if (summary) {
      var heading = document.createElement('div');
      heading.className = 'outputs-heading';
      heading.innerHTML = '<h2>' + summary.dataset.title + '</h2>';
      var dashboard = document.createElement('a');
      dashboard.className = 'analytics-link preview-link';
      dashboard.href = absoluteUrl('/zenodo-stats.html', homeUrl);
      dashboard.target = '_blank';
      dashboard.rel = 'noopener noreferrer';
      dashboard.textContent = 'Zenodo Analytics Dashboard ↗';
      heading.appendChild(dashboard);
      var stats = document.createElement('div');
      stats.className = 'outputs-stats';
      stats.setAttribute('aria-live', 'polite');
      stats.setAttribute('aria-label', summary.dataset.ariaLabel);
      [['records', summary.dataset.recordsLabel], ['views', summary.dataset.viewsLabel], ['downloads', summary.dataset.downloadsLabel]].forEach(function (item) {
        var card = document.createElement('div');
        card.className = 'output-stat';
        card.innerHTML = '<span>' + item[1] + '</span><strong data-zenodo-stat="' + item[0] + '">—</strong>';
        stats.appendChild(card);
      });
      summary.replaceChildren(heading, stats);
      fetch(absoluteUrl('/data/zenodo/zenodo_records.json', homeUrl)).then(function (response) {
        if (!response.ok) throw new Error('Zenodo summary request failed');
        return response.json();
      }).then(function (data) {
        var aggregate = data.totals || data.aggregate || data;
        ['records', 'views', 'downloads'].forEach(function (metric) {
          var target = stats.querySelector('[data-zenodo-stat="' + metric + '"]');
          if (target && Number.isFinite(aggregate[metric])) target.textContent = new Intl.NumberFormat(summary.dataset.locale || 'en-US').format(aggregate[metric]);
        });
      }).catch(function (error) { console.warn('Unable to load Zenodo statistics.', error); });
    }

    var japanese = container.ownerDocument.documentElement.lang === 'ja';
    var headings = content.querySelectorAll('.outputs-heading, details.fold');
    addMarker(content, 'outputs-marker outputs-marker-title', '📍 Outputs');
    if (headings[1]) addMarker(headings[1], 'outputs-marker outputs-marker-categories', japanese ? '📍 研究カテゴリー' : '📍 Research Categories');
    var analytics = content.querySelector('.analytics-link');
    if (analytics) addMarker(content, 'outputs-marker outputs-marker-analytics', japanese ? '📍 分析ダッシュボード' : '📍 Analytics Dashboard');
    var paper = content.querySelector('.outputs-grid a[href]');
    if (paper) addMarker(paper.closest('li'), 'outputs-marker outputs-marker-archive', japanese ? '📍 Zenodoアーカイブ' : '📍 Zenodo Archive');
    var media = content.querySelector('summary a[href*="cosmic-phase"]');
    if (media) addMarker(media.parentElement, 'outputs-marker outputs-marker-media', japanese ? '📍 研究メディア' : '📍 Research Media');

    var stage = document.createElement('div');
    stage.className = 'outputs-preview-stage';
    stage.appendChild(content);
    var sizer = document.createElement('div');
    sizer.className = 'outputs-preview-sizer';
    sizer.appendChild(stage);
    container.replaceChildren(sizer);

    function sizeStage() {
      var scale = Math.min(1, sizer.clientWidth / stage.offsetWidth);
      stage.style.setProperty('--outputs-preview-scale', scale);
      sizer.style.height = (content.offsetHeight * scale) + 'px';
    }
    sizeStage();
    content.addEventListener('toggle', sizeStage, true);
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(sizeStage);
      observer.observe(sizer);
      observer.observe(content);
    } else {
      window.addEventListener('resize', sizeStage);
    }
    container.setAttribute('aria-busy', 'false');
  }

  function showError(container) {
    var message = document.createElement('p');
    message.className = 'preview-error';
    message.textContent = document.documentElement.lang === 'ja'
      ? 'ライブプレビューを読み込めませんでした。上の「ラボホームへ戻る」リンクから入口をご覧ください。'
      : 'The live preview could not be loaded. Use the Back to Lab Home link above to visit the entrance.';
    container.replaceChildren(message);
    container.setAttribute('aria-busy', 'false');
  }

  function mount(container) {
    var homeUrl = absoluteUrl(container.dataset.homeUrl, document.baseURI);
    fetch(homeUrl)
      .then(function (response) {
        if (!response.ok) throw new Error('Homepage request failed');
        return response.text();
      })
      .then(function (html) {
        var source = new DOMParser().parseFromString(html, 'text/html');
        if (container.hasAttribute('data-home-hub-preview')) {
          buildHubPreview(container, source, homeUrl);
        } else if (container.hasAttribute('data-home-research-preview')) {
          buildResearchPreview(container, source, homeUrl);
        } else if (container.hasAttribute('data-home-outputs-preview')) {
          buildOutputsPreview(container, source, homeUrl);
        } else {
          buildPreview(container, source, homeUrl);
        }
      })
      .catch(function () { showError(container); });
  }

  document.querySelectorAll('[data-home-entrance-preview]').forEach(mount);
  document.querySelectorAll('[data-home-hub-preview]').forEach(mount);
  document.querySelectorAll('[data-home-research-preview]').forEach(mount);
  document.querySelectorAll('[data-home-outputs-preview]').forEach(mount);
}());
