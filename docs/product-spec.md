# Google Chat Bookmark Product Spec

## Product Goal

協助使用者在 Gmail 內的 Google Chat 快速收藏、整理及重新開啟持續進行的討論，並能把整理結果以副本交給同事。

## Delivery Milestones

### Milestone 1 — Core Bookmark Loop

- 在 Gmail Chat Message 上透過右鍵立即收藏。
- 保存 Thread 身份及當時選中的 Message Anchor，並以完整 Message Anchor 識別 Bookmark。
- 新 Bookmark 放入 Uncategorized，並使用最多 30 個字元的自動標題。
- Gmail 專用 Side Panel 顯示已收藏的單行標題。
- 點擊標題後在承載 Side Panel 的同一 Gmail 分頁精準跳回 Message Anchor。
- 再次收藏同一則訊息不建立第二筆；同一 Thread 的不同訊息可分別收藏。
- 重新載入未封裝擴充功能後，既有 Bookmark 仍存在。
- 診斷區提供整份本機 Library 的簡易備份與還原，供早期測試及更新前保護資料。
- Category 管理、Note、搜尋、拖曳、置頂及 Bookmark Package 不納入這個里程碑。

### Milestone 2 — Personal Organization

- 提供 Bookmark 標題及 Note 編輯。
- 提供 Category 新增、重新命名、刪除、展開狀態及順序管理。
- 提供 Bookmark 在 Category 內排序及跨 Category 移動，拖入收合分類時自動展開並即時顯示預計落點。
- 提供置頂、單筆刪除、Category 批次刪除及相對應的復原行為。
- 提供標題、Note 與 Category 搜尋。

### Milestone 3 — Portable Sharing

- 提供整個 Bookmark Library 或單一 Category 的匯出預覽及 JSON Bookmark Package。
- 提供整包格式驗證、逐筆驗證、Duplicate Bookmark 判斷及匯入預覽。
- Milestone 3 開始後固定第一個公開的 Bookmark Package schema version；後續格式變更必須保持版本化處理。

## First Release Scope

- Google Chrome 擴充功能；第一版不支援 Microsoft Edge 或 Firefox。
- 第一版最低支援 Chrome 116，不支援無痕模式。
- 第一版只正式支援 Gmail 內嵌的 Google Chat。
- Bookmark Side Panel 只在 `mail.google.com` 分頁啟用；切換到其他網站時不保持可用。
- Side Panel 顯示在左側或右側由使用者的 Chrome 設定決定，產品不強制固定位置。
- Bookmark 一律在 Gmail 中開啟；獨立 `chat.google.com` 不列入第一版驗收範圍。
- Bookmark Library 保存於目前裝置及 Chrome 設定檔。
- 每個 Chrome Profile 各自保存一份 Bookmark Library。
- 第一版的收藏與跳轉以目前開啟的 Gmail 帳號為準，不提供同一個 Chrome Profile 內的多帳號辨識、切換或資料管理。
- 第一版不提供跨裝置同步；未來希望使用 Chrome Sync，讓使用者登入 Chrome 並啟用同步後，自動在自己的裝置間同步。
- 第一版跨裝置移轉或同事分享只使用 Bookmark Package 的手動匯出／匯入，不讀寫 Chrome 原生書籤。
- 使用者接受未來將核心 Bookmark 放入 Chrome 原生書籤的「Google Chat Bookmark」專屬資料夾；這些項目也會出現在 Chrome 書籤管理員中。
- 原生書籤同步仍須完整保留本產品的 Note、置頂及 Category 行為，不能以靜默捨棄欄位換取同步。
- 不建立多人共同編輯或即時同步的收藏庫。
- 第一階段以 Chrome「載入未封裝項目」安裝，供使用者本人及少數信任的同事測試。
- Chrome Web Store、公開發佈及組織部署不屬於第一階段範圍。
- 測試者將擴充功能保留在固定資料夾；收到新版時覆蓋同一資料夾內容，再於 `chrome://extensions` 重新載入，不先移除舊擴充功能。
- 重大資料格式更新前提醒測試者先匯出 Bookmark Package 備份。
- Milestone 3 尚未提供 Bookmark Package 前，更新前備份使用診斷區的完整本機備份。
- 重新載入或更新測試版不得清空既有 Bookmark Library；資料格式改變時由擴充功能自動遷移。
- 擴充功能若無法安全完成資料遷移，不得以空白資料覆寫原資料，並應提示使用者保留或匯出原始資料。
- 第一版不設定 Bookmark 筆數上限；可用容量依 Chrome 實際回報的本機儲存用量判斷。
- 以包含 1,000 筆 Bookmark 的資料集驗收側欄捲動、Category 操作及搜尋效能。
- 只有接近本機儲存容量時才顯示低干擾的匯出備份提示，平常不持續顯示容量警告。

## Interaction Principle

- 日常操作應避免打斷使用者閱讀 Google Chat。
- 可安全復原的單筆操作直接執行，以短暫提示回報結果。
- 只有一次影響多筆資料或無法輕易復原的操作才要求確認。
- 側欄以簡約、節省寬度為原則；編輯、拖曳、置頂、刪除及更多操作優先使用一致的 icon。
- 側欄不顯示獨立產品標題列；搜尋框位於頂部，新增 Category icon 放在搜尋框右側。
- 擴充功能內容最低支援 240px 寬度；Chrome Side Panel 外框寬度由使用者透過瀏覽器分隔線調整。
- Icon 按鈕必須提供滑鼠提示、鍵盤焦點狀態及可供輔助技術辨識的名稱。
- 展開箭頭與已置頂狀態持續顯示；拖曳、編輯及更多操作的 icon 在滑鼠移入或鍵盤聚焦時顯示。
- 第一版只設計桌面版 Chrome 的滑鼠與鍵盤操作，不以觸控操作作為驗收範圍。
- 第一版介面只提供繁體中文；多國語系留待後續版本。
- Bookmark 標題、Category 名稱與 Note 支援 Unicode 文字，不因第一版介面語言限制使用者內容。
- Side Panel 第一版自動跟隨 Chrome／作業系統的明暗模式，不提供產品內的主題切換設定。
- 開發採用可完整操作的最小垂直切片逐步驗證；只為已確認的未來需求保留清楚邊界，不預先實作尚未需要的同步與抽象層。

## Capture and Navigation

- 使用者在 Google Chat Message 上按右鍵即可立即建立 Bookmark，不需先填表單。
- 若無法從右鍵目標辨識必要的 Thread 或 Message 身份，不建立 Bookmark，並顯示「目前無法讀取這則訊息，請重新整理 Gmail 後再試」。
- 擷取失敗提示提供以 icon 呈現的「複製診斷資訊」動作；診斷資訊不得包含訊息文字、回覆或參與者資料。
- 手動貼上 Google 訊息連結的備援入口不納入 Milestone 1，只有實際測試顯示經常需要時才排入後續里程碑。
- 新 Bookmark 先放入 Uncategorized，使用者可稍後整理標題、Category 及 Note。
- 預設標題取自使用者實際收藏的訊息內容；無法取得時使用收藏日期作為暫時標題。
- 收藏成功後顯示短暫提示及「復原」「開啟側欄整理」動作，不自動展開側欄。
- Bookmark 以 Message Anchor 作為唯一對象；同一 Thread 可保存多則不同訊息。
- 點擊 Bookmark 直接在 Gmail 開啟 Thread，並定位到保存的 Message Anchor。
- 點擊 Bookmark 使用承載目前 Side Panel 的同一個 Gmail 分頁跳轉；即使該分頁目前位於收件匣或其他 Gmail 畫面也相同。
- 點擊 Bookmark 標題一律執行跳轉，不使用標題點擊進入編輯。
- 每筆 Bookmark 的「⋯」選單提供「編輯」；選取後在原位置展開標題與 Note 欄位，並提供明確的「儲存」及「取消」。
- 只有按下「儲存」才會更新 Bookmark；按下「取消」、關閉側欄、重新載入擴充功能或離開編輯狀態時，直接捨棄未儲存內容。
- 不保存未儲存草稿或「正在編輯」的 UI 狀態；下次開啟側欄一律回到顯示模式。
- 再次收藏同一則訊息時，不更改既有 Bookmark 或 Message Anchor；同一 Thread 的不同訊息可各自收藏。
- 重複收藏不視為錯誤；顯示「這則訊息已收藏」，並提供「跳到 Bookmark」及「開啟側欄」。
- 主清單只顯示 Bookmark 標題；可收合詳細資訊只顯示 Note 與「記錄 icon＋收藏時間」，不顯示 Category 或「收藏時間」文字標籤。
- Bookmark 標題最多 30 個使用者可見字元，主清單固定單行、不折行，超過可用寬度時以省略號顯示，完整標題可透過輔助提示查看。
- Side Panel 使用目前瀏覽器可用高度；工具列與搜尋區保持可見，Bookmark 列表使用內部垂直捲動，不隨資料量持續拉高頁面。

## Categories

- 每筆 Bookmark 只屬於一個 Category。
- 拖曳 Bookmark 到另一個 Category 代表移動。
- 拖曳 Bookmark 進入收合的 Category 時會暫時展開，並在清單內即時顯示預計插入位置；放開後保存落點並維持目標 Category 展開。
- Bookmark 與 Category 排序只產生垂直視覺位移；向左右拖曳不建立水平捲動，也不改變 Side Panel 寬度。
- 新 Bookmark 預設屬於 Uncategorized。
- 匯入的新 Bookmark 沿用 Bookmark Package 中的 Category；不存在的 Category 會加入收藏庫。
- 側欄重新開啟時，恢復各 Category 上次的展開或收合狀態。
- 第一次使用及新建立或匯入的 Category 預設收合；Uncategorized 不強制展開。
- Pinned Bookmark 同時顯示於側欄頂部的置頂區及原 Category。
- 置頂不改變 Bookmark 的 Category，兩處顯示共用同一筆資料。
- 置頂區使用獨立的自訂順序，新置頂的 Bookmark 放在最上方，使用者可透過拖曳把手重新排列。
- 調整或取消置頂不改變 Bookmark 在原 Category 中的位置。
- 尚未手動排序的 Category 依收藏時間由新到舊顯示。
- 使用者可拖曳 Bookmark 改變同一 Category 內的順序；第一次拖曳後，該 Category 使用自訂順序。
- 新建立的 Bookmark 放在所屬 Category 最上方。
- 匯入的一批 Bookmark 接在既有 Bookmark 後方，避免打亂使用者原本的常用順序。
- Category 以 ID 判斷是否相同，名稱不需要唯一。
- 新增、重新命名或匯入時允許存在多個同名 Category，不自動合併。
- Category 名稱最多 30 個使用者可見字元，固定單行顯示，超過可用寬度時以省略號顯示。
- 使用者可透過 Category 標題旁的專用拖曳把手調整 Category 順序。
- 只有拖曳把手會啟動 Category 排序；點擊 Category 標題仍只負責展開或收合。
- 新建及匯入的 Category 預設放在現有 Category 清單最下方。

## Deletion

- 刪除單筆 Bookmark 時立即執行，不顯示確認視窗。
- 刪除後顯示復原提示；復原機會保留到下一個操作或關閉側欄為止。
- 刪除 Bookmark 不影響 Google Chat 的原始 Thread 或 Message。
- 刪除包含 Bookmark 的 Category 前，確認畫面明確顯示其中的 Bookmark 數量。
- 使用者確認後，Category 及其中全部 Bookmark 一起刪除，不移至 Uncategorized。
- 刪除 Category 及 Bookmark 仍不影響 Google Chat 的原始 Thread 或 Message。
- 刪除 Category 後提供一次整組復原，可還原 Category、其中 Bookmark、原本順序及置頂狀態。
- 批次刪除的復原機會保留到下一個資料異動或關閉側欄為止。

## Import and Export

- 使用者可將整個 Bookmark Library 或單一 Category 匯出成 Bookmark Package，供其他人匯入。
- 匯出前顯示所選範圍（整個 Library 或單一 Category）的內容預覽及筆數。
- Bookmark Package 包含標題、Category、Note 和 Google Chat 連結。
- Bookmark Package 不包含訊息文字、回覆內容或參與者資料。
- 同一 Thread 在收藏庫中只保留一筆 Bookmark。
- 匯入 Duplicate Bookmark 時，略過匯入版本並完整保留本機既有資料。
- 匯入後的資料是獨立副本，雙方後續修改不會同步。
- 匯入遇到既有 Category ID 時，使用本機 Category，保留本機名稱、位置與排序。
- 同一 Category ID 在收藏包中的名稱不同時，不覆寫本機名稱；新的 Bookmark 接在既有內容後方。
- 匯入前顯示有效、重複及錯誤項目的數量與預覽，確認前不修改收藏庫。
- 無法解析、不是 Bookmark Package 或版本不支援的檔案整包拒絕。
- 結構有效的收藏包若含少數無效 Bookmark，跳過並列出無效項目，其餘有效 Bookmark 仍可匯入。
- Bookmark Package 記錄匯出時間，但不記錄分享者名稱、Google 帳號或 Email。
- 第一版可匯出整個 Bookmark Library，或匯出單一 Category。
- 第一版不提供逐筆勾選匯出。
- 兩種匯出範圍都必須先顯示內容預覽及 Bookmark 筆數，再產生 Bookmark Package。
- 第一版 Bookmark Package 使用未加密的 JSON 檔案。
- 匯出預覽提醒使用者：檔案接收者可直接閱讀 Bookmark 標題、Note 與 Google Chat 連結，應只分享給適當的人。
- 診斷用完整備份屬於個人災難復原資料，不是 Bookmark Package，不提供選擇範圍或與既有資料合併，也不應用於同事分享。
- 診斷還原必須先驗證備份格式、顯示將完整取代目前本機 Library 的確認，再執行可在中斷後恢復的安全還原。

## Field Limits

- Bookmark 標題最多 30 個使用者可見字元。
- Category 名稱最多 30 個使用者可見字元。
- Note 最多 500 個使用者可見字元。
- 自動產生的標題只取前 30 個字元；使用者手動輸入不得超過上限。
- 字數提示平常隱藏，只在輸入接近上限時顯示。
- 匯入欄位超過限制時，該筆 Bookmark 列為格式錯誤，不得靜默截斷。

## Access

- Google Chat 負責判斷使用者是否有權存取 Thread。
- 工具不複製對話內容、不提升權限，也不預先判斷存取權限。
- Inaccessible Bookmark 仍保留在收藏庫，由使用者自行處理。
- 建議不同的主要 Gmail 帳號使用不同的 Chrome Profile；這是第一版的支援邊界，不由程式強制限制登入帳號數量。
- 未來若使用 Chrome 原生書籤，擴充功能需要申請讀取及變更書籤的權限，並在啟用前清楚說明用途。
- 第一版不申請 Chrome 書籤權限。
- 第一版不連接產品後端、不收集遙測，也不自動傳送錯誤或使用統計。
- 診斷資訊只有在使用者主動選取「複製診斷資訊」後進入剪貼簿，是否分享及分享給誰由使用者決定。

## Search

- 搜尋範圍包含 Bookmark 標題、Note 及 Category 名稱。
- Note 即使處於收合狀態也參與搜尋。
- 不搜尋或索引 Google Chat 的訊息、回覆及參與者內容。
- 輸入搜尋文字時，以扁平清單顯示結果，不依 Category 分組。
- 搜尋結果依序優先顯示標題符合、Category 符合、Note 符合的 Bookmark；同一層級依最近開啟時間排序。
- 清除搜尋後恢復搜尋前各 Category 的展開與收合狀態。
- 第一版不提供月份篩選下拉選單。
