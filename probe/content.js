(() => {
  let last = null;
  document.addEventListener('contextmenu', event => {
    last = null;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const message = target?.closest('[data-id][data-message-multiplat-item-id]');
    const thread = message?.closest('[data-topic-id]');
    if (!message || !thread) return;
    const record = ChatBookmarkProbe.parseMessageData(message.getAttribute('jsdata'), message.getAttribute('data-id'), thread.getAttribute('data-topic-id'));
    if (record) last = {record, at: Date.now()};
    // Do not suppress Google's own menu or modify the message.
  }, true);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'probe.readContext') return;
    const captured = last;
    last = null;
    respond(captured && Date.now() - captured.at < 120000 ? captured : {error: '請在訊息文字上按右鍵；空白區或輸入框不會擷取收藏。'});
  });
})();
