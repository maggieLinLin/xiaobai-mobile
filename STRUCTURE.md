# 小白機 - 文件結構說明

## 目錄結構

```
xiaobai-mobile/
├── css/                    # CSS 模塊化文件
│   ├── base.css           # 基礎樣式和字體
│   ├── phone.css          # 手機框架和狀態欄
│   ├── settings.css       # 設置頁面樣式
│   ├── home.css           # 主屏幕和小部件樣式
│   └── apps.css           # 應用程式窗口樣式
├── js/                     # JavaScript 模塊化文件
│   ├── state.js           # 全局狀態管理
│   ├── statusbar.js       # 狀態欄功能
│   ├── home.js            # 主屏幕功能
│   ├── settings.js        # 設置頁面功能（待完成）
│   ├── apps.js            # 應用程式功能（待完成）
│   ├── calendar.js        # 日曆功能（待完成）
│   ├── music.js           # 音樂播放器功能（待完成）
│   ├── main.js            # 主初始化文件
│   └── app-complete.js    # 完整功能備份
├── index.html             # 主 HTML 文件
├── app.js                 # 原始單一 JS 文件（當前使用）
├── styles.css             # 原始單一 CSS 文件（已棄用）
├── mtwfhz.ttf            # 默認字體文件
└── README.md              # 項目說明

## 使用方式

### 當前版本（單一文件）
目前使用的是 `app.js` 和模塊化的 CSS 文件。這是最穩定的版本。

### 模塊化版本（開發中）
如需使用完全模塊化的版本，請在 `index.html` 中：
1. 註釋掉 `<script src="app.js"></script>`
2. 取消註釋模塊化 JS 文件的引入

## CSS 模塊說明

- **base.css**: 字體定義、全局重置、基礎樣式
- **phone.css**: 手機框架、邊框、狀態欄、響應式設計
- **settings.css**: 設置頁面、標籤頁、表單元素、主題按鈕
- **home.css**: 主屏幕、小部件、音樂播放器、日曆、應用圖標
- **apps.css**: 應用窗口、聊天界面、日曆應用、音樂搜索

## JS 模塊說明

- **state.js**: 狀態對象定義、localStorage 讀寫、工具函數
- **statusbar.js**: 時間更新、電池狀態顯示
- **home.js**: 頁面滑動、下拉設置、迷你日曆渲染
- **settings.js**: 設置頁面初始化、API 配置、主題切換（待完成）
- **apps.js**: 應用打開/關閉、聊天功能（待完成）
- **calendar.js**: 完整日曆、備忘錄功能（待完成）
- **music.js**: 音樂播放、搜索、收藏（待完成）
- **main.js**: 應用初始化入口

## 下一步計劃

1. 完成 settings.js 的拆分
2. 完成 apps.js 的拆分
3. 完成 calendar.js 的拆分
4. 完成 music.js 的拆分
5. 測試模塊化版本的完整功能
6. 切換到模塊化版本作為默認版本

## 注意事項

- 當前 CSS 已完全模塊化並正常工作
- JS 部分仍使用單一文件以確保穩定性
- 所有新功能應同時更新 app.js 和對應的模塊文件
