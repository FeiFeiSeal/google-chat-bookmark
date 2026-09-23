# 核心驗證擴充功能（不是正式產品）

## 安裝與驗證

1. Chrome 開啟 `chrome://extensions`，開啟「開發人員模式」。
2. 「載入未封裝項目」，選擇這個 `probe` 資料夾。
3. 重新整理 Gmail（先保留未送出的草稿）。
4. 在 Gmail Chat 的訊息文字上按右鍵，選「驗證：收藏此討論到 Bookmark」。
5. 點 Chrome 擴充功能圖示，開啟「Chat Bookmark — 核心驗證」；成功時會看到三個識別碼。
6. 用同一訊息的 Google「更多動作 → 複製訊息連結」，貼進測試視窗比對。
7. 先在 Gmail 切到 Chat 首頁，再點測試視窗的「在原 Gmail 分頁跳回討論」。
8. 分別測試主訊息、串內回覆，以及空白區；主訊息與回覆應有相同 threadId、不同 messageId；空白區必須拒絕擷取。

## 範圍與限制

- 僅使用 `contextMenus`、`storage`、`activeTab`，content script 限 `https://chat.google.com/*`，包含 Gmail 內的跨網域 iframe。
- 只讀右鍵選中訊息 DOM 的識別碼，不讀文字、附件、Cookie、帳號憑證，不呼叫外部 API。
- `storage.session` 僅保留最近一次擷取結果。不是正式收藏儲存。
- DOM 的 `data-id`、`data-topic-id` 與 `jsdata` 是實測觀察到的內部格式，不是 Google 公開穩定 API；不符合就拒絕擷取。
- Gmail 深層連結已在一個既有聊天室的主討論串實測；其他帳號、DM、舊版聊天室尚未驗證。
- 安裝到真實 Chrome 前，原生右鍵事件→背景程序→連結跳轉的擴充功能流程仍屬待驗證。

執行純函式檢查：`node core.test.cjs`。
