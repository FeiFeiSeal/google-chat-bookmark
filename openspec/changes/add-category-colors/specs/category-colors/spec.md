## Purpose

讓使用者為一般分類設定易於辨識的整張卡片背景色與文字色，並讓顏色在側欄重開、明暗模式切換及完整備份還原後維持一致，同時保留未設定顏色者的既有外觀。

## ADDED Requirements

### Requirement: User can edit category name and colors together
系統 SHALL 在一般分類的操作選單提供編輯入口，讓使用者於同一表單修改名稱、整張卡片背景色與文字色；背景色 SHALL 提供常用色及自訂選色器，兩種顏色 SHALL 均可由選色器或 HEX 色碼輸入。

#### Scenario: Edit category
- **WHEN** 使用者從一般分類的操作選單開啟編輯
- **THEN** 表單顯示目前名稱與已儲存顏色，並提供背景色常用色、兩種顏色的自訂選色器與 HEX 輸入

#### Scenario: Preview and cancel
- **WHEN** 使用者在編輯表單改變顏色後按取消
- **THEN** 表單內含標題、書籤與筆記的整張卡片預覽反映暫存顏色，但實際分類及已儲存資料保持不變

#### Scenario: Save valid colors
- **WHEN** 使用者輸入有效名稱及有效的六位 HEX 背景色與文字色後按儲存
- **THEN** 系統一次保存名稱與兩種顏色，並更新該分類卡片

#### Scenario: Reject invalid color
- **WHEN** 使用者輸入無效 HEX 色碼後按儲存
- **THEN** 系統留在編輯表單，且不部分保存名稱或顏色

### Requirement: Category card uses the saved colors
系統 SHALL 將已儲存的背景色套用到整張分類卡片，並將已儲存的文字色套用到名稱、數量、展開箭頭、書籤標題、筆記、時間與操作圖示；分類卡片外的搜尋結果與置頂區 SHALL 不受影響。系統 SHALL 在明暗模式中使用同一組自訂顏色，且 SHALL 不因顏色對比不足拒絕儲存。

#### Scenario: Reopen or change theme
- **WHEN** 使用者儲存分類顏色後重開側欄或切換明暗模式
- **THEN** 整張分類卡片維持同一組背景色與文字色，卡片外的搜尋結果及置頂區維持原本樣式

#### Scenario: No custom colors
- **WHEN** 新建或既有分類尚未設定顏色
- **THEN** 整張分類卡片維持目前的預設外觀

#### Scenario: Outside category card
- **WHEN** 同一筆書籤出現在已上色分類、置頂區或扁平搜尋結果
- **THEN** 分類卡片內的書籤使用自訂背景色與文字色，置頂區與搜尋結果維持原本外觀

#### Scenario: Low contrast colors
- **WHEN** 使用者選擇對比不足但格式有效的背景色與文字色
- **THEN** 系統不顯示對比檢查或限制，並依使用者選擇儲存

### Requirement: User can restore default category colors
系統 SHALL 提供單一恢復預設操作，同時清除一般分類的自訂背景色與文字色；系統 MUST 不提供「未分類」改色、重新命名或刪除操作。

#### Scenario: Restore default colors
- **WHEN** 使用者在編輯表單選取恢復預設並儲存
- **THEN** 該分類卡片的背景色與文字色一起回到預設外觀，名稱維持表單儲存值

#### Scenario: Uncategorized actions
- **WHEN** 使用者查看「未分類」的標題操作
- **THEN** 系統不提供顏色編輯入口，並維持其預設外觀

### Requirement: Category colors survive local data transfer
系統 SHALL 將分類顏色保存在本機分類資料中，並於完整備份與還原中保留；未含顏色欄位的既有資料與舊版完整備份 SHALL 維持可讀取。

#### Scenario: Backup and restore colored category
- **WHEN** 使用者備份已設定顏色的分類並還原該備份
- **THEN** 分類名稱、背景色與文字色均與備份時相同

#### Scenario: Read legacy category
- **WHEN** 系統讀取未含顏色欄位的既有分類或舊版完整備份
- **THEN** 分類仍可使用，並呈現預設標題外觀
