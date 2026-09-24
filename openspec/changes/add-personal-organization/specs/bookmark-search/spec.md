## Purpose

讓使用者不必記得 Google Chat 對話關鍵字，也能以自己保存的標題、Note 或 Category 快速找回 Bookmark。

## ADDED Requirements

### Requirement: Search covers local bookmark metadata
系統 SHALL 以使用者輸入的文字搜尋 Bookmark 標題、Note 及 Category 名稱，包括目前收合而未顯示的 Note；不得搜尋或索引未被保存為標題的 Google Chat 訊息、回覆或參與者內容。

#### Scenario: Match collapsed Note
- **WHEN** 搜尋文字只出現在一筆目前收合的 Bookmark Note 中
- **THEN** 系統仍在搜尋結果顯示該 Bookmark

#### Scenario: No matching metadata
- **WHEN** 搜尋文字不符合任何本機 Bookmark metadata
- **THEN** 系統顯示沒有搜尋結果且不改變 Library 資料

### Requirement: Search results use a flat ranked list
系統 SHALL 在搜尋期間以不依 Category 分組的扁平清單顯示結果，依序優先排列標題符合、Category 符合、Note 符合的 Bookmark；相同層級依最近開啟時間由新到舊排列，從未開啟者依收藏時間由新到舊排列。

#### Scenario: Rank matches from different fields
- **WHEN** 搜尋同時符合某筆 Bookmark 標題及另一筆 Bookmark Note
- **THEN** 系統將標題符合的 Bookmark 排在 Note 符合者之前

#### Scenario: Rank matches in the same tier
- **WHEN** 兩筆 Bookmark 在相同欄位層級符合搜尋文字
- **THEN** 系統優先顯示最近開啟者，從未開啟且同層級者則優先顯示最近收藏者

### Requirement: Search does not replace category view state
系統 SHALL 在搜尋時保留進入搜尋前的 Category 展開狀態，且不提供月份篩選選單。

#### Scenario: Clear search
- **WHEN** 使用者清除搜尋文字
- **THEN** 系統恢復 Category 分組畫面及搜尋前保存的展開與收合狀態

#### Scenario: Open bookmark from search result
- **WHEN** 使用者點擊搜尋結果標題並成功要求 Gmail 導覽
- **THEN** 系統更新該 Bookmark 的最近開啟時間，且不修改 Category 展開狀態
