## Why

Gmail 內嵌 Google Chat 缺少一個能以個人方式保存、重新找到並精準返回討論位置的入口；使用者常因忘記關鍵字而無法追回持續進行的 Thread。現有 probe 已驗證可從訊息取得必要 ID 並透過 Gmail deep link 返回指定 Message，現在需要把這項可行性驗證收斂成可安裝、可保存資料的最小產品流程。

## What Changes

- 新增 Gmail Chat 訊息右鍵收藏，保存 Thread 身份與選中 Message Anchor。
- 新增以 Thread 為單位的重複判斷；同一 Thread 只保留一筆 Bookmark，重複操作不得改寫既有資料。
- 新增最多 30 個使用者可見字元的自動標題，以及無法安全解析訊息時的失敗保護與不含對話文字的診斷資訊。
- 新增以 Chrome Profile 為邊界、具 schema version 的本機 Bookmark Library，並在擴充功能重新載入或升級後保留資料。
- 新增整庫診斷備份與安全還原，保護未封裝測試版的早期資料。
- 新增只在 `mail.google.com` 啟用的 Chrome Side Panel，顯示 Uncategorized Bookmark 單行標題並在同一 Gmail 分頁跳回 Message Anchor。
- 第一個 change 不包含 Category 管理、Note 編輯、搜尋、拖曳、置頂、同事分享格式、跨裝置同步、Chrome 原生書籤或遙測。

## Capabilities

### New Capabilities

- `chat-message-bookmarking`: 定義從 Gmail Chat 右鍵目標建立 Bookmark、自動標題、Thread 去重、成功／失敗回饋及診斷資料邊界。
- `local-bookmark-library`: 定義本機持久化、schema migration、重新載入後保留資料，以及整庫診斷備份與安全還原。
- `gmail-bookmark-navigation`: 定義 Gmail 專用 Side Panel 的清單呈現、作用分頁及精準返回 Message Anchor。

### Modified Capabilities

無。

## Impact

- 將從現有 `probe/` 擷取已驗證的 Google Chat ID parsing 與 Gmail deep-link 行為，建立正式的 Manifest V3 Chrome 擴充功能結構。
- 影響範圍包含 content script、service worker、Side Panel、Bookmark domain/repository、storage migration、診斷備份／還原與相對應測試。
- 需要 Chrome 116 以上，並需要 Gmail／Google Chat host access、context menu、storage 與 side panel 權限；不申請 Chrome bookmarks 權限。
- 資料只保存在目前 Chrome Profile，不連接產品後端、不提供跨裝置同步，也不支援無痕模式。
