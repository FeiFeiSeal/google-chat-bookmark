## Why

目前側欄只能列出未分類 Bookmark 並開啟原討論，使用者無法修正自動標題、補充檢索筆記、建立分類或移除不再需要的資料。當收藏數量增加時，這會使 Bookmark Library 再次變得難以整理與尋找，因此需要完成產品規格中的 Milestone 2 個人整理能力。

## What Changes

- 讓使用者從 Bookmark 的更多操作選單進入原位置編輯，修改標題與 Note，並明確儲存或取消。
- 顯示可收合的 Bookmark 詳細資訊；內容只保留 Note 與「記錄 icon＋收藏時間」，同時維持標題單行顯示及點擊後直接跳回 Google Chat Message Anchor。
- 提供 Category 新增、重新命名、展開／收合、刪除及拖曳排序；Category 以不可變 ID 識別並允許同名。
- 提供 Bookmark 在 Category 內拖曳排序及直接跨 Category 移動；進入收合的目標 Category 時自動展開並即時預覽落點，不再顯示「移到分類」選單。
- 讓右鍵收藏以 Message Anchor 識別 Bookmark；同一討論串可收藏不同訊息，但同一訊息不得重複收藏。
- 預設標題取使用者實際收藏的訊息文字，並限制為 30 個可見字元；不顯示無法可靠擷取的來源聊天室。
- 分類重新命名、排序與刪除在實際 Chrome Side Panel 可操作，Bookmark 操作選單於滑鼠離開該列後自動關閉。
- 提供 Bookmark 置頂、置頂區獨立排序，以及原 Category 與置頂區共用同一筆資料的雙處顯示。
- 提供單筆 Bookmark 刪除與整個 Category 批次刪除；前者立即執行，後者先顯示精確筆數並確認，兩者皆可復原最近一次操作。
- 提供依標題、Note 與 Category 名稱搜尋的扁平結果清單。
- 讓固定工具列與搜尋區之外的清單獨立捲動，並以 1,000 筆 Bookmark 驗證主要整理與搜尋操作。
- 移除搜尋上方的產品標題列，將新增 Category icon 放到搜尋框右側，並讓內容在較窄 Side Panel 中保持可用。
- 不加入月份篩選、跨裝置同步、Bookmark Package 匯入／匯出或未儲存草稿持久化。

## Capabilities

### New Capabilities

- `bookmark-editing`: Bookmark 標題與 Note 的顯示、原位置編輯、字數限制、儲存及取消行為。
- `category-organization`: Category CRUD、展開狀態、Category 與 Bookmark 排序／移動、置頂、刪除及復原行為。
- `bookmark-search`: 依本機 Bookmark metadata 搜尋、結果排序及搜尋前後的側欄狀態行為。

### Modified Capabilities

無。專案尚未將已完成變更封存為主規格，因此這次建立 Milestone 2 的新 capability delta。

## Impact

- 擴充 `BookmarkRepository` 及 storage adapter 使用方式，以支援 Category、排序、置頂、編輯、刪除與一致性的批次寫入。
- 將 storage key 從 Thread 層級遷移為 Message 層級，並非破壞性地重建既有 order 與 pinned reference。
- 擴充 Undo snapshot，涵蓋單筆 Bookmark 與整個 Category 的資料、順序及置頂狀態。
- 重構 Side Panel，加入分類清單、搜尋、詳細資訊、原位置編輯、icon 操作與內部捲動。
- 增加 repository、domain、Undo、搜尋與 React 互動測試，並更新 Milestone 2 人工驗收清單。
- 延續既有 storage schema 與備份相容性；若資料結構必須調整，透過安全且可重複執行的 migration 完成。
