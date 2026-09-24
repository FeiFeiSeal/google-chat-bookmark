## Context

目前 `Bookmark` 已包含 `categoryId`、`note` 與 `pinned`。為了允許同一討論串收藏不同訊息，直接查找 key 改為 `bookmark:<spaceId>:<threadId>:<messageId>`；Category 與 order 仍以 `category:<id>` 與 `order:<categoryId>` 分散保存，避免右鍵收藏為判斷重複而掃描整個 Library。

本變更橫跨 domain schema、repository、Undo、Side Panel 與搜尋，並需要讓 1,000 筆 Bookmark 下的 UI 保持可用。行為契約見三份 delta spec；本文件只描述實作選擇。

## Goals / Non-Goals

**Goals:**

- 讓所有已提交的 Category、Bookmark、順序與置頂異動經過單一 repository contract，保持索引與記錄一致。
- 讓側欄以同一份 Library snapshot 派生分類、置頂及搜尋畫面，避免兩份 Bookmark 資料分歧。
- 讓刪除與復原能精確恢復原位置，同時讓未儲存編輯內容在 panel 卸載時自然消失。
- 為後續 Bookmark Package 與 Chrome Sync 保留穩定的 Category／Bookmark ID 和 repository 邊界。

**Non-Goals:**

- 不實作 Bookmark Package、跨裝置同步、Chrome 原生書籤或多帳號資料分區。
- 不保存正在編輯、展開中的 Bookmark 詳細資訊、搜尋文字或 Undo snapshot 到完整備份。
- 不建立月份索引或月份篩選。
- 不為所有清單導入通用虛擬化框架；先以收合 Category 不渲染子項、分段 React component 與純函式搜尋達成 1,000 筆驗收。

## Decisions

### 1. 將 repository 擴成以意圖命名的原子操作

`BookmarkRepository` 增加 snapshot 查詢及下列 command 類型的公開方法：更新 Bookmark、建立／重新命名 Category、設定展開偏好、重排 Category、重排或移動 Bookmark、設定／重排置頂、刪除 Bookmark、刪除 Category、復原刪除，以及記錄最近開啟時間。UI 不直接組合 storage key 或自行修改 snapshot。

每個 command 在記憶體中先驗證完整候選狀態，再一次寫入所有新值。需要移除 key 時，第一個 `storage.local.set` 將完整新索引與被刪除記錄的 tombstone 一起寫入；後續 `remove` 只清理 tombstone，訂閱者忽略純清理事件。這讓其他 Side Panel instance 看見的第一個可用 snapshot 已是完整結果，也保留每筆 Bookmark 的直接查找 key。

替代方案是把整個 Library 改存單一 key；雖然寫入簡單，但會使每次重複收藏與小幅排序都讀寫完整 Library，並削弱未來拆分同步載體的邊界，因此不採用。

### 2. Storage schema 升為 version 3 並使用 Message 層級 key

搜尋同層級需要依最近開啟時間排序，因此 `Bookmark` 保留可選的 `lastOpenedAt`。version 2 → version 3 migration 依每筆既有 Bookmark 的 `messageId` 重建 storage key、Category order 與 pinned order，不改動 Bookmark 內容、Message Anchor、分類或顯示順序。導覽請求成功送到目標 Gmail tab 後才寫入 `lastOpenedAt`；記錄最近開啟屬於 metadata 異動，不建立使用者可見 Undo。

Category 展開 ID 使用獨立 preference key，不列入 `LibraryData` 或完整備份。Category 刪除時由同一 repository command 清掉對應 ID；復原 Category 時恢復刪除前是否展開。Bookmark 詳細資訊的展開狀態、搜尋字串與編輯草稿只留在 React state。

替代方案是用 `updatedAt` 排序搜尋結果，但編輯 Note 會錯誤地被當成最近開啟，無法符合行為規格。

### 3. 以正規化 snapshot 建立 Side Panel view model

repository 回傳包含 metadata、Categories、Bookmarks、各 Category order 與展開 preference 的 snapshot。Side Panel 先建立 `bookmarkByKey`、`categoryById` map，再派生：

- 置頂區：依 `pinnedOrder` 取得同一筆 Bookmark；不複製 domain record。
- Category 區：依 `categoryOrder` 顯示 Category，只為展開的 Category 建立 Bookmark row。
- 搜尋區：輸入非空時對 snapshot 執行純函式比對與排名，輸出扁平 Bookmark ID 清單。

損壞或遺漏的 order ID 在讀取時忽略；尚未列入 order 的有效 Bookmark 依 `createdAt` 新到舊補在尾端，repository 可在下一次 command 重建索引。Bookmark 編輯成功後由 snapshot 更新，置頂區與原 Category 自然同步。

替代方案是在各 React component 各自訂閱 storage；這會讓一筆 Bookmark 的雙處顯示及跨 Category 移動容易出現短暫分歧，因此不採用。

### 4. 編輯表單只保存在單一 Side Panel instance 的記憶體

Bookmark row 的更多選單啟動 inline editor，建立標題與 Note 的本地草稿。`Intl.Segmenter` 可用時以 grapheme cluster 限制輸入，並沿用既有 fallback 計數工具；Save 先執行 domain validation 再送 repository，Cancel 或 component unmount 直接丟棄草稿。Category rename 使用相同模式，但不允許操作固定 ID `uncategorized`。

標題按鈕與詳細資訊展開按鈕維持不同控制項；詳細資訊只顯示 Note 與帶記錄 icon 的收藏時間，時間的「收藏時間」名稱只提供給輔助技術。更多選單、置頂、刪除與拖曳都有獨立 accessible name。完整文字以 `title` 與可供輔助技術讀取的名稱提供。

### 5. 使用可鍵盤操作且支援跨容器的 sortable abstraction

加入輕量的 sortable drag-and-drop 依賴，將 Mouse／Pointer sensor 與 Keyboard sensor 統一到三種清單：Category、Category 內 Bookmark、Pinned。拖曳只能從把手開始；Category 本體同時作為 Bookmark 的跨容器 drop target，不再提供「移到分類」選單。Bookmark 進入收合的 Category 時，以暫時 UI state 展開目標並將同一個穩定 sortable ID 投影到預計落點；游標移到其他項目前後時即時更新插入位置。最新落點同時寫入同步 ref，確保 pointer up 即使早於下一次 React render，drop 仍保存畫面最後顯示的位置。drop 成功後保存移動並維持目標 Category 展開，取消則丟棄全部投影狀態。鍵盤 sensor 使用同一套 drop target 完成排序與跨 Category 移動。

所有排序 transform 限制在垂直軸，Side Panel 內容區隱藏水平溢位，避免拖曳項目越過清單邊界時建立水平 scroll range 或干擾側欄寬度。

一次 drop 只轉換成一個 repository command。拖曳期間只呈現暫時視覺位置，drop 成功才保存；取消或寫入失敗便從最後 snapshot 還原。

替代方案是原生 HTML Drag and Drop；它在鍵盤操作、跨容器排序與 jsdom 測試上的行為不足，會需要自行重建大量可及性機制。

### 6. 刪除 Undo 使用 operation snapshot，UI 只保留最後一筆

repository 在刪除前建立判別聯集 snapshot：

- Bookmark 刪除：完整 Bookmark、Category ID、Category 位置、Pinned 位置。
- Category 刪除：Category、Category 位置、其全部 Bookmark、Bookmark order、Pinned 位置與原展開狀態。

刪除 command 回傳 snapshot；目前 Side Panel instance 只在記憶體保留最近一筆並顯示 snackbar。下一個資料 command 開始前清掉舊 snapshot，panel 卸載也自然清除。Undo 將 snapshot 交回 repository 驗證；若 ID 已被其他 panel 的後續異動占用或衝突，repository 拒絕部分還原並要求重新載入，不進行不完整復原。

右鍵建立 Bookmark 的既有 MV3 service-worker Undo 繼續使用 `storage.session`，因為建立提示位於 Gmail frame 且 worker 可能休眠；Side Panel 刪除 Undo 的生命週期則明確跟隨 panel。

### 7. 搜尋採正規化子字串比對與穩定 ranking

搜尋 trim 輸入後以 locale-aware lowercase 正規化，對 title、Category name 和 Note 做純文字子字串比對。每筆結果只取最高符合層級：title = 0、Category = 1、Note = 2；同層級依 `lastOpenedAt`、`createdAt`、穩定 Bookmark key 排序。搜尋字串非空時不渲染 Category groups，清除後直接回到保存的 Category expansion preference。

第一版不建立持久全文索引。1,000 筆、每筆 Note 最多 500 grapheme 的線性比對足以接受，並避免索引同步與 migration 成本；效能測試若顯示輸入阻塞，再加入 React deferred value 或短 debounce，不改變 repository。

### 8. UI 拆成可獨立測試的垂直切片

`App` 保留初始化、訂閱與全域狀態協調，UI 分成 Toolbar/Search、PinnedSection、CategorySection、BookmarkRow、BookmarkEditor、ConfirmDialog 與 UndoSnackbar。Side Panel 不另設產品標題列；搜尋框與新增 Category icon 共用最上方工具列，內容版面最低支援 240px。Chrome Side Panel 外框寬度由瀏覽器與使用者調整，擴充功能不假設或設定固定寬度。所有繁體中文文案放入既有 messages 模組；樣式沿用 semantic color token 及明暗模式。

Category 與 Bookmark 的更多操作改用受控 menu state。操作 icon 在該列 hover 或 focus-within 時顯示；滑鼠離開 Bookmark 列會關閉 Bookmark menu，防止下次移入仍保留上次彈窗。Category menu 不因移向彈窗而消失，確保重新命名與刪除可點擊。

Google Chat capture 只從使用者右鍵選取的 message body 穩定語意標記擷取第一個非空白文字行，並在送往 service worker 前截為 30 個 grapheme。若取不到文字，使用收藏日期產生安全 fallback。Google Chat 目前沒有可依賴的聊天室名稱標記，因此介面不顯示或搜尋來源聊天室；既有 storage 欄位只保留作舊資料相容。

實作順序以可操作切片進行：先 repository 與 migration，再 Bookmark 編輯／刪除，再 Category CRUD／收合，再排序／移動／置頂，最後搜尋與 1,000 筆效能。每一片先用 domain/repository 測試固定不變量，再補關鍵 React 互動測試和真實 Chrome 人工驗收。

## Risks / Trade-offs

- [多 key storage 無真正 transaction] → 候選資料先完整驗證，以一次 `set` 公布新狀態並使用 tombstone；清理事件不觸發畫面重載，測試中模擬中斷與重新初始化。
- [兩個 Gmail Side Panel 同時操作可能產生 stale command] → command 接受預期 revision，repository 在寫入前重讀 metadata revision；衝突時拒絕並重新載入最新 snapshot。
- [新增 drag-and-drop dependency 增加 bundle] → 只引入 core/sortable 必要模組，build 後檢查 side panel bundle；若明顯超出目前規模，再評估內部 sortable abstraction。
- [1,000 筆搜尋造成每次鍵入同步計算] → 使用 map 與單次線性掃描，React transition/deferred value 避免阻塞輸入，並以最大 Note 資料集量測。
- [Undo 僅存在目前 panel] → 行為符合「關閉側欄即失效」；所有刪除在執行前已建立完整 snapshot，批次刪除仍需明確確認。
- [schema v2 migration 失敗] → 延續先建立候選、驗證後切換版本的流程；失敗時保留 v1 原資料、repository 進入唯讀並保留完整備份入口。

## Migration Plan

1. 增加 version 1 → version 2 migration 與回歸 fixture；先驗證候選資料，再切換 metadata schema version。
2. 發布前以現有 version 1 真實測試資料驗證 Bookmark、Message Anchor、分類與診斷完整備份皆可讀取。
3. 實作期間讓 v2 validator 僅接受完成遷移的資料；任何失敗保持原資料且停止後續 command。
4. 若測試版需回退到只理解 v1 的舊 build，先使用新版完整備份保留資料；舊 build 不應直接覆寫 v2 Library。
