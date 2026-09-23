const q = id => document.getElementById(id);
let probe;
async function load() {
  ({probe} = await chrome.storage.session.get('probe'));
  q('result').hidden = !probe?.links;
  q('open').disabled = q('compare').disabled = !probe?.links;
  if (!probe) {q('status').textContent = '請在訊息上按右鍵，選擇「驗證：收藏此討論到 Bookmark」。'; return;}
  if (probe.error) {q('status').textContent = probe.error; return;}
  q('status').textContent = '已從右鍵選中的訊息取得資料。請比對官方連結，再測試跳回。';
  q('result').textContent = `聊天室 ID：${probe.spaceId}\n討論串 ID：${probe.threadId}\n訊息 ID：${probe.messageId}\niframe：${probe.frameId}\n擷取時間：${probe.capturedAt}\n\n${probe.links.official}`;
}
q('compare').onclick = () => {
  try {
    const url = new URL(q('official').value.trim());
    const expected = new URL(probe.links.official);
    const equal = url.protocol === 'https:' && url.hostname === expected.hostname && url.pathname === expected.pathname;
    q('comparison').textContent = equal ? '一致：聊天室、討論串與訊息三個 ID 全部相同。' : '不一致：請確認複製的是剛剛右鍵選中的同一則訊息。';
  } catch { q('comparison').textContent = '請貼上 Google 複製的完整訊息連結。'; }
};
q('open').onclick = async () => {
  try {
    const tab = await chrome.tabs.get(probe.tabId);
    const url = new URL(tab.url || '');
    if (url.protocol !== 'https:' || url.hostname !== 'mail.google.com') throw new Error('原分頁已離開 Gmail，請先在原分頁開啟 Gmail，再重試。');
    await chrome.tabs.update(probe.tabId, {url: probe.links.gmail, active: true});
    window.close();
  } catch (e) { q('status').textContent = e.message; }
};
q('clear').onclick = async () => {await chrome.storage.session.remove('probe');q('comparison').textContent='';q('official').value='';await load();};
load();
