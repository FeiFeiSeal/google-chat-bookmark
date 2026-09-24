## 1. 專案與擴充功能基礎

- [x] 1.1 初始化 Git、加入適合 Node／Vite／Chrome build 的 `.gitignore`，並以 `git status` 驗證現有規格、mockup 與 probe 都受到版本控制而 build 產物未被追蹤。
- [x] 1.2 建立 TypeScript、React、Vite、Vitest 的最小專案設定與 npm scripts，安裝後執行 typecheck、空測試與 production build 驗證工具鏈可用。
- [x] 1.3 建立 Manifest V3、service worker、Chat content script 與 Side Panel 多入口 build，驗證輸出 manifest 設定 Chrome 116、`incognito: "not_allowed"`、必要權限及正確 host 範圍，且未包含 bookmarks、sync 或遠端服務權限。
- [x] 1.4 建立集中式繁體中文訊息模組、Side Panel 語意色彩 token 與明暗模式基礎，透過 build 與元件 smoke test 驗證兩種 color scheme 都能渲染。

## 2. Bookmark 領域規則

- [x] 2.1 先建立 Thread identity、ID 格式與 canonical Google Chat URL 的失敗測試，再實作 pure domain utilities，驗證 root／reply 共用 Thread key、Message Anchor 不參與去重且無效來源被拒絕。
- [x] 2.2 先建立 emoji、組合字、換行與 fallback 的標題測試，再以 grapheme cluster 實作 30 字元自動標題，驗證不拆開使用者可見字元。
- [x] 2.3 定義 Bookmark、Uncategorized Category、order、storage metadata 與 v1 validator，使用有效、缺欄、型別錯誤及惡意字串案例驗證 domain schema。
- [x] 2.4 建立 create-if-absent use case 與測試，驗證首次收藏保存 selected Message Anchor、重複收藏不產生 write 且完整保留既有 Bookmark。

## 3. 本機 Repository、Migration 與 Undo

- [x] 3.1 建立可注入的 Chrome storage adapter 與 repository contract，使用記憶體 adapter 測試讀取單筆 Thread key、列出 Uncategorized 及批次寫入行為。
- [x] 3.2 實作 storage schema v1 初始化與 sequential migration runner，測試同版本重跑不修改資料、可支援舊版本遷移，以及失敗時保留原始資料並進入 read-only error state。
- [x] 3.3 實作 Bookmark 建立與 Uncategorized order 更新，測試新項目置頂於清單、重複項目不改動 order，且 `chrome.storage.onChanged` 可觸發 view 重新讀取。
- [x] 3.4 實作以 `chrome.storage.session` 保存的 operation token 與單次 Undo，測試只有最新且內容仍吻合的建立操作可復原，下一次 mutation 會使舊 token 失效。

## 4. 完整診斷備份與安全還原

- [x] 4.1 定義 `google-chat-bookmark-local-backup` v1 格式、serializer 與 validator，測試備份包含所有持久 Library 資料且排除 undo、編輯與 session state。
- [x] 4.2 實作備份 JSON 下載與日期化檔名，使用測試 Library 解析下載內容並驗證格式識別、版本與 `exportedAt`。
- [x] 4.3 實作還原預檢、schema migration、容量估算與取代確認資料，測試無效檔案、不支援版本與空間不足都在任何產品資料異動前停止。
- [x] 4.4 實作 recovery snapshot、candidate、restore marker 與啟動恢復流程，測試正常還原、寫入中斷後完成 candidate，以及 candidate 無效時回復原 Library 三條路徑。

## 5. Google Chat 右鍵擷取與回饋

- [x] 5.1 從 probe 重構集中式 Google Chat DOM parser，先以最小 fixture 測試 root、reply、ID 不一致、過期候選及非訊息目標，再實作 fail-closed 解析。
- [x] 5.2 實作 content script 的 capture-phase `contextmenu` 候選擷取、兩分鐘期限、被收藏訊息的截斷標題素材與讀取後清除，透過 content-script 單元測試驗證不傳遞未截斷訊息、參與者或 DOM snapshot。
- [x] 5.3 實作 service worker context menu 與 `frameId` 精確訊息流程，使用 mocked Chrome APIs 驗證成功建立、重複、不合法 frame response 與 repository read-only 錯誤。
- [x] 5.4 實作 Chat 頁內成功、重複與錯誤提示，以及復原、開啟側欄、跳到既有 Bookmark、複製診斷 icon 動作；以元件／DOM 測試驗證不自動開 panel 且診斷 payload 不含對話內容。

## 6. Gmail Side Panel 與精準導覽

- [x] 6.1 實作依 tab URL 啟用的 tab-specific Side Panel 與 action click 行為，使用 mocked tabs／sidePanel APIs 驗證只在 `mail.google.com` 啟用且非 Gmail tab 停用。
- [x] 6.2 實作 React Side Panel 的固定 header、Uncategorized 單行列表、空狀態、內部捲動、ellipsis、tooltip 與鍵盤焦點，使用 1,000 筆 fixture 驗證 DOM／互動保持可用且頁面高度不持續增長。
- [x] 6.3 接上 repository view 與 `chrome.storage.onChanged`，測試右鍵新增、Undo 與完整還原後，已開啟 panel 不需 reload 即反映已提交資料。
- [x] 6.4 先建立 Gmail navigation adapter 測試，再實作保留目前 `/mail/u/<n>/` pathname、只替換 Chat hash 的同 tab 導覽，驗證 Bookmark 不保存帳號索引且收件匣與其他 Chat route 都能產生正確目標。
- [x] 6.5 在 Side Panel 診斷區接上完整備份下載、還原檔案選擇、取代確認與結果提示，使用 UI 測試驗證取消確認與無效檔案不修改 Library。

## 7. 文件、品質與真實 Gmail 驗收

- [x] 7.1 撰寫未封裝安裝／更新文件與人工驗收清單，驗證文件明確要求固定資料夾、覆蓋更新、Chrome 重新載入、更新前備份及禁止以移除重裝作為一般更新。
- [x] 7.2 執行權限與隱私檢查，驗證 build 無後端 URL、analytics、remote logging、Chrome bookmarks／sync 權限，且診斷與備份內容符合 specs。
- [x] 7.3 執行完整 typecheck、lint、unit/component tests 與 production build，修正所有失敗並保存通過摘要。
- [x] 7.4 在真實 Gmail Chat 人工驗收 root 訊息、reply、空白區、輸入框、重複收藏、Undo、Side Panel 更新、從收件匣與其他 Thread 精準跳回，以及 extension reload 後資料保留。
- [x] 7.5 使用真實未封裝 build 驗收完整備份、有效還原、無效檔案拒絕與模擬中斷恢復，記錄任何 Chrome storage 或下載行為差異。
- [x] 7.6 執行 `openspec validate add-core-bookmark-loop --strict` 並確認所有 planning artifacts 與實作驗收一致後，才將 Milestone 1 提供給少數信任測試者。
