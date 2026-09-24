# Google Chat Bookmark

Google Chat Bookmark 是 Chrome 116+ 的本機測試版擴充功能。它讓你在 Gmail 內嵌 Google Chat 的訊息上按右鍵收藏討論，並從 Gmail Side Panel 返回當時選中的訊息。

## 建置

```bash
npm install
npm run build
```

建置結果位於 `dist/`。

## 產出同事測試 ZIP

執行：

```bash
npm run package:test
```

腳本會依序建立最新 production build、讀取 `dist/manifest.json` 的版本號、檢查 ZIP 完整性，並輸出：

```text
releases/google-chat-bookmark-v<版本>-test-<日期>.zip
```

同一天重跑會安全覆蓋相同檔名，不會把舊 build 的 hashed assets 留在 ZIP。若需要指定日期，可執行：

```bash
RELEASE_DATE=2026-09-30 npm run package:test
```

將 ZIP 傳給測試者；測試者解壓後，在 `chrome://extensions` 啟用「開發人員模式」，選取「載入未封裝項目」，再選擇內含 `manifest.json` 的解壓資料夾。

## 安裝未封裝測試版

1. 將整個專案固定放在 `~/Codes/google-chat-bookmark`，不要在更新時改用另一個資料夾。
2. 執行 `npm run build`。
3. 在 Chrome 開啟 `chrome://extensions`，啟用「開發人員模式」。
4. 選擇「載入未封裝項目」，選取 `~/Codes/google-chat-bookmark/dist`。
5. 重新整理已開啟的 Gmail 分頁。

擴充功能只支援 `mail.google.com` 內嵌的 Google Chat。資料保存在目前 Chrome Profile 的 `chrome.storage.local`，不會跨 Profile 或跨裝置同步。

## 更新

1. 更新前，先從 Side Panel 的「診斷與備份」下載完整備份。
2. 在原本固定的專案資料夾覆蓋程式並重新執行 `npm install`、`npm run build`。
3. 回到 `chrome://extensions`，在同一個擴充功能卡片按「重新載入」。
4. 重新整理 Gmail，確認原有 Bookmark 仍存在。

不要以「移除擴充功能再重新安裝」作為一般更新方式；移除擴充功能會讓 Chrome 清除該 Extension ID 的本機資料。也不要從新的資料夾載入另一份副本，因為 Chrome 可能把它視為不同的擴充功能。

## 開發檢查

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

完整人工驗收步驟見 [docs/manual-test-checklist.md](docs/manual-test-checklist.md)。
