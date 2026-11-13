/* global document, HTMLDialogElement, localStorage */
(() => {
  const dialog = document.querySelector('#release-dialog');
  const trigger = document.querySelector('[data-open-release]');
  if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== 'function' || !trigger) return;

  const version = dialog.dataset.version;
  const storageKey = 'chatmark:seen-release';
  let seenVersion;
  try { seenVersion = localStorage.getItem(storageKey); } catch { /* The notice still works when storage is unavailable. */ }

  const remember = () => {
    try { localStorage.setItem(storageKey, version); } catch { /* Closing must always remain possible. */ }
  };
  dialog.addEventListener('close', () => {
    remember();
    document.documentElement.classList.remove('release-open');
  });
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add('release-open');
  };
  dialog.querySelector('[data-release-guide]')?.addEventListener('click', () => {
    remember();
    dialog.close();
  });
  trigger.hidden = false;
  trigger.addEventListener('click', open);
  if (seenVersion !== version) open();
})();
