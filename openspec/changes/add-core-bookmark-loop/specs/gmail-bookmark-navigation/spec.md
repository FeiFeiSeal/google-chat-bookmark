## Purpose

在 Gmail 分頁旁提供精簡、可持續開啟的 Bookmark Side Panel，讓使用者從本機收藏清單直接在同一 Gmail 分頁返回保存的 Thread 與 Message Anchor，而不需重新記憶搜尋關鍵字。

## ADDED Requirements

### Requirement: Side Panel 只在 Gmail 分頁可用

系統 SHALL 只對 `mail.google.com` 分頁啟用 Google Chat Bookmark Side Panel，並以開啟該 panel 的分頁作為後續導覽目標。

#### Scenario: Gmail 分頁
- **WHEN** 使用者在 `mail.google.com` 分頁點擊擴充功能 action 或從收藏結果開啟側欄
- **THEN** 系統在該分頁顯示 Bookmark Side Panel

#### Scenario: 非 Gmail 分頁
- **WHEN** 使用者切換至非 `mail.google.com` 網頁
- **THEN** 系統不在該分頁提供 Bookmark Side Panel

#### Scenario: Gmail 非 Chat 畫面
- **WHEN** 使用者在 Gmail 收件匣或其他 Gmail 畫面開啟 Side Panel
- **THEN** 系統仍顯示 Library，並允許 Bookmark 導覽至 Gmail 內嵌 Chat

### Requirement: Milestone 1 顯示 Uncategorized Bookmark 清單

系統 SHALL 在 Side Panel 顯示本機 Library 中的 Uncategorized Bookmark，主清單每筆只顯示單行標題。

#### Scenario: 顯示已保存 Bookmark
- **WHEN** Side Panel 載入包含 Bookmark 的 Library
- **THEN** 系統顯示各 Bookmark 的標題，並使每筆標題可被點擊導覽

#### Scenario: 標題超過可用寬度
- **WHEN** Bookmark 標題無法在目前 panel 寬度內完整顯示
- **THEN** 系統保持單行並以省略號呈現，且提供可存取完整標題的提示

#### Scenario: 大量 Bookmark
- **WHEN** Bookmark 清單超過 Side Panel 可用高度
- **THEN** 工具列保持可見且只有清單區垂直捲動，頁面高度不得隨項目數持續增加

#### Scenario: 空 Library
- **WHEN** Library 尚無任何 Bookmark
- **THEN** 系統顯示繁體中文空狀態，說明可從 Google Chat 訊息右鍵收藏

### Requirement: 點擊 Bookmark 在同一 Gmail 分頁精準跳轉

系統 SHALL 在使用者點擊 Bookmark 標題時，使用承載目前 Side Panel 的同一 Gmail 分頁開啟保存的 Thread 並定位 Message Anchor。

#### Scenario: 從 Gmail 收件匣跳轉
- **WHEN** 使用者在 Gmail 收件匣旁的 Side Panel 點擊 Bookmark
- **THEN** 系統在同一分頁切換至 Gmail Chat，開啟對應 `spaceId / threadId / messageId`

#### Scenario: 從另一個 Chat 討論跳轉
- **WHEN** 使用者正在查看另一個 Gmail Chat 討論並點擊 Bookmark
- **THEN** 系統在同一分頁導覽至 Bookmark 保存的 Thread 與 Message Anchor

#### Scenario: 使用目前 Gmail 帳號路徑
- **WHEN** 使用者點擊 Bookmark
- **THEN** 系統沿用目前 Gmail 分頁的帳號路徑執行導覽，不從 Bookmark 保存或套用 Gmail 帳號索引

### Requirement: 已提交的 Library 變更會反映在已開啟 panel

系統 SHALL 讓同一 Chrome Profile 中已開啟的 Gmail Side Panel 反映已成功提交的 Bookmark 新增、復原或還原結果。

#### Scenario: 右鍵新增後更新清單
- **WHEN** 使用者在 Gmail Chat 成功建立 Bookmark
- **THEN** 已開啟的 Side Panel 顯示新 Bookmark，使用者不需重新載入分頁

#### Scenario: 復原收藏後更新清單
- **WHEN** 使用者復原剛建立的 Bookmark
- **THEN** 已開啟的 Side Panel 移除該 Bookmark

### Requirement: Side Panel 遵循第一階段介面邊界

系統 SHALL 提供繁體中文介面、自動跟隨 Chrome 或作業系統明暗模式，並保留 Chrome 決定的 panel 左右位置。

#### Scenario: 系統切換深色模式
- **WHEN** Chrome 或作業系統偏好切換為深色模式
- **THEN** Side Panel 使用對應的深色語意色彩且內容維持可讀

#### Scenario: Chrome 設定 panel 位置
- **WHEN** 使用者在 Chrome 設定中選擇 Side Panel 顯示於左側或右側
- **THEN** Google Chat Bookmark 遵循該位置，不提供另一個互相衝突的方向設定
