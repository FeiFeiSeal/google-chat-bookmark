## Purpose

讓使用者能從 Gmail 內嵌 Google Chat 的特定訊息立即建立可靠的討論入口，同時保存 Thread 身份與精準 Message Anchor，並在 Google 頁面結構無法安全辨識時避免寫入錯誤資料。

## ADDED Requirements

### Requirement: 從有效的 Google Chat 訊息建立 Bookmark

系統 SHALL 在使用者於 Gmail 內嵌 Google Chat 的訊息上啟動擴充功能右鍵選單時，立即建立 Bookmark，不要求先填寫表單。

#### Scenario: 收藏 Thread 起始訊息
- **WHEN** 使用者在可辨識的 Thread 起始訊息上選取收藏動作
- **THEN** 系統建立指向該 Thread 與該起始 Message 的 Bookmark

#### Scenario: 收藏 Thread 回覆訊息
- **WHEN** 使用者在可辨識的 Thread 回覆訊息上選取收藏動作
- **THEN** 系統建立以該 Thread 為對象、以該回覆 Message 為 Message Anchor 的 Bookmark

#### Scenario: 非訊息目標不建立 Bookmark
- **WHEN** 使用者從空白區、輸入欄位或其他無法辨識為 Google Chat Message 的目標啟動收藏動作
- **THEN** 系統 MUST NOT 建立 Bookmark

### Requirement: 保存可驗證的 Thread 身份與 Message Anchor

系統 MUST 只有在 `spaceId`、`threadId`、`messageId` 與 Google Chat HTTPS 連結皆可驗證時保存 Bookmark，並以 `spaceId + threadId` 表示 Thread 身份，以 `messageId` 表示 Message Anchor。

#### Scenario: 必要身份完整
- **WHEN** 右鍵目標提供一致且格式有效的 `spaceId`、`threadId` 與 `messageId`
- **THEN** 系統保存三個 ID 及可由其重建的 Google Chat 連結

#### Scenario: 必要身份不一致
- **WHEN** DOM 屬性、右鍵目標或連結中的必要 ID 缺少、格式無效或互相不一致
- **THEN** 系統 MUST 拒絕寫入且不得使用空字串或推測值補齊

### Requirement: 產生簡短預設標題

系統 SHALL 使用當次被收藏訊息的第一個非空白文字行產生預設標題，並限制為最多 30 個使用者可見字元；若無法取得訊息文字，系統 SHALL 使用收藏日期產生暫時標題。

#### Scenario: 被收藏訊息文字可用
- **WHEN** 系統能安全取得當次被收藏訊息的第一個非空白文字行
- **THEN** 系統以 grapheme cluster 為單位取前 30 個字元作為 Bookmark 標題

#### Scenario: 被收藏訊息文字不可用
- **WHEN** 系統已取得有效 Message Anchor 但無法取得訊息文字
- **THEN** 系統使用收藏日期產生不超過 30 個字元的暫時標題

### Requirement: 同一 Thread 只保存一筆 Bookmark

系統 SHALL 以 `spaceId + threadId` 判斷 Duplicate Bookmark，同一 Bookmark Library 中不得存在兩筆指向同一 Thread 的 Bookmark。

#### Scenario: 首次收藏 Thread
- **WHEN** 目前 Library 不存在相同 `spaceId + threadId` 的 Bookmark
- **THEN** 系統建立新 Bookmark 並保存當時選中的 Message Anchor

#### Scenario: 再次收藏相同 Thread
- **WHEN** 目前 Library 已存在相同 `spaceId + threadId` 的 Bookmark
- **THEN** 系統 MUST NOT 新增或改寫既有 Bookmark 的標題、Message Anchor 或其他資料

### Requirement: 以低干擾方式回報收藏結果

系統 SHALL 以短暫提示回報收藏成功或重複狀態，不自動開啟 Side Panel。

#### Scenario: 收藏成功
- **WHEN** 新 Bookmark 已成功寫入
- **THEN** 系統顯示收藏成功提示，並提供「復原」與「開啟側欄」動作

#### Scenario: 復原剛建立的 Bookmark
- **WHEN** 使用者在下一個資料操作前從成功提示選取「復原」
- **THEN** 系統刪除剛建立的 Bookmark 且不影響 Google Chat 原始訊息

#### Scenario: 重複收藏
- **WHEN** 使用者再次收藏已存在的 Thread
- **THEN** 系統顯示「這個討論已收藏」，並提供跳到既有 Bookmark 與開啟側欄的動作

### Requirement: 擷取失敗時安全停止並提供隱私診斷

系統 MUST 在無法辨識有效訊息身份時停止收藏，顯示可理解的錯誤，並允許使用者主動複製不含對話內容的診斷資訊。

#### Scenario: 顯示擷取錯誤
- **WHEN** 系統無法安全解析右鍵目標
- **THEN** 系統不寫入任何 Bookmark，並顯示「目前無法讀取這則訊息，請重新整理 Gmail 後再試」

#### Scenario: 複製診斷資訊
- **WHEN** 使用者從錯誤提示選取「複製診斷資訊」
- **THEN** 系統只複製擴充功能版本、Chrome 版本、頁面類型、iframe 或解析步驟、錯誤碼與時間
- **THEN** 診斷資訊 MUST NOT 包含訊息文字、回覆內容、參與者資料或完整 DOM 內容
