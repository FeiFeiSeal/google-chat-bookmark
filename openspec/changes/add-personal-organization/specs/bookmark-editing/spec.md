## Purpose

讓使用者在不失去快速跳回 Google Chat 的主要操作下，能修改 Bookmark 的短標題、補充個人 Note，並按需查看不常用的詳細資訊。

## ADDED Requirements

### Requirement: Bookmark row prioritizes navigation
系統 SHALL 在 Bookmark 主清單只以單行顯示標題，超出可用寬度時顯示省略號，並讓標題點擊一律在承載 Side Panel 的 Gmail 分頁開啟既有 Message Anchor。

#### Scenario: Open bookmark from title
- **WHEN** 使用者點擊 Bookmark 標題
- **THEN** 系統在同一個 Gmail 分頁導覽到該 Bookmark 保存的 Message Anchor

#### Scenario: Long title in narrow panel
- **WHEN** Bookmark 標題超出列的可用寬度
- **THEN** 系統以單行省略號顯示並提供可取得完整標題的輔助提示

### Requirement: Bookmark details are collapsible
系統 SHALL 將 Note 與收藏時間放在個別 Bookmark 的可收合詳細資訊中；收藏時間前顯示記錄 icon，不顯示「收藏時間」或 Category 文字標籤。

#### Scenario: Expand bookmark details
- **WHEN** 使用者展開一筆 Bookmark 的詳細資訊
- **THEN** 系統顯示該 Bookmark 的 Note，以及「記錄 icon＋收藏時間」

#### Scenario: Collapse bookmark details
- **WHEN** 使用者收合 Bookmark 詳細資訊
- **THEN** 系統只保留主要 Bookmark 列且不刪除任何資料

### Requirement: Bookmark capture preserves message identity and context
系統 SHALL 以 `spaceId`、`threadId` 與 `messageId` 的組合識別 Bookmark，預設標題使用被收藏訊息的第一個非空白文字行並限制為 30 個 grapheme cluster。

#### Scenario: Bookmark different messages in one thread
- **WHEN** 使用者收藏同一討論串中的兩則不同訊息
- **THEN** 系統建立兩筆 Bookmark 並分別保存各自的 Message Anchor

#### Scenario: Bookmark the same message twice
- **WHEN** 使用者再次收藏具有相同 `spaceId`、`threadId` 與 `messageId` 的訊息
- **THEN** 系統判定為重複且不建立第二筆 Bookmark

#### Scenario: Create default title from selected message
- **WHEN** 系統從 Google Chat 訊息建立 Bookmark
- **THEN** 預設標題為使用者當次收藏訊息文字的前 30 個可見字元

### Requirement: User can edit title and Note in place
系統 SHALL 從 Bookmark 的更多操作選單提供「編輯」，在原位置顯示標題與 Note 欄位及明確的「儲存」「取消」操作，不得以標題點擊進入編輯。

#### Scenario: Save edited bookmark
- **WHEN** 使用者進入編輯、輸入有效標題與 Note 並選取「儲存」
- **THEN** 系統更新同一筆 Bookmark 並回到顯示模式

#### Scenario: Cancel edited bookmark
- **WHEN** 使用者修改欄位後選取「取消」
- **THEN** 系統捨棄本次修改並顯示進入編輯前的標題與 Note

#### Scenario: Panel closes during edit
- **WHEN** Side Panel 在使用者尚未儲存時關閉、卸載或重新載入
- **THEN** 系統不保存草稿或正在編輯的狀態，下次開啟時顯示最後一次已儲存資料

#### Scenario: Pointer leaves an open bookmark menu
- **WHEN** 使用者開啟 Bookmark 更多操作選單後將滑鼠移出該 Bookmark 列
- **THEN** 系統關閉該操作選單，且滑鼠再次移入時不會自動重新開啟

### Requirement: Editable text obeys visible-character limits
系統 MUST 以 grapheme cluster 計算使用者可見字元，要求標題為 1 至 30 個字元，Note 為 0 至 500 個字元，並以純文字保存及呈現。

#### Scenario: Input reaches field limit
- **WHEN** 使用者在標題或 Note 輸入達到各自上限
- **THEN** 系統阻止再輸入超過上限的可見字元，且不拆開 emoji 或組合字

#### Scenario: Title is blank
- **WHEN** 使用者嘗試儲存只包含空白的標題
- **THEN** 系統保留編輯模式、顯示欄位錯誤且不更新 Bookmark

#### Scenario: Input approaches field limit
- **WHEN** 使用者輸入的標題或 Note 接近欄位上限
- **THEN** 系統顯示目前字數提示，而未接近上限時不持續顯示提示

### Requirement: Side Panel follows the active Gmail tab
系統 SHALL 只在 Gmail 分頁啟用 Bookmark Side Panel；當使用者切換到非 Gmail 分頁，或目前啟用的 Gmail 分頁導覽離開 Gmail 時，系統 SHALL 自動關閉本擴充功能的 Side Panel。

#### Scenario: Switch to another website
- **WHEN** Bookmark Side Panel 開啟且使用者切換到非 `mail.google.com` 分頁
- **THEN** 系統停用該分頁的 Bookmark Side Panel 並自動關閉目前 panel

#### Scenario: Active Gmail tab navigates away
- **WHEN** Bookmark Side Panel 開啟且目前 Gmail 分頁導覽到其他網站
- **THEN** 系統停用該分頁的 Bookmark Side Panel 並自動關閉目前 panel

#### Scenario: Background tab navigates
- **WHEN** 非使用中分頁導覽到其他網站
- **THEN** 系統更新該分頁的 Side Panel 啟用狀態，但不關閉目前使用中的 Gmail panel

#### Scenario: Switch between Mail and Chat in Gmail
- **WHEN** 使用者在同一個 `mail.google.com` 分頁內切換 Mail 與 Chat
- **THEN** Bookmark Side Panel 保持可用，不需重新開啟
