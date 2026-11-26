(() => {
  const dialog = document.getElementById('lvtm-intro');
  const trigger = document.querySelector('.lvtm-intro-trigger');

  if (!trigger || typeof dialog?.showModal !== 'function') return;

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
