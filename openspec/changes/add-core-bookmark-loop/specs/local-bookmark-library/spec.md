## Purpose

為第一階段未封裝測試版提供可靠且可演進的個人本機收藏庫，使 Bookmark 在重新載入與版本更新後仍能保留，並讓測試者能以獨立診斷備份保護及還原整份資料。

## ADDED Requirements

### Requirement: Bookmark Library 以 Chrome Profile 為本機邊界

系統 SHALL 將 Bookmark Library 保存於目前 Chrome Profile 的擴充功能本機儲存空間，且第一個 change 不提供跨裝置或 Google 帳號同步。

#### Scenario: 重新開啟 Side Panel
- **WHEN** 使用者關閉並重新開啟 Side Panel
- **THEN** 系統顯示相同 Chrome Profile 中先前已保存的 Bookmark

#### Scenario: 重新載入擴充功能
- **WHEN** 測試者在固定安裝資料夾更新檔案並於 `chrome://extensions` 重新載入擴充功能
- **THEN** 系統保留並重新讀取既有 Bookmark Library

#### Scenario: 不提供跨 Profile 資料
- **WHEN** 使用者在另一個 Chrome Profile 安裝或開啟擴充功能
- **THEN** 系統 MUST NOT 自動顯示原 Profile 的 Bookmark Library

### Requirement: 本機資料具有獨立 schema version

系統 SHALL 為本機 Bookmark Library 保存 storage schema version，並在允許產品讀寫資料前完成必要遷移。

#### Scenario: 目前 schema version
- **WHEN** 已保存資料的 schema version 等於目前版本
- **THEN** 系統直接載入資料且不重複修改內容

#### Scenario: 可遷移的舊版本
- **WHEN** 已保存資料使用系統支援遷移的舊 schema version
- **THEN** 系統依序遷移並驗證資料，再開放正常讀寫

#### Scenario: 遷移失敗
- **WHEN** 系統無法安全完成或驗證資料遷移
- **THEN** 系統 MUST 停止後續產品寫入、保留原始資料，並顯示可理解的錯誤與備份入口

### Requirement: 提供獨立的完整診斷備份

系統 SHALL 允許測試者從診斷區下載整份本機 Library 備份；該格式 MUST 與供同事分享的 Bookmark Package 分開。

#### Scenario: 建立完整備份
- **WHEN** 使用者選取「完整備份」
- **THEN** 系統下載包含格式識別、storage schema version、Bookmark、Category、排序及置頂資料的 JSON 檔案

#### Scenario: 排除暫時狀態
- **WHEN** 系統建立完整備份
- **THEN** 備份 MUST NOT 包含 undo snapshot、未儲存編輯狀態或其他 session state

### Requirement: 完整還原必須先驗證並確認

系統 SHALL 在修改本機 Library 前解析、驗證及遷移完整備份，並明確告知使用者還原會取代目前資料。

#### Scenario: 有效備份的確認
- **WHEN** 使用者選取有效且可支援的完整備份
- **THEN** 系統顯示將完整取代目前本機 Library 的確認，且確認前不得修改資料

#### Scenario: 使用者確認還原
- **WHEN** 使用者確認以有效備份還原
- **THEN** 系統以備份資料取代目前持久資料，並在完成後顯示還原結果

#### Scenario: 備份無效
- **WHEN** 備份無法解析、格式識別錯誤、版本不支援或內容驗證失敗
- **THEN** 系統 MUST 拒絕還原並完整保留目前 Library

#### Scenario: 還原中斷
- **WHEN** Chrome 或擴充功能在還原完成前中斷
- **THEN** 系統 MUST 在下次啟動時完成還原或回復中斷前的 Library，不得把無法判斷的部分資料當成成功結果

### Requirement: 第一階段資料不離開本機

系統 MUST NOT 為產品功能連接自有後端、收集遙測或自動傳送錯誤與使用統計。

#### Scenario: 一般收藏與瀏覽
- **WHEN** 使用者收藏、查看、備份或還原 Bookmark
- **THEN** 系統不向 Gmail／Google Chat 以外的遠端服務傳送產品資料

#### Scenario: 使用者取得診斷資料
- **WHEN** 使用者要求複製診斷資訊
- **THEN** 系統只將資料寫入使用者剪貼簿，是否分享由使用者決定

### Requirement: 無痕模式不可使用

系統 MUST NOT 在 Chrome 無痕模式中啟用第一階段擴充功能。

#### Scenario: 開啟無痕視窗
- **WHEN** 使用者開啟 Chrome 無痕視窗
- **THEN** Google Chat Bookmark 不提供收藏、Side Panel 或 Library 存取功能
