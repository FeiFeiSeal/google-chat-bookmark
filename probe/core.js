(function (root) {
  const idPattern = /^[A-Za-z0-9_-]+$/;
  function parseMessageData(value, messageId, topicId) {
    // Observed DOM attribute only. Fail closed if Google changes its format.
    const match = /^ykVKge;([A-Za-z0-9_-]+),([A-Za-z0-9_-]+),space\/([A-Za-z0-9_-]+);/.exec(value || '');
    if (!match || match[1] !== messageId || match[2] !== topicId) return null;
    return {messageId: match[1], threadId: match[2], spaceId: match[3]};
  }
  function buildLinks(record, sourceUrl) {
    if (!['messageId', 'threadId', 'spaceId'].every(k => idPattern.test(record[k] || ''))) throw new Error('識別碼格式無效');
    const source = new URL(sourceUrl);
    if (source.protocol !== 'https:' || !['mail.google.com', 'chat.google.com'].includes(source.hostname)) throw new Error('來源不是 Gmail / Google Chat');
    const account = /\/u\/(\d+)\//.exec(source.pathname)?.[1] || '0';
    const suffix = `${record.spaceId}/${record.threadId}/${record.messageId}`;
    return {
      official: `https://chat.google.com/room/${suffix}?cls=10`,
      gmail: `https://mail.google.com/mail/u/${account}/#chat/space/${suffix}`,
      key: `${record.spaceId}/${record.threadId}`
    };
  }
  root.ChatBookmarkProbe = {parseMessageData, buildLinks};
  if (typeof module !== 'undefined') module.exports = root.ChatBookmarkProbe;
})(globalThis);
