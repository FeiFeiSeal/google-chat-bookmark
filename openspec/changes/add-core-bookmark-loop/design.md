## Context

詳見 [proposal.md](./proposal.md) 的動機。專案目前只有靜態 UI mockup 與 `probe/` 驗證擴充功能；probe 已證明 Gmail Chat iframe 可解析 `spaceId / threadId / messageId`，且 Gmail hash route 能定位 Message Anchor，但仍使用暫存資料、popup 與保存帳號索引的舊假設。正式 Milestone 1 需要建立可演進的 Manifest V3 產品結構，同時把 Google 私有 DOM 與 deep link 視為可能改變的相容層。

此 change 只支援 Chrome 116+、一般模式與 `mail.google.com` 內嵌 Chat。資料屬於目前 Chrome Profile，無後端、無遙測、無同步；使用者會以未封裝項目安裝並從固定資料夾重新載入更新。

## Goals / Non-Goals

**Goals:**

- 建立從右鍵訊息到本機保存、Side Panel 顯示、同分頁精準跳回的完整垂直切片。
- 讓純領域規則、Chrome API 配接與 Google Chat DOM 相容層彼此分離，可分別測試及替換。
- 從第一個可用版本開始提供 schema version、migration 與可恢復的整庫備份／還原。
- 讓 Milestone 2 能在相同 Bookmark domain 與 repository 邊界上加入 Category、Note、搜尋及排序，而不讓本次預先實作其 UI。

**Non-Goals:**

- 不把 probe 的 popup、session 暫存或測試資料遷移為正式 Bookmark。
- 不實作 Category 管理、Note 編輯、搜尋、拖曳、置頂或同事分享 Bookmark Package。
- 不建立通用 provider／同步框架，不使用 `chrome.storage.sync`，也不讀寫 Chrome 原生書籤。
- 不保證獨立 `chat.google.com`、多帳號自動選擇、Edge、Firefox、無痕或觸控操作。

## Decisions

### 1. 以 Manifest V3 分隔四個執行邊界

- **Chat content script** 注入 `https://chat.google.com/*` 的所有 frame，只負責記住最近一次有效右鍵 Message 目標、解析 Google DOM 相容資料、擷取短標題素材及顯示頁內短暫提示。
- **Service worker** 擁有 context menu、Bookmark use case、repository mutation、undo token、Side Panel 啟用與跨 context 訊息協調。所有正式資料異動都經過此層。
- **Gmail tab navigation adapter** 只接受已驗證 Bookmark identity 與目前 Gmail tab URL，沿用該分頁現有 `/mail/u/<n>/` pathname 並替換 Chat hash；帳號索引不寫入 Bookmark。
- **Side Panel** 是 tab-specific extension page，只在 `mail.google.com` 啟用，讀取 repository view、監聽 storage change 並送出導覽、備份與還原命令。

此分隔沿用 probe 已驗證的 frame-targeted message flow，但移除 popup 與 `storage.session` 作為正式資料來源。相較把所有邏輯留在 content script，集中 mutation 能避免多 iframe 或多 Gmail tab 同時寫入時各自產生不同規則。

### 2. 使用 TypeScript、React、Vite 與 Vitest 建立正式產品殼

Domain、repository、Chrome adapters 與 UI 都使用 TypeScript；Side Panel 使用 React，Vite 負責多入口建置，Vitest 驗證純函式及 repository 行為。介面字串集中於繁體中文訊息模組，樣式使用 CSS 語意 token 與 `prefers-color-scheme`。

純 JavaScript 能讓 Milestone 1 更快起步，但 Milestone 2 已確認會加入多種互動狀態、拖曳、搜尋與編輯；此時才換框架會增加資料與 UI 重構。這裡只建立實際使用的模組，不建立未使用的同步 provider 或完整 i18n runtime。

### 3. Bookmark 以 Thread identity 直接索引

Bookmark identity 固定為 `spaceId + threadId`，storage key 使用 `bookmark:<spaceId>:<threadId>`；`messageId` 只是 Message Anchor。Bookmark v1 記錄必要 ID、canonical Chat URL、30 字元標題、來源聊天室名稱、`uncategorized` Category ID、建立／更新時間，以及後續 schema 已確認需要的明確預設值。

Repository 提供 `createIfAbsent`，直接讀取單一 identity key 判斷重複，避免每次右鍵收藏掃描整份 Library。首次建立同時更新 Uncategorized 順序索引；重複結果回傳既有 Bookmark，但不執行任何 write。

選擇 deterministic Thread key 而非隨機 Bookmark ID，讓重複判斷與未來匯入共享同一領域規則。Category 身份仍保留獨立 ID，避免把未來同名 Category 錯誤合併。

### 4. Google Chat DOM parser 必須 fail closed

Content script 在 capture phase 監聽 `contextmenu`，只保留兩分鐘內最近一次符合已知 Message／Thread 屬性的候選資料。Service worker 收到 Chrome context menu click 後，以 `info.frameId` 向正確 frame 讀取候選；parser 必須驗證 DOM ID 一致性、字元格式與 HTTPS Google Chat link，任一條件不符就回傳結構化錯誤，不猜測欄位。

標題優先從目前 Thread 可見的起始訊息第一行取得，使用 `Intl.Segmenter` 依 grapheme cluster 截成 30 字；起始訊息不可用時以來源聊天室名稱與本機日期產生 fallback。除最後的 Bookmark 標題與來源聊天室名稱外，不把訊息 body、回覆、參與者或 DOM snapshot 傳入 repository。

DOM selector 與 `jsdata` parser 集中在單一 adapter。若 Google 改版，只需更新此相容層；錯誤診斷僅含版本、頁面類型、解析階段、frame、錯誤碼與時間。

### 5. 成功提示的 Undo 使用可驗證 operation token

建立成功後 service worker 產生 operation token，將必要的 undo snapshot 保存在 `chrome.storage.session`，再請原 frame 顯示含「復原」與「開啟側欄」的短暫提示。Undo 只在該 token 仍是最新資料操作且目標 Bookmark 仍符合建立結果時刪除；下一個 mutation 會使前一 token 失效。

MV3 service worker 可能隨時休眠，因此不可只把 undo 狀態放在記憶體。Undo snapshot 是 session state，不進入完整備份。重複收藏沒有 mutation，也不建立 undo snapshot。

### 6. Storage repository 負責版本、遷移與讀寫保護

`chrome.storage.local` 只由 repository adapter 直接存取。Metadata 保存目前 storage schema version、Category／排序索引與 migration 狀態；Side Panel 與 use case 不依賴實際 storage key。

啟動時 repository 先執行可重複檢查的 sequential migrations。Migration 在驗證新資料前不得清除舊資料；失敗時切換成 read-only error state，保留原資料並開放診斷備份。初始版本仍建立 migration runner 與 v1 validator，避免第二個版本才補進無法驗證的升級路徑。

### 7. 診斷備份與 Bookmark Package 分成兩種格式

完整備份使用固定識別 `google-chat-bookmark-local-backup`、備份格式版本、storage schema version、`exportedAt` 與完整持久資料。它排除 undo、未儲存編輯與其他 session state，且不提供 merge。Milestone 3 的 Bookmark Package 會是另一個只含可分享欄位的 schema。

還原先在記憶體解析、驗證並遷移 candidate，使用者確認後才開始寫入。Repository 先保存 recovery snapshot、candidate 與 restore marker，再批次替換產品 keys 並重新驗證；啟動時若 marker 尚在，依 candidate 驗證結果完成還原或用 recovery snapshot 回復。開始前用 `getBytesInUse()` 估算暫存空間，不足時拒絕而不更動 Library。

此流程提供 crash recovery，但不宣稱 `chrome.storage.local` 具有資料庫 transaction。

### 8. Side Panel 以目前 Gmail tab 為唯一導覽目標

Service worker 依 tab URL 動態啟用或停用 tab-specific Side Panel。列表讀取 Uncategorized order 與 Bookmark records，標題使用單行 ellipsis，完整內容透過 tooltip 與 accessible name 提供；header 固定、列表獨立捲動。已開啟的 panel 監聽 `chrome.storage.onChanged` 重新讀取已提交 view。

點擊 Bookmark 時驗證 panel 對應 tab 仍位於 `mail.google.com`，保留目前 pathname 所代表的 Gmail 帳號環境，再導覽到 `#chat/space/<spaceId>/<threadId>/<messageId>`。不尋找其他 Gmail tab，也不把收藏來源帳號保存到 Bookmark。

## Risks / Trade-offs

- **[Google 私有 DOM 或 Gmail hash route 改變]** → Parser 與 navigation adapter fail closed、集中相容邏輯、提供隱私診斷，並以真實 Gmail 人工驗收作為發布門檻。
- **[Thread 起始訊息未載入，無法產生理想標題]** → 使用聊天室名稱與日期 fallback；Milestone 2 允許使用者再編輯標題。
- **[多 frame 的最近右鍵候選過期或錯配]** → 依 Chrome `frameId` 精確讀取、限制兩分鐘有效期、讀取後清除，必要 ID 不一致時拒絕。
- **[MV3 service worker 休眠造成暫時狀態遺失]** → 關鍵 undo 與 restore marker 使用 storage；記憶體只保存可捨棄的 UI 狀態。
- **[完整還原暫存資料使 local quota 不足]** → 還原前估算 candidate、recovery 與現有用量；空間不足時拒絕並保留原資料。
- **[使用者移除擴充功能或從新資料夾重新載入而失去原 Extension ID]** → 安裝文件要求固定資料夾、覆蓋更新、按重新載入並先做完整備份；移除擴充功能不視為支援的更新方式。
- **[React/Vite 增加 Milestone 1 初始設定量]** → 只建立 Side Panel 實際需要的最小入口；換取 Milestone 2 不必重新建立複雜互動 UI 與測試工具鏈。

## Migration Plan

1. 保留 `probe/` 作為只讀技術驗證參考，在新的正式來源目錄建立 Manifest V3 app；不讀取 `probe` 的 session 資料。
2. 建立 storage schema v1、validator、migration runner 與 Uncategorized 初始資料。
3. 先以單元測試驗證 identity、parser、grapheme 標題、duplicate、migration 與 backup validator，再接上 Chrome adapters。
4. 以未封裝項目安裝正式 build，完成右鍵收藏、Side Panel、同分頁跳轉、reload persistence 及備份還原的人工驗收。
5. 更新時覆蓋固定安裝資料夾並在 `chrome://extensions` 重新載入；回退時載入前一個 build，repository 只能讀取其支援的 schema，必要時由完整備份還原。
