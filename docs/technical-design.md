# Google Chat Bookmark Technical Design

## Milestone 1 Technical Boundary

- 沿用 `probe/` 已驗證的 Google Chat ID 擷取及 Gmail deep-link 導覽方式，但將 probe 暫存資料與產品資料完全分開。
- 第一個可安裝版本只實作 Bookmark repository、schema version、右鍵收藏、Thread 去重、Uncategorized 清單及同分頁跳轉。
- 後續欄位可先存在 domain schema 的明確預設值中，但 Milestone 1 UI 不提供尚未排入範圍的編輯或管理入口。
- 診斷區提供獨立的完整備份／還原格式；它是 storage schema 的災難復原封裝，不是 Bookmark Package schema。
- Milestone 1 必須以真實 Gmail Chat 完成一次端到端人工驗收，並驗證 extension reload 後資料仍可讀取。
- Milestone 2 先穩定 Category、Note、排序、搜尋及復原的 domain model；Milestone 3 才以該模型固定 Bookmark Package 的第一個交換格式版本。

## Verification Strategy

- Thread identity、Duplicate Bookmark、Google Chat URL parse/build、30 字元標題、storage migration 及 Bookmark Package 驗證使用單元測試，適合時依 TDD 先建立失敗案例再實作。
- Google Chat DOM 擷取、跨網域 iframe、Gmail 實際跳轉及 Message Anchor 定位使用真實 Gmail 人工驗收清單。
- 不以大量複製的 Google 私有 DOM fixture 建立脆弱的 UI 測試；只有經過抽象化且代表已知相容規則的最小 fixture 才納入自動測試。
- 每個里程碑都必須同時通過相關自動測試及該里程碑的人工驗收清單，才視為可交付給測試者。

## Supported Surface

- Manifest 使用 Version 3，設定 `minimum_chrome_version` 為 `116`，並以 `incognito: "not_allowed"` 明確停用無痕模式。
- 第一版的使用者入口與跳轉目標是 `https://mail.google.com/` 內嵌的 Google Chat。
- Side Panel 採用 tab-specific 設定，只對 `mail.google.com` 分頁啟用；導覽目標固定為開啟該 panel 的 `tabId`。
- 不實作跨視窗或跨分頁的 Gmail 目標選擇；不同 Gmail 分頁的 panel instance 共用同一份 Bookmark Library，並透過 storage change event 反映已提交的異動。
- Panel 左右位置沿用 Chrome 使用者設定，不在擴充功能中提供重複的方向設定。
- Content script 仍需注入 `https://chat.google.com/*`，因為 Gmail 將 Chat 內容載入跨網域 iframe。
- Gmail 跳轉路徑只由 `spaceId / threadId / messageId` 建立，不保存或套用 Gmail 帳號索引。
- Bookmark Library 的儲存命名空間以 Chrome Profile 為邊界，不再依 Google 帳號或 Gmail 帳號索引分區。
- 第一版不建立 Google 帳號識別資料，也不實作同一 Chrome Profile 內的帳號選擇或切換邏輯。
- 收藏及跳轉操作使用觸發操作時所在的 Gmail 分頁；Google 帳號不得作為 Bookmark 身份、擁有者或匯入比對條件。
- 獨立 Google Chat 的互動與回歸測試留待後續版本。
- 第一版不得加入 analytics、remote logging、crash reporting 或產品後端端點；執行期間不因產品功能主動向非 Google Chat／Gmail 服務送出網路請求。

## Bookmark Identity and Lookup

- Bookmark 的領域唯一性是 Google Chat `spaceId + threadId`；`messageId` 只作為 Message Anchor，不參與重複判斷。
- 儲存時以 `bookmark:<spaceId>:<threadId>` 作為每筆 Bookmark 的直接查找鍵。
- 右鍵收藏時只讀取該鍵判斷是否重複，不載入或逐筆比較整個 Bookmark Library。
- 標題或 Note 相同不代表重複，內容比較不參與唯一性判斷。
- Category 清單及排序索引與 Bookmark 記錄分開保存，避免為了重複檢查掃描整個分類結構。
- Content script 只有在 `spaceId`、`threadId`、`messageId` 及可驗證的 Google Chat URL 都完成解析後才送出建立 Bookmark 指令；不得以空字串或推測值補齊必要身份。
- 擷取錯誤以結構化錯誤碼回傳；可複製的診斷資訊只包含擴充功能版本、Chrome 版本、頁面類型、iframe/解析步驟、錯誤碼與時間，不包含 DOM 文字或使用者對話內容。

## Storage Versioning and Migration

- Bookmark Library 的本機資料保存獨立的 storage schema version；此版本與 Bookmark Package 的交換格式版本分開管理。
- 擴充功能啟動時先讀取 schema version，依序執行必要的遷移，再讓 UI 或寫入操作使用資料。
- 每個遷移必須可重複安全檢查，且不得因重新載入同一版本而重複修改資料。
- 遷移先以新結構完成並驗證，再切換目前版本；不得先清空舊資料後重建。
- 遷移失敗時停止後續寫入並保留原始資料，向使用者顯示可理解的錯誤與匯出備份入口。
- Chrome 擴充功能被移除時，本機儲存資料可能一併刪除；測試版介面與文件需提醒使用者在移除前匯出備份。
- 未封裝測試版的更新文件要求保留原安裝資料夾並使用 Chrome 的「重新載入」；不得將「移除後重新安裝」當成一般更新步驟。
- 不以 Bookmark 筆數阻擋寫入；使用 `chrome.storage.local.getBytesInUse()` 量測實際使用量，並在接近可用配額時提供備份提示。
- 效能驗收資料集至少包含 1,000 筆 Bookmark、不同大小的 Note、重複 Category 名稱及多種展開狀態。
- 分類收合時不建立其 Bookmark 的完整可見 DOM；搜尋及展開大型 Category 時須避免一次同步工作長時間阻塞側欄互動。
- 完整備份包含 storage schema version、Bookmark、Category、排序及置頂資料；不包含暫時性的 undo snapshot、編輯狀態或其他 session state。
- 還原流程先在記憶體中解析、驗證並遷移整份備份，再建立目前資料的 recovery snapshot 與 restore marker，最後批次寫入候選資料。
- `chrome.storage.local` 不視為具備資料庫 transaction；啟動時若發現未完成的 restore marker，repository 必須完成還原或從 recovery snapshot 回復，成功後才清除 marker 與 snapshot。

## Future Chrome Sync Constraint

- 預期的跨裝置方向是 Chrome 內建同步，不增加另一套 Google OAuth 登入或自建雲端服務。
- 第一版仍以本機 Bookmark Library 為準，跨裝置移轉只透過 Bookmark Package，不實作跨裝置同步，也不讀寫 Chrome 原生書籤。
- 儲存層必須透過明確的 repository 介面供產品功能使用，避免 UI 直接綁定 `chrome.storage.local`，為後續更換同步載體保留邊界。
- `chrome.storage.sync` 的官方配額約為總共 100 KB、單項 8 KB、最多 512 個項目，無法直接承載預期的大型 Bookmark Library。
- 將資料切成多個 key 不會避開總配額；是否縮減同步內容或限制同步 Library 容量，必須在未來同步版本開始前另行決定。
- 未來同步優先驗證 Chrome 原生書籤作為核心 Bookmark 的同步載體；官方目前允許 Google 帳號保存最多 100,000 筆原生書籤，且使用者既有書籤會共同計入。
- 專屬根資料夾必須位於 Chrome API 回報 `syncing: true` 的帳號書籤樹，Category 可評估映射為子資料夾，Bookmark 可評估映射為標題及 Google Chat URL。
- `BookmarkTreeNode.id` 只保證在目前 Chrome Profile 內有效，不能直接當作跨裝置 Category ID。
- 原生書籤沒有 Note、置頂與任意自訂欄位；採用前必須以技術 spike 驗證補充 metadata、跨裝置身份、衝突處理及使用者在書籤管理員直接修改資料時的行為。
- Chrome 原生書籤雙向同步屬於第二階段獨立功能；只有在技術 spike 通過且能保留完整產品行為後，才可取代或擴充第一版儲存方式。
- 第一版只建立產品功能實際需要的 repository contract、domain identity 與 schema migration 邊界，不建立通用同步框架或未被使用的 provider 系統。

## UI Preferences

- 所有第一版繁體中文介面字串集中於單一訊息模組或 locale 資源，不把顯示文字分散硬編碼在元件中；第一版不導入完整 i18n runtime。
- 日期及時間使用瀏覽器本機 locale 格式化，儲存值仍使用 ISO 8601 UTC。
- 視覺樣式以語意色彩 token 建立，透過 `prefers-color-scheme` 自動切換明暗值；元件不得直接散落硬編碼的主題色。
- 第一版不保存使用者主題偏好，也不提供手動主題切換控制。
- Category 的展開狀態以 Category ID 清單保存在瀏覽器本機儲存空間，與 Bookmark 記錄分開。
- 開啟或收合 Category 時只更新這份小型偏好資料。
- 刪除 Category 時同步移除其展開狀態；新 Category 預設收合。
- Bookmark 顯示模式與編輯模式必須分開；標題在顯示模式中維持導覽動作，只有「⋯」選單可切換到原位置編輯模式。
- 編輯內容只在使用者選取「儲存」後寫入 Bookmark；「取消」還原進入編輯模式前的值。
- 編輯中的欄位值與目前編輯項目只保存在 side panel 的記憶體狀態，不寫入 `storage.local` 或 `storage.session`；side panel 卸載時自然捨棄。
- 次要操作 icon 預設不占用持續可見的視覺注意力，但在容器 `hover` 或 `focus-within` 時都必須出現，確保滑鼠及鍵盤使用者都能操作。
- 代表目前狀態或資訊層級的控制項，例如展開箭頭及啟用中的置頂狀態，不隨 hover 隱藏。
- Side Panel 根容器限制在瀏覽器提供的可用高度；固定工具列及搜尋區，只有結果／Category 清單容器使用垂直捲動。

## Category Ordering

- Category 使用獨立的 ID 順序清單；拖曳 Category 只更新這份清單，不改變 Bookmark 的 Category 關聯。
- Bookmark 記錄與 Category 內的排序索引分開保存。
- 每個 Category 使用一份 Bookmark ID 順序清單；拖曳重排只更新該 Category 的清單。
- 跨 Category 拖曳時，在同一次儲存操作中更新來源清單、目的清單及 Bookmark 的 Category ID。
- 置頂區使用同一筆 Bookmark 記錄，不建立資料副本；只另外保存一份 pinned Bookmark ID 順序清單。
- 置頂時將 ID 插入 pinned 順序清單最前方；置頂重排或取消置頂只更新該清單，不更新任何 Category 順序。
- 若排序索引遺失或含有不存在的 ID，畫面以收藏時間排序剩餘 Bookmark，並可重建索引。
- Category 使用不可變 ID 作為身份；名稱只是可編輯的顯示資料，不作唯一性檢查。
- 匯入時以 Category ID 對應既有分類，不使用名稱對應；相同 ID 的匯入資料不得覆寫本機 Category metadata。
- Category 與 Bookmark 的拖曳操作必須從專用 drag handle 啟動，避免與展開、跳轉及其他 icon 按鈕衝突。

## Destructive Operation Recovery

- 刪除單筆 Bookmark 前建立包含該 Bookmark、Category 位置、順序及置頂狀態的復原快照。
- 刪除 Category 前建立包含 Category、Bookmark、排序及置頂狀態的完整復原快照。
- 快照與刪除操作視為同一批資料異動，避免只刪除或只還原部分資料。
- 只保留最近一次可復原操作；下一次資料異動或側欄關閉時清除快照。

## Import Validation

- Bookmark Package 必須包含明確的格式識別與 schema version，匯入前先完成整包結構驗證。
- 無法解析、格式識別錯誤或不支援的 schema version 不得進入逐項匯入。
- 逐項驗證 Bookmark 的必要 ID、Google Chat HTTPS 連結、Category 關聯及欄位型別。
- 預覽階段將項目分為可匯入、Duplicate Bookmark 與格式錯誤；只有可匯入項目會在確認後批次寫入。
- 匯出時間以 ISO 8601 UTC 儲存，顯示時轉換成目前使用者的本機時區。
- Bookmark Package 使用 JSON、固定格式識別及 schema version，不提供第一版加密層。
- 匯入內容一律視為不可信資料；標題、Note 與 Category 名稱只以純文字呈現，不解析 HTML，連結只接受驗證過的 Google Chat HTTPS 路徑。
- 欄位長度以使用者可見的 grapheme cluster 計算，避免 emoji 或組合字被拆開；Bookmark 標題與 Category 名稱上限為 30，Note 上限為 500。
- 本機編輯在輸入階段阻止超出上限；匯入時超出上限的 Bookmark 視為逐項驗證錯誤，不自動截斷。
