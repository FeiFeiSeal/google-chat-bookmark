# Google Chat Bookmark

這個產品協助使用者保存並重新找到 Google Chat 中持續進行的討論，同時讓整理結果可以在人與人之間移轉。

## Language

**Bookmark（收藏）**:
使用者保存的一個 Google Chat 討論入口，附有標題及可選筆記；它以 Thread 作為唯一對象，並保留使用者當時選中的 Message 作為跳轉位置。預設標題可以由 Thread 起始訊息的第一行初始化，但 Bookmark 不保存完整訊息、回覆或對話副本。
_Avoid_: 備份、封存訊息

**Thread（討論串）**:
Google Chat 中以一則訊息為起點、可持續新增回覆的討論。
_Avoid_: 聊天室、訊息

**Message Anchor（訊息錨點）**:
Bookmark 在 Thread 中指向的特定 Message，也是點擊 Bookmark 後預期顯示的位置。
_Avoid_: 第二筆收藏、訊息備份

**Note（筆記）**:
使用者為 Bookmark 寫下的個人檢索線索，不屬於 Google Chat 原討論內容；匯出後會成為 Bookmark Package 的一部分，接收者可以閱讀。
_Avoid_: 訊息摘要、留言

**Bookmark Library（收藏庫）**:
單一使用者擁有的全部 Bookmark；其他人的修改不會自動影響它。
_Avoid_: 團隊空間、共享資料庫

**Bookmark Package（收藏包）**:
從收藏庫選出 Bookmark 後產生的可攜式副本，供另一位使用者匯入自己的收藏庫。內容包含所選 Bookmark 的標題、Category、Note、Google Chat 連結與匯出時間，但不包含分享者身分、訊息文字、回覆內容或參與者資料。
_Avoid_: 同步、共用收藏庫

**Duplicate Bookmark（重複收藏）**:
收藏庫中指向同一個 Thread 的 Bookmark；每個收藏庫只保留其中一筆，匯入版本不修改既有 Bookmark 的標題、分類或筆記。
_Avoid_: 同名收藏、相似討論

**Inaccessible Bookmark（無法存取的收藏）**:
指向使用者目前無權查看之 Google Chat Thread 的 Bookmark。它仍保留在收藏庫，存取判斷由 Google Chat 負責。
_Avoid_: 失效收藏、已刪除收藏

**Category（分類）**:
使用者用來整理 Bookmark 的命名群組，以 ID 識別而不以名稱識別；不同 Category 可以使用相同名稱。每筆 Bookmark 只屬於一個 Category，拖曳到另一個 Category 代表移動。Bookmark Package 會保留來源分類，新分類可隨匯入加入收藏庫。
_Avoid_: 標籤、聊天室

**Uncategorized（未分類）**:
尚未由使用者整理的 Bookmark 所屬之預設 Category。右鍵收藏會立即建立 Bookmark 並放入此處，不要求使用者先填寫資料。
_Avoid_: 收件匣、草稿

**Pinned Bookmark（置頂收藏）**:
被使用者標記為重要的 Bookmark。它仍屬於原本的 Category，並同時顯示在置頂區及原 Category；兩處代表同一筆 Bookmark。
_Avoid_: 置頂分類、收藏副本
