# ChatMark — Bookmarks for Google Chat™

ChatMark 是獨立開發、適用於 Chrome 116+ 的非官方收藏擴充功能，協助你在 Google Chat 獨立網站與 Gmail 內嵌 Chat 收藏、整理及重新找到重要訊息。

[ChatMark 官網與使用說明](https://chat-mark.josui.space/) · [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/ldnpokbaolfcnjbpgckmigahjcckmeob) · [問題回報](https://github.com/FeiFeiSeal/google-chat-bookmark/issues)

目前專案版本為 **0.2.0**。

本擴充功能並非由 Google 提供、贊助或背書。Google Chat 和 Gmail 是 Google LLC 的商標。

## 功能與使用方式

- **右鍵收藏訊息**：在聊天室或一對一對話的訊息上按右鍵，選擇快速收藏到「未分類」，或直接指定分類。預設標題取自被收藏的訊息；同一討論串中的不同訊息可分別收藏。
- **在側欄整理**：點擊 Chrome 工具列的 ChatMark 圖示開啟側欄。可搜尋標題、筆記或分類，編輯標題與筆記、置頂常用收藏，以及拖曳調整順序或移動分類。
- **設定分類顏色**：從一般分類的「⋯ → 編輯分類」修改名稱、整張卡片的背景色與文字色，可預覽、使用選色器或六位 HEX 色碼，也能恢復預設顏色。「未分類」維持預設外觀。
- **返回原訊息**：點擊收藏標題，會在目前側欄所屬的同一分頁開啟訊息。獨立 Google Chat 使用頁面內切換；Gmail 沿用原本的訊息跳轉方式。
- **重新查看說明**：在工具列對 ChatMark 圖示按右鍵，或從側欄最下方，點選「ChatMark 官網與使用說明」，即可在新分頁開啟官網。
- **備份與復原**：剛收藏或刪除後可依提示復原；側欄的「診斷與備份」可下載整份收藏庫 JSON，或從完整備份還原。還原會取代目前收藏庫。

## 支援範圍與資料保存

支援 `https://chat.google.com/` 及 `https://mail.google.com/` 內嵌的 Google Chat，兩個網站共用目前 Chrome 使用者設定檔（Profile）的收藏庫。側欄只在這兩個網站可用，開啟收藏時沿用目前分頁的 Google 帳號；使用者仍需有權查看原對話。

收藏與分類保存在 `chrome.storage.local`，不會自動跨 Profile 或跨裝置同步。完整備份會保留分類顏色等設定；目前不提供選擇分類分享或合併匯入。產品不連接開發者後端、不收集遙測，也不自動上傳收藏內容。不支援無痕模式。

隱私權政策：[繁體中文](https://chat-mark.josui.space/privacy.html) · [English](https://chat-mark.josui.space/privacy-en.html)。

## 建置與安裝測試版

```bash
npm install
npm run build
```

建置結果位於 `dist/`。在 Chrome 載入未封裝項目：

1. 將專案保留在固定資料夾，往後更新也使用同一路徑。
2. 開啟 `chrome://extensions`，啟用「開發人員模式」。
3. 選擇「載入未封裝項目」，選取本專案的 `dist/` 資料夾。
4. 重新整理已開啟的 Gmail 或 Google Chat 分頁。

### 更新既有測試版

1. 先從側欄的「診斷與備份」下載完整備份。
2. 在原本固定的專案資料夾更新檔案，再執行 `npm install`、`npm run build`。
3. 回到 `chrome://extensions`，在同一個擴充功能卡片按「重新載入」。
4. 重新整理 Gmail 或 Google Chat，確認既有收藏仍存在。

不要以移除後重裝作為一般更新方式：移除擴充功能會清除該 Extension ID 的本機資料。從不同資料夾載入，也可能被 Chrome 視為另一個擴充功能。

### 產出同事測試 ZIP

```bash
npm run package:test
```

腳本會建立最新 production build、核對套件與 manifest 版號、檢查 ZIP 完整性，並輸出：

```text
releases/google-chat-bookmark-v<版本>-test-<日期>.zip
```

同一天重跑會覆蓋相同檔名，ZIP 不會包含上次建置遺留的 hashed assets。需要指定檔名日期時：

```bash
RELEASE_DATE=2026-11-13 npm run package:test
```

測試者解壓後，在 `chrome://extensions` 選擇「載入未封裝項目」，指定內含 `manifest.json` 的資料夾。收到新版時，繼續覆蓋同一資料夾並重新載入。

## 開發與驗證

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Google Chat 的 DOM 擷取、訊息定位、帳號與擴充功能更新行為仍需實機驗證，進度見 [人工驗收清單](docs/manual-test-checklist.md)。

執行 `npm run dev` 後，可開啟 `/tests/fixtures/sidepanel-layout.html` 預覽側欄。頁面提供 Demo data、Worst case、Empty、One 與 1,000 rows，供驗證長標題、長分類、置頂及窄側欄。預覽使用獨立記憶體資料，不連接 Chrome 收藏庫，正式擴充功能不包含此頁。
