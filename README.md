# ChatMark — Bookmarks for Google Chat™

ChatMark 是獨立開發、適用於 Chrome 116+ 的非官方收藏擴充功能。它讓你在 Gmail 內嵌 Google Chat 的聊天室或一對一訊息上按右鍵快速收藏到未分類或直接指定分類，並從 Gmail Side Panel 返回當時選中的訊息。

本擴充功能並非由 Google 提供、贊助或背書。Google Chat 和 Gmail 是 Google LLC 的商標，其使用受 Google Permissions 規範約束。

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

## 側欄版面預覽

執行 `npm run dev` 後，在開發伺服器開啟 `/tests/fixtures/sidepanel-layout.html`。
底部可切換 Demo data、Worst case、Empty、One 與 1,000 rows，驗證長標題、長分類、置頂及窄側欄。
預覽使用獨立記憶體資料，不連接 Chrome 收藏庫；正式擴充功能不包含此頁。

## 介紹網站、隱私權政策與 GitHub Pages

網站首頁提供[繁體中文介紹](site/index.html)與[英文介紹](site/index-en.html)，說明功能、目前支援範圍、本機儲存及非官方身分，並連到專案安裝說明與隱私政策。

政策頁提供[繁體中文](site/privacy.html)與[英文](site/privacy-en.html)，頁首可切換語言。兩個版本使用獨立靜態 HTML／CSS，不需要安裝套件或建置。聯絡管道為此專案的 GitHub Issues；發布前確認 Issues 已啟用，且一般使用者可存取。

本機預覽：

```bash
python3 -m http.server 4173 --directory site --bind 127.0.0.1
```

首頁為 `http://127.0.0.1:4173/`，英文首頁為 `http://127.0.0.1:4173/index-en.html`。政策頁為 `http://127.0.0.1:4173/privacy.html`；英文版為 `http://127.0.0.1:4173/privacy-en.html`。

首次發布：

1. 在 GitHub repository 的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。確認 repository 的可見性與 GitHub 方案支援 Pages。
2. 將 `site/` 與 `.github/workflows/pages.yml` 的變更依專案流程合併並推送至 `main`。
3. 在 **Actions** 確認「Deploy privacy policy to GitHub Pages」執行成功。若設定 Pages 前已推送，可選擇 `main` 手動執行此 workflow。
4. 未設定自訂網域時，預期中文政策網址為 `https://feifeiseal.github.io/google-chat-bookmark/privacy.html`，英文版為 `https://feifeiseal.github.io/google-chat-bookmark/privacy-en.html`。以未登入的瀏覽器確認可公開讀取後，再將選用語言的網址填入 Chrome Web Store 的隱私政策網址欄位。

Workflow 只發布 `site/`，不包含 `docs/`、擴充功能 `dist/` 或原始碼。後續 `main` 上的網站或 workflow 變更會自動觸發部署。更新資料處理方式時，請同步修改中英文政策內容、最後更新日期及商店申報。
