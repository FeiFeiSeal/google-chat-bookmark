## 1. Schema 與 Migration

- [x] 1.1 將 storage schema 升到 version 2，為 Bookmark 加入可選 `lastOpenedAt` 與 metadata revision，並以 schema 單元測試驗證合法／非法時間及 revision。
- [x] 1.2 實作 version 1 → version 2 的非破壞 migration，並以既有 v1 Library fixture 驗證 Bookmark、Message Anchor、Category、順序與置頂資料完全保留。
- [x] 1.3 擴充診斷完整備份與還原驗證以接受 v2，並以 round-trip 測試確認不包含編輯草稿、搜尋、Undo 或 UI preference。

## 2. Repository 組織操作

- [x] 2.1 建立能正規化 Category、Bookmark、order、pinned order 與展開 preference 的 snapshot view，並以缺漏／陳舊 order ID 測試驗證 fallback 排序。
- [x] 2.2 實作 Bookmark 標題／Note 更新與最近開啟時間 command，並以 repository 測試驗證 identity、Message Anchor 與 Category 不被意外改寫。
- [x] 2.3 實作 Category 建立、重新命名與展開 preference；以測試驗證同名 Category 使用不同 ID、新 Category 位於底部且預設收合、Uncategorized 不可重新命名。
- [x] 2.4 實作 Category 重排、Category 內 Bookmark 重排及跨 Category 移動，並以測試驗證一次 command 同時得到一致的關聯與來源／目的順序。
- [x] 2.5 實作置頂、取消置頂及置頂區重排，並以測試驗證 Category 關聯與 Category 內順序不變。
- [x] 2.6 加入 revision 衝突檢查與 tombstone 清理流程，並以兩個 repository instance 與中斷 fixture 驗證 stale command 被拒絕且重新初始化可取得完整狀態。

## 3. 刪除與復原

- [x] 3.1 實作單筆 Bookmark 刪除 snapshot 與 restore command，並以測試驗證 Bookmark、Category 位置、排序及置頂狀態可完整還原。
- [x] 3.2 實作 Category 批次刪除 snapshot 與 restore command，並以含多筆 Bookmark 與多筆置頂資料的測試驗證不移到 Uncategorized 且整組可完整還原。
- [x] 3.3 在 Side Panel 建立只保留最近一筆的 Undo coordinator，並以元件測試驗證下一次資料異動及 panel unmount 會使舊 Undo 失效。
- [x] 3.4 補上 Undo 衝突處理，並以 repository 測試驗證 ID 已被後續異動占用時不會執行部分還原。

## 4. Bookmark 顯示與編輯

- [x] 4.1 將 Bookmark row 拆成標題導覽、詳細資訊展開與 icon 操作，並以元件測試驗證標題點擊仍導覽、長標題單行省略、詳細資訊按需顯示。
- [x] 4.2 實作更多選單及原位置標題／Note 編輯器，並以元件測試驗證 Save 寫入、Cancel 與 unmount 捨棄草稿、空白標題停留編輯模式。
- [x] 4.3 套用 30／500 grapheme 限制與接近上限才顯示的字數提示，並以 emoji、組合字及純文字輸入測試驗證不拆字或解析 HTML。
- [x] 4.4 實作 Bookmark 刪除 icon 與 Undo snackbar，並以元件測試驗證不出現確認視窗、資料立即消失且 Undo 可恢復。

## 5. Category、置頂與排序介面

- [x] 5.1 建立 PinnedSection 與 CategorySection，並以元件測試驗證置頂 Bookmark 顯示兩處、兩處資料同步且收合 Category 不渲染子項。
- [x] 5.2 實作 Category 新增、inline rename 與展開狀態保存，並以元件／repository 整合測試驗證允許同名、Uncategorized 無 rename/delete、新建 Category 預設收合。
- [x] 5.3 實作 Category 刪除確認對話框，並以元件測試驗證顯示精確 Bookmark 數量、Cancel 無異動、Confirm 刪除全部且提供整組 Undo。
- [x] 5.4 加入 sortable 依賴及 Category、Bookmark、Pinned 三種拖曳把手，並以互動測試驗證 drop 只送出一個 repository command、取消拖曳不寫入。
- [x] 5.5 提供 Keyboard sensor 與跨 Category drop target，並以鍵盤互動測試驗證不用滑鼠也能排序或跨 Category 移動。
- [x] 5.6 為所有 icon 操作補上 tooltip、accessible name、focus 樣式與 hover/focus-within 顯示規則，並以語意查詢與鍵盤巡覽測試驗證。

## 6. 搜尋與大型 Library

- [x] 6.1 實作純函式搜尋與 ranking，並以單元測試驗證 title、Category、Note 優先層級、收合 Note 可搜尋、最近開啟與建立時間排序。
- [x] 6.2 將搜尋結果接入扁平清單，並以元件測試驗證清除搜尋後恢復原 Category 展開狀態且畫面沒有月份 selector。
- [x] 6.3 在成功送出 Gmail 導覽後記錄 `lastOpenedAt`，並以導航整合測試驗證失敗導覽不更新時間且搜尋排序會反映成功開啟。
- [x] 6.4 讓 app shell 使用可用高度、固定工具列／搜尋區及內部清單捲動，並以 1,000 筆 Bookmark fixture 驗證渲染數量、搜尋回應與主要 Category 操作符合效能驗收。

## 7. 整合驗證與測試版交付

- [x] 7.1 將新增繁體中文文案集中到 messages 模組並完成明暗 semantic token 樣式，以 lint、typecheck 及元件快照／語意測試驗證。
- [x] 7.2 更新 Milestone 2 人工驗收清單，涵蓋真實 Gmail 導覽、reload persistence、分類／編輯／刪除／Undo／拖曳／置頂／搜尋及兩個 Gmail panel 同步。
- [x] 7.3 執行完整 test、typecheck、lint、production build 與 `openspec validate add-personal-organization --strict`，並記錄全部通過的結果。
- [ ] 7.4 以原本含 v1 資料的未封裝擴充功能覆蓋新版 `dist` 後重新載入，依人工清單驗證資料 migration 與完整 Personal Organization 流程，且移除／重裝不是更新步驟。

## 8. 實機回饋修正

- [x] 8.1 將 Bookmark storage identity 改為 `spaceId + threadId + messageId`，加入 version 2 → 3 migration 並以測試驗證既有 Bookmark、分類、順序與置頂參照完整重建。
- [x] 8.2 更新建立、查找、編輯、導覽、刪除與 Undo repository contract，並以測試驗證同討論串不同訊息可建立、同一訊息仍去重。
- [x] 8.3 強化 Google Chat parser 的訊息文字擷取，並以多組 DOM fixture 驗證預設標題最多 30 個 grapheme。
- [x] 8.4 將 Category 操作改成實機可用的受控選單，補上重新命名、刪除與 Category 重排互動測試。
- [x] 8.5 移除「移到分類」控制並完成 Bookmark 跨 Category pointer／keyboard drop target，以互動測試驗證單次 drop 更新兩側順序。
- [x] 8.6 讓 Bookmark 更多操作選單於滑鼠離開該列時關閉，並以元件測試驗證不會在下次 hover 保留開啟狀態。
- [x] 8.7 依實機回饋將預設標題改為被收藏的訊息內容，移除不可靠的來源聊天室顯示與搜尋，並更新 parser、controller、搜尋及 Side Panel 測試。
- [x] 8.8 精簡 Bookmark 詳細資訊為 Note 與記錄 icon 加時間，並為跨 Category 拖曳加入自動展開、即時落點投影與目標 Category 視覺提示。
- [x] 8.9 移除搜尋上方標題列，將新增 Category icon 移到搜尋框右側，並將內容最小寬度調整為 240px。
- [x] 8.10 修正 drop 讀取舊 React state 而未保存預覽順序的問題，以同步 ref 保存最新落點；拖曳限制為垂直軸並隱藏水平溢位。
- [ ] 8.11 執行完整 test、typecheck、lint、production build 與 OpenSpec strict validation，重新載入 Chrome 未封裝擴充功能並實機核對本節修正。
