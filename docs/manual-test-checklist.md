# Milestone 1 人工驗收清單

環境：Chrome 116+、一般模式、Gmail 內嵌 Google Chat、從固定的 `dist/` 資料夾載入未封裝項目。

## 收藏與回饋

- [x] 在 Thread 訊息按右鍵選「快速收藏（未分類）」，確認顯示成功提示且 Side Panel 不會自動開啟。
- [x] 從成功提示按「復原」，確認剛建立的 Bookmark 消失，Google Chat 訊息不受影響。
- [x] 在 Thread 回覆按右鍵收藏，確認 Side Panel 新項目指向該回覆。
- [x] 再次收藏同一 Thread，確認顯示「這個討論已收藏」，原有標題與 Message Anchor 不變。
- [x] 在空白區與輸入框使用右鍵選單，確認不建立 Bookmark 且顯示可理解的錯誤。
- [ ] 從錯誤提示複製診斷資訊，確認沒有訊息文字、回覆、參與者或 DOM。

## Side Panel 與導覽

- [ ] 在 Gmail 點擴充功能 action，確認 Side Panel 開啟；切至非 Gmail 分頁時 Side Panel 不可用。
- [x] 從 Gmail 收件匣點 Bookmark，確認同一分頁進入正確 Thread 並定位保存的 Message Anchor。
- [x] 從另一個 Chat Thread 點 Bookmark，確認同一分頁精準跳轉。
- [ ] 確認長標題保持一行並顯示省略號，滑鼠提示及鍵盤焦點可取得完整標題。
- [x] 建立 Bookmark、執行 Undo 或還原時，已開啟的 Side Panel 不需 reload 即更新。

## 保存、更新與恢復

- [x] 重新載入擴充功能後，確認 Bookmark 仍存在。
- [x] 下載完整備份，確認檔名含日期且 JSON 格式識別為 `google-chat-bookmark-local-backup`。
- [x] 選擇有效備份，確認在使用者確認前資料不變，確認後完整取代並顯示結果。
- [x] 選擇無效 JSON 與不支援版本，確認拒絕且原 Library 完整保留。
- [x] 以開發測試模擬 restore marker 中斷，重新啟動後確認完成 candidate 或回復 recovery snapshot。

## 驗收紀錄

執行日期：2026-09-23

Chrome 版本：使用者目前安裝的 Chrome 116+（精確版本待填）

結果與差異：正式未封裝 build 已通過 root／reply 收藏、非訊息目標拒絕、重複去重、Undo、Side Panel 即時更新、同分頁精準導覽與 reload persistence。完整備份下載、有效還原及無效檔案拒絕均通過；restore marker 的完成 candidate／回復 recovery 路徑由自動化測試覆蓋。未發現 Chrome storage 或下載行為差異。

# Milestone 2 人工驗收清單

環境：沿用原本載入 `dist/` 的未封裝擴充功能與既有 v1 測試資料。先執行 production build，以 Chrome 擴充功能頁面的「重新載入」更新；不要移除再重裝。

## 資料升級與持久化

- [x] 覆蓋新版 `dist/` 並重新載入後，確認原本的 Bookmark、Message Anchor、分類、分類順序與置頂順序完整保留。
- [ ] 重新整理 Gmail、關閉再打開 Side Panel，確認資料、分類展開狀態與排序仍然存在。
- [ ] 下載完整備份，確認 schema version 為 2；還原後確認資料完整，編輯草稿、搜尋文字與 Undo 不會被保存。

## Bookmark 編輯與導覽

- [ ] 編輯標題與筆記後按儲存，重新開啟 Panel 後仍為新內容；按取消或直接關閉 Panel 時捨棄尚未儲存的內容。
- [ ] 空白標題不能儲存，標題 30 字與筆記 500 字限制不會切斷 emoji 或組合字。
- [ ] 長標題維持一行省略；展開詳細資訊後只顯示筆記與「記錄 icon＋時間」，不顯示 Category、「收藏時間」或來源聊天室文字。
- [ ] 從目前 Gmail Chat 與另一個 Gmail 分頁點 Bookmark，確認使用原分頁跳到保存的訊息位置；只有成功導覽才更新最近開啟時間。（目前已確認單一 Gmail 分頁可跳回保存的「新人訓練題目討論串」）

## 分類、刪除與 Undo

- [ ] 新增與重新命名分類，確認允許同名；新分類位於底部且預設收合，Uncategorized 沒有重新命名與刪除操作。
- [ ] 展開／收合多個分類後重開 Panel，確認各自狀態被保留。
- [ ] 刪除單筆 Bookmark 時不顯示確認對話框，項目立即消失；按 Undo 可恢復原分類、位置與置頂狀態。
- [ ] 刪除分類前確認對話框顯示正確 Bookmark 數量；取消後無異動，確認後分類及內容全部刪除，Undo 可整組恢復。
- [ ] 執行刪除後再做下一筆資料異動，確認舊 Undo 失效；關閉 Panel 後也不能再復原舊操作。

## 排序、置頂與替代操作

- [ ] 用滑鼠拖曳調整分類、分類內 Bookmark、跨分類 Bookmark 與置頂區順序，重新打開 Panel 後順序保持。
- [ ] 用鍵盤操作拖曳把手完成排序與跨分類移動，且介面不顯示「移到分類」選單。
- [ ] 置頂 Bookmark 同時出現在置頂區及原分類；任一處編輯後兩處同步，取消置頂後只從置頂區消失。

## 搜尋、大量資料與同步

- [ ] 搜尋標題、分類及收合中的筆記；確認標題結果優先，其次為分類，最後為筆記。
- [ ] 清除搜尋後恢復原本的分類展開狀態，畫面沒有月份 selector。
- [ ] 以 1,000 筆測試資料確認工具列與搜尋固定、清單在 Panel 內捲動，展開、搜尋與主要操作沒有明顯停頓。
- [ ] 同時開啟兩個 Gmail 分頁的 Side Panel，在其中一邊新增、編輯、刪除或排序，確認另一邊不需 reload 即同步更新。

## 驗收紀錄

執行日期：2026-09-23（進行中）

Chrome 版本：待填

結果與差異：以原本載入的未封裝擴充功能直接重新載入新版 `dist/`，Service Worker 正常啟動；既有 4 筆 Bookmark 全部保留並可在新版 Side Panel 顯示。已確認單一 Gmail 分頁可從 Bookmark 回到保存的討論串。會改動正式資料的刪除、批次刪除、拖曳與雙分頁同步仍待人工驗收。

## 自動化驗證紀錄

執行日期：2026-09-23

- `npm test -- --run`：17 個測試檔、106 個測試全部通過。
- `npm run typecheck`：通過。
- `npm run lint`：通過。
- `npm run build`：通過，production `dist/` 已更新。
- `openspec validate add-personal-organization --strict`：通過。

## 2026-09-24 實機回饋回歸

- [ ] 在 Gmail 開啟 Side Panel 後切換到其他網站分頁，確認屬於上一個 Gmail tab 的 Bookmark Side Panel 自動關閉；切回 Gmail 時不自行重新開啟。
- [ ] 在 Gmail 內從 Chat 切到收件匣再切回 Chat，確認 Bookmark Side Panel 保持開啟。
- [ ] Side Panel 開啟時讓背景分頁導覽到其他網站，確認目前 Gmail panel 不被關閉。
- [ ] 在 Google Chat 訊息按右鍵，確認有「快速收藏（未分類）」與「收藏到分類」；快速收藏後項目出現在未分類最上方。
- [ ] 從「收藏到分類」選取一個自訂分類，確認 Bookmark 直接出現在該分類最上方，未分類沒有短暫或殘留項目。
- [ ] 新增、重新命名、刪除及拖曳 Category 後再次開啟右鍵選單，確認名稱與順序同步；同名 Category 顯示可區分的順序。
- [ ] 對已收藏訊息從右鍵選取另一個分類，確認仍提示重複且不移動既有 Bookmark。
- [ ] 確認側欄頂部沒有 Google Chat／Chat Bookmark 標題列，搜尋框與新增分類 icon 顯示在同一列。
- [ ] 將 Chrome Side Panel 拖窄，確認 240px 內容寬度下搜尋、新增分類、分類標題及 Bookmark 操作仍可使用且不產生水平捲動。
- [ ] 一般分類右側固定顯示拖曳與更多操作 icon；更多操作可完成重新命名與刪除，Uncategorized 仍不可改名或刪除。
- [ ] 用分類拖曳把手交換至少兩個分類，關閉再開啟 Side Panel 後順序保持。
- [ ] 將 Bookmark 從展開的來源分類拖到另一個收合分類，確認目標分類在拖入時自動展開、項目隨游標顯示預計插入位置；放開後來源筆數、目的筆數、順序與保存分類同時更新，目標維持展開。
- [ ] 在同一分類內拖曳 Bookmark，看到預覽順序改變後立即放開；確認順序維持，關閉再開啟 Side Panel 後仍相同。
- [ ] 拖曳 Bookmark 或分類時刻意向左右大幅移動，確認項目只垂直移動，且側欄寬度與水平捲動均不變。
- [ ] 開啟 Bookmark 更多操作後將滑鼠移出整列，確認選單關閉；再次移入時保持關閉，直到再次點擊更多操作。
- [ ] 從同一討論串分別收藏起始訊息與一則回覆，確認每筆預設標題取自當次被收藏的訊息。
- [ ] 收藏一則超過 30 個可見字元的訊息，確認預設標題截為 30 字且 emoji 不被切半。
- [ ] 在同一討論串收藏兩則不同訊息，確認建立兩筆 Bookmark 且分別跳回各自訊息；再次收藏其中同一則訊息時顯示「這則訊息已收藏」。
- [ ] 由原本 schema v2 的未封裝擴充功能直接重新載入新版 `dist/`，確認原 Bookmark、分類、順序、置頂與展開狀態保持。

自動化結果：17 個測試檔、111 個測試全部通過；typecheck、lint、production build 與 OpenSpec strict validation 通過。新版 `dist/` 已完成，等待 Chrome 擴充功能頁重新載入後執行上述實機項目。
