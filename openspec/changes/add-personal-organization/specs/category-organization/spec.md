## Purpose

讓使用者用 Category、順序與置頂整理大量 Bookmark，安全刪除不再需要的內容，並在重新開啟 Side Panel 後延續已提交的個人整理結果。

## ADDED Requirements

### Requirement: User can manage categories by stable identity
系統 SHALL 讓使用者新增及重新命名 Category，以不可變 ID 判斷 Category 身份，允許多個 Category 使用相同名稱，並限制名稱為 1 至 30 個 grapheme cluster。

#### Scenario: Create category
- **WHEN** 使用者輸入有效名稱並新增 Category
- **THEN** 系統建立具有新 ID 的 Category、放在 Category 清單底部且預設收合

#### Scenario: Create duplicate category name
- **WHEN** 使用者新增與現有 Category 同名的 Category
- **THEN** 系統以不同 ID 建立新 Category且不合併兩者

#### Scenario: Rename category
- **WHEN** 使用者將一般 Category 重新命名為有效名稱
- **THEN** 系統只更新該 Category 的顯示名稱並保留其 ID、Bookmark、順序與展開狀態

#### Scenario: Open category actions
- **WHEN** 使用者以滑鼠或鍵盤開啟一般 Category 的操作選單
- **THEN** 系統顯示重新命名與刪除操作，且兩者可在 Chrome Side Panel 完成

#### Scenario: Protect Uncategorized
- **WHEN** 使用者操作系統預設的 Uncategorized Category
- **THEN** 系統不提供重新命名或刪除操作，但仍允許展開、收合及作為 Bookmark 移動目的地

### Requirement: Category expansion state persists locally
系統 SHALL 依 Category ID 保存各 Category 的展開或收合狀態；新建 Category 與第一次出現的 Uncategorized 預設收合，且 Uncategorized 不得被強制展開。

#### Scenario: Reopen side panel
- **WHEN** 使用者改變 Category 展開狀態後關閉再開啟 Side Panel
- **THEN** 系統恢復各 Category 上次保存的展開或收合狀態

#### Scenario: Remove category state
- **WHEN** Category 被刪除
- **THEN** 系統同時移除該 Category 保存的展開狀態

### Requirement: User can order categories and bookmarks with drag handles
系統 SHALL 只從專用拖曳把手啟動排序，支援 Category 自訂順序、同一 Category 內 Bookmark 排序，以及 Bookmark 跨 Category 移動。

#### Scenario: Reorder categories
- **WHEN** 使用者透過 Category 拖曳把手移動 Category
- **THEN** 系統保存新的 Category 順序且不改變 Bookmark 的 Category 關聯

#### Scenario: Reorder bookmark in category
- **WHEN** 使用者透過 Bookmark 拖曳把手在同一 Category 內移動 Bookmark
- **THEN** 系統保存該 Category 的自訂 Bookmark 順序

#### Scenario: Release immediately after preview changes
- **WHEN** 拖曳預覽已顯示新的 Bookmark 順序，且使用者立即放開指標
- **THEN** 系統保存預覽最後顯示的順序，不因 React 尚未重新 render 而遺失落點

#### Scenario: Drag horizontally
- **WHEN** 使用者在排序期間向左或向右移動指標
- **THEN** Bookmark 視覺位移仍限制在垂直軸，且 Side Panel 不產生水平捲動或寬度變化

#### Scenario: Move bookmark across categories
- **WHEN** 使用者將 Bookmark 拖曳到另一個 Category
- **THEN** 系統以單次完整異動更新 Bookmark 的 Category、來源順序與目的順序

#### Scenario: Preview cross-category placement
- **WHEN** 使用者將 Bookmark 拖曳進入另一個目前收合的 Category，並在其中的 Bookmark 之間移動
- **THEN** 系統先展開目標 Category，在保存前顯示被拖曳 Bookmark 的預計插入位置，並隨游標更新落點

#### Scenario: Cancel cross-category placement
- **WHEN** 使用者取消跨 Category 拖曳
- **THEN** 系統移除暫時展開與落點預覽，且不改變 Bookmark 或 Category 的持久資料

#### Scenario: No separate move control
- **WHEN** 使用者開啟 Bookmark 更多操作選單
- **THEN** 系統不顯示「移到分類」控制，跨 Category 移動由拖曳完成

#### Scenario: Default bookmark order
- **WHEN** Category 尚未經過手動排序
- **THEN** 系統依收藏時間由新到舊顯示，且新收藏放在 Category 最上方

### Requirement: Pinned bookmarks appear in two locations
系統 SHALL 讓置頂 Bookmark 同時出現在側欄頂部置頂區與原 Category，兩處共用同一筆 Bookmark，並以獨立順序管理置頂區。

#### Scenario: Pin bookmark
- **WHEN** 使用者將未置頂 Bookmark 設為置頂
- **THEN** 系統將其放到置頂區最上方並保留原 Category 與 Category 內位置

#### Scenario: Edit bookmark shown twice
- **WHEN** 使用者從置頂區或原 Category 編輯同一筆置頂 Bookmark
- **THEN** 系統在兩處顯示相同的已儲存資料

#### Scenario: Reorder pinned bookmark
- **WHEN** 使用者透過拖曳把手重排置頂區
- **THEN** 系統只更新置頂順序，不改變原 Category 的順序

#### Scenario: Unpin bookmark
- **WHEN** 使用者取消 Bookmark 置頂
- **THEN** 系統將其從置頂區移除並保留原 Category 與原 Category 內位置

### Requirement: User can delete one bookmark with Undo
系統 SHALL 在不顯示確認視窗的情況下立即刪除單筆 Bookmark，且刪除不得影響 Google Chat 原始 Thread 或 Message。

#### Scenario: Delete one bookmark
- **WHEN** 使用者從 Bookmark 操作選取刪除
- **THEN** 系統移除該 Bookmark 的記錄、Category 順序與置頂順序，並顯示復原操作

#### Scenario: Undo one bookmark deletion
- **WHEN** 使用者在下一次資料異動或關閉 Side Panel 前選取復原
- **THEN** 系統還原 Bookmark、原 Category 位置、排序及置頂狀態

### Requirement: User can delete a category and its bookmarks with confirmation
系統 MUST 在刪除一般 Category 前顯示其中 Bookmark 的精確筆數，只有確認後才刪除 Category 與其中全部 Bookmark，不得把 Bookmark 移到 Uncategorized。

#### Scenario: Review category deletion
- **WHEN** 使用者要求刪除包含 18 筆 Bookmark 的 Category
- **THEN** 系統顯示「這個分類包含 18 筆 Bookmark」並等待使用者確認

#### Scenario: Cancel category deletion
- **WHEN** 使用者取消 Category 刪除確認
- **THEN** 系統不變更 Category、Bookmark、排序或置頂資料

#### Scenario: Confirm category deletion
- **WHEN** 使用者確認刪除一般 Category
- **THEN** 系統完整刪除該 Category、其中全部 Bookmark、相關排序、置頂參照及展開狀態，並顯示一次整組復原操作

#### Scenario: Undo category deletion
- **WHEN** 使用者在下一次資料異動或關閉 Side Panel 前選取復原
- **THEN** 系統還原 Category、其中全部 Bookmark、Category 位置、Bookmark 順序與置頂狀態

### Requirement: Organization operations remain usable at library scale
系統 SHALL 將工具列與搜尋區保持可見，只讓 Category／結果清單使用可用高度內的垂直捲動，並在收合 Category 時避免建立其中全部 Bookmark 的可見列。

#### Scenario: Browse a 1000-bookmark library
- **WHEN** 使用者開啟含 1,000 筆 Bookmark、不同 Note 大小、重複 Category 名稱及多種展開狀態的 Side Panel
- **THEN** 系統保持清單區可捲動，且收合 Category 的 Bookmark 不出現在可見文件結構中

### Requirement: Icon operations are accessible
系統 MUST 為編輯、拖曳、置頂、刪除及更多操作的 icon 提供可辨識名稱、滑鼠提示與鍵盤焦點狀態，並讓鍵盤使用者透過 sortable keyboard sensor 完成 Category 排序及 Bookmark 跨 Category 移動。

#### Scenario: Keyboard focuses an icon operation
- **WHEN** 鍵盤焦點移到 Bookmark 或 Category 的 icon 按鈕
- **THEN** 系統顯示該操作、提供可辨識名稱及清楚焦點狀態
