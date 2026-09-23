# 第一版延後 Chrome 原生書籤同步

第一版以 `chrome.storage.local` 保存 Bookmark Library，跨裝置移轉及同事分享只使用 Bookmark Package 的手動匯出與匯入，不申請 Chrome 書籤權限，也不讀寫原生書籤。Chrome 原生書籤雖可透過 Chrome 帳號同步大量標題、連結、資料夾及順序，但無法直接承載 Note、置頂與不可變 Category ID，且雙向編輯需要處理跨裝置身份及衝突；因此將它列為第二階段的獨立技術 spike。第一版仍以 repository 介面隔離儲存實作，待 spike 證明能完整保留產品行為後再決定同步架構。
