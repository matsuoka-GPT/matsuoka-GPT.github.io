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

    var japanese = container.ownerDocument.documentElement.lang === 'ja';
    addMarker(content, 'hub-marker hub-marker-architect', '📍 Concept Architect');
    addMarker(content, 'hub-marker hub-marker-profiles', japanese ? '📍 研究プロフィール' : '📍 Research Profiles');
    addMarker(content, 'hub-marker hub-marker-assistant', '📍 Assistant GPT');
    addMarker(content, 'hub-marker hub-marker-explore', japanese ? '📍 ハブを探索' : '📍 Explore the Hub');
    container.replaceChildren(content);
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
        } else {
          buildPreview(container, source, homeUrl);
        }
      })
      .catch(function () { showError(container); });
  }

  document.querySelectorAll('[data-home-entrance-preview]').forEach(mount);
  document.querySelectorAll('[data-home-hub-preview]').forEach(mount);
}());
