# ChatMark 網站 SEO 與 AEO 規劃

## 目標與範圍

讓搜尋「Google Chat 訊息收藏」的人能找到 ChatMark、理解目前的使用範圍，並前往 Chrome 線上應用程式商店安裝。網站同時要能直接回答使用方式、資料儲存與產品身分等常見問題。

所有內容都以目前產品實況為準：ChatMark 是獨立開發的非官方擴充功能；收藏功能只支援 `mail.google.com` 裡的 Chat 分頁與對話畫面；收藏保存在目前 Chrome 使用者設定檔，不會自動跨裝置同步。不要把獨立的 `chat.google.com` 網站寫成已支援。

Google 表示，AI Overviews 與 AI Mode 沿用一般搜尋的基礎做法，沒有額外的 AEO 專用標記要求。結構化資料應與頁面可見內容一致，也不能保證搜尋結果會顯示特殊版型。參考：[AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)、[Optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)。

## 目標查詢與對應內容

| 搜尋意圖 | 中文查詢範例 | 英文查詢範例 | 對應內容 |
| --- | --- | --- | --- |
| 找到產品 | ChatMark、Google Chat 書籤 | ChatMark Google Chat, Google Chat bookmarks | 中英文首頁：用途、主要功能、安裝連結 |
| 解決操作問題 | 如何收藏 Google Chat 訊息、如何找回 Chat 訊息 | how to bookmark Google Chat messages, find saved Google Chat messages | 首頁 Q&A；後續補操作教學 |
| 確認支援範圍 | Gmail Chat 可以用嗎、chat.google.com 可以用嗎 | does it work in Gmail Chat, standalone Google Chat support | 首頁的使用範圍與常見問題 |
| 確認資料處理 | 收藏存在哪裡、如何備份 | where are bookmarks stored, export Google Chat bookmarks | 首頁摘要與中英文隱私權政策 |

這些是內容方向，並非已驗證的熱門關鍵字。公開後再用 Search Console 的實際查詢資料決定措辭與優先順序，避免堆砌同義詞。

## 階段一：發布與確認基礎設定

目前在 `feat/site-seo-aeo` 分支已完成：中英文首頁與政策頁的標題、描述、canonical、`hreflang`、社群分享資訊；首頁的常見問題、`SoftwareApplication` JSON-LD、商店安裝連結；四頁的 `sitemap.xml`。這些修改尚未提交或部署。

接下來：

1. 將網站修改提交並合併到 `main`，確認 GitHub Pages 部署成功。
2. 檢查四個公開頁面與 sitemap 都能開啟，標題、語言對應、分享圖片和安裝連結正確。
3. 在 Google Search Console 建立 `https://feifeiseal.github.io/google-chat-bookmark/` 的網址前置字元資源，完成擁有權驗證，提交 `https://feifeiseal.github.io/google-chat-bookmark/sitemap.xml`。
4. 用網址審查確認中英文首頁及政策頁可供索引，並留意 Google 選擇的 canonical。提交 sitemap 只是提供網址線索，不保證收錄。

GitHub Pages 的專案網站無法控制 `github.io` 網域根目錄的 `robots.txt`；不在 `/google-chat-bookmark/` 放一個無效的 `robots.txt`。參考：[Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。

## 階段二：擴充首頁 Q&A 與操作教學

中英文首頁已將原有四題擴充為對應的八題 Q&A，讓訪客不必從長篇功能介紹推測答案。每題以自然提問作標題，第一句直接回答，再用一至兩句說明條件或操作；需要細節時連至隱私權政策。中文與英文題目對應相同事實，但用各語言常見的問法撰寫。此修改仍待提交與發布。

| 題目方向 | 答案必須說清楚 | 狀態 |
| --- | --- | --- |
| ChatMark 是什麼？ | 在 Gmail 內嵌 Chat 收藏、整理並返回訊息的非官方 Chrome 擴充功能。 | 已實作 |
| 如何收藏 Google Chat 訊息？ | 在 Gmail 的 Chat 對話中，對訊息按右鍵選擇快速收藏或分類。 | 已實作 |
| 可以在 `chat.google.com` 使用嗎？ | 目前只支援 `mail.google.com` 內的 Chat，不支援獨立網站。 | 已實作 |
| 分類與收藏可以怎麼整理？ | 可新增、更名、刪除、拖曳分類與收藏，也能搜尋、編輯筆記及置頂。 | 已實作 |
| 點選收藏會回到哪裡？ | 返回 Gmail 中的原始訊息；仍需有權限查看該對話。 | 已實作 |
| 收藏會同步到其他裝置嗎？ | 保存在目前 Chrome 使用者設定檔，不會自動同步或上傳給開發者。 | 已實作 |
| 如何備份與還原？ | 手動匯出整份 JSON；還原會取代目前收藏庫。 | 已實作 |
| ChatMark 是 Google 官方產品嗎？ | 獨立開發，並非由 Google 提供、贊助或背書。 | 已實作 |

Q&A 放在首頁功能與支援範圍說明之後、支援連結之前。先讓問題與答案以 HTML 文字直接呈現，使用清楚的標題層級及鍵盤可操作的連結；避免只在圖片、互動狀態或結構化資料中提供答案。內容與商店說明、實際功能和雙語隱私權政策保持一致。

這個區塊的目標是讓人快速取得正確答案，而非堆砌關鍵字。Google 說明 AI 搜尋沿用一般搜尋的基礎做法，沒有特殊的 AEO schema 要求；不依賴 `FAQPage` 或 `QAPage` 標記來取得特殊搜尋版型。參考：[AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)、[Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)、[QAPage guidelines](https://developers.google.com/search/docs/appearance/structured-data/qapage)。

優先增加一篇中英文對應的「如何在 Gmail 的 Google Chat 收藏訊息」操作教學：包含開啟 Gmail Chat、右鍵收藏、分類與搜尋、返回原訊息的步驟，配上現有的實際操作截圖。教學明示獨立 `chat.google.com` 不支援，以及查看原訊息仍需對話存取權。從首頁連到教學，教學也連回安裝頁和隱私權政策。

內容採用讀者會問的標題與簡短直接的答案，再提供必要的操作細節。不要重複產生多篇只改關鍵字的薄內容，也不加入未實作的功能、虛構評價或星等。

目前的 `SoftwareApplication` JSON-LD 用來描述產品；未來可用 Google 的 Rich Results Test 檢查，但沒有可核實的真實評價時，不應為了追求特殊搜尋版型填入虛構的 `aggregateRating` 或 `review`。參考：[Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)。

## 階段三：量測後調整

網站公開並完成 Search Console 驗證後，定期查看：

- 頁面是否被找到與收錄；若未收錄，先查網址審查結果與 canonical。
- 中英文首頁分別獲得哪些查詢、曝光、點擊與點閱率；根據真實查詢改善標題、描述及教學答案。
- Q&A 是否涵蓋 Search Console 查詢、商店留言與 GitHub Issues 中反覆出現的真實疑問；只在答案有實際價值時增補題目。
- 若 Search Console 顯示 AI 功能的成效資料，再檢查哪些頁面被引用；不要把未出現的資料當成成效不佳的證據。

首次檢查以「頁面可存取、可索引、資訊一致」為準；搜尋排名、AI 引用與安裝量都不能由這些設定保證。後續若更換 Pages 網址、自訂網域、商店網址或產品支援範圍，需同步更新 canonical、`hreflang`、sitemap、結構化資料與中英文內容。
