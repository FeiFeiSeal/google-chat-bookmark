# ChatMark 0.1.3

## 新增與修正

- 分類可設定背景色與文字色，整張分類卡片會使用自訂顏色；可在編輯分類時預覽、輸入 HEX 色碼，並恢復預設顏色。
- 更新瀏覽器工具列圖示，改善小尺寸下的辨識度。
- 修正不同高度的分類拖曳時虛影縮放，以及往上調整分類順序後放開滑鼠會短暫跳動的問題。

## 驗證

- 137 個自動測試、typecheck、lint、production build 及 OpenSpec strict validation 通過。
- 分類顏色、240px 側欄編輯，以及分類拖曳後重新開啟側欄的順序由使用者確認實機驗收通過。

## 發布

- 從 `release-v0.1.3` 分支的 production build 製作 Chrome Web Store ZIP。
- 在 Chrome Web Store Developer Dashboard 的既有 ChatMark 項目上傳新版 ZIP，更新中英文產品說明中的分類顏色功能，核對隱私與權限申報，再提交審核。
