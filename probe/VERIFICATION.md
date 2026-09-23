# 核心驗證紀錄

日期：2026-09-22
環境：使用者 Chrome，Gmail 內嵌 Google Chat，既有具回覆討論串的聊天室。

## 已實測

- Gmail Chat 內容在 chat.google.com 跨網域 iframe。
- 主訊息 DOM 可取得 message ID、thread ID、space ID。
- 多則串內回覆具有不同 message ID 與相同 thread ID。
- 原生「複製訊息連結」成功；工具無法讀到剪貼簿，由使用者貼回官方連結比對。
- 三個 DOM ID 與官方連結完全吻合。
- 官方連結在獨立 Chat 分頁正確展開同一討論串。
- Gmail 導航至首頁後，再用 #chat/space/{spaceId}/{threadId}/{messageId} 精確定位主訊息並展開回覆。
- 同樣路徑定位到一則串內回覆，焦點正確落在該回覆。

## 本機程式檢查

- JavaScript 語法檢查通過。
- core.test.cjs 通過：主訊息/回覆解析、ID 不吻合拒絕、同串 key、帳號索引保留、無效來源與 ID 拒絕。

## 尚未完成

- 真正安裝 probe 後的原生右鍵事件 → 指定 iframe 取資料 → 顯示結果 → Gmail 跳轉。
- 空白區與輸入框不誤收藏的瀏覽器實測。
- DM、多帳號、其他聊天室格式、瀏覽器重啟測試。

## 決策

精確定位可行。完整右鍵收藏流程仍需載入 probe 實測，不能僅憑 DOM 與網址測試宣告全部通過。DOM 欄位及 Gmail 深層路由為觀察到的內部格式，需要失敗保護與相容性維護。

本文件不保存真實聊天室名稱、訊息文字或識別碼。
