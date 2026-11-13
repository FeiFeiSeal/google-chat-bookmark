## Why

目前分類只能靠名稱與排序辨識。當分類數量增加時，使用者希望以自己選擇的顏色快速辨識分類，同時保留既有資料與預設外觀。

## What Changes

- 一般分類的右上角選單提供「編輯分類」，可在同一表單修改名稱、整張分類卡片的背景色與文字色。
- 提供常用背景色、自訂選色器、HEX 色碼輸入、表單內即時預覽，以及同時重設兩種顏色的操作。
- 已儲存的顏色套用到整張分類卡片，包含標題、書籤標題、筆記與圖示；未設定顏色時沿用目前外觀，且「未分類」不可改色。
- 顏色隨本機分類資料保存，並包含在完整備份與還原中；舊資料與舊備份仍可讀取。

## Capabilities

### New Capabilities

- `category-colors`: 定義分類顏色的編輯、顯示、保存、重設及相容行為。

### Modified Capabilities

無。主規格目錄目前沒有已同步的 capability；本變更以新 capability 描述既有分類功能的增量。

## Impact

- `src/domain/schema.ts`、`src/storage/repository.ts`、`src/backup/`：分類顏色欄位、驗證與保存。
- `src/sidepanel/App.tsx`、`src/sidepanel/styles.css`、`src/shared/messages.ts`：編輯表單、預覽與標題顯示。
- 相關單元與元件測試，以及 OpenSpec 驗證。
