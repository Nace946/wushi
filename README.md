# 物时 · 微信小程序

> 记住物品的保质期，也记住每件事的间隔 —— 食品、药品、化妆品用**倒计时**防过期；床单、牙刷、滤芯等**物品**，以及洗澡、剪指甲、距离上次吃火锅等**事件**，用**正计时**提醒。

## 功能

| 能力 | 说明 |
|---|---|
| 倒计时模式 | 填生产日期 + 保质期（天/月/年），自动算到期日；包装只印到期日时可手动填写 |
| 正计时模式 | 记上次更换/发生日期 + 循环间隔（天），显示已过天数，处理完一键"重新计时" |
| 物品 / 事件 | 正计时下可选记录类型；**物品**是有实体的东西，**事件**是发生在身上的事，各有独立分类与文案，分别显示在底部「物品」和「事件」页 |
| 纯记录事件 | 事件的**循环间隔是可选**的：关掉开关就只记录「距离上次多久」，文案变成「刚刚做完 / 有一阵没做了 / 快忘记了」，也不显示进度条 |
| 详细计时 | 正计时可开启，显示「1年2个月3天5小时」这样的细分时长（0 值段不显示） |
| 四档状态 | 充裕（绿）→ 临近（琥珀）→ 紧急（红）→ 已过期（灰），配色低饱和，降低焦虑感 |
| 预设模板 | 32 个常见物品 + 26 个常见事件一键填充（牛奶 7 天、床单 14 天、牙刷 90 天、吃火锅 30 天…） |
| 管理 | 搜索、分类 tab、状态筛选、排序偏好持久化、长按编辑/删除 |
| 数据 | 纯本地存储，不登录、不上传服务器 |

## 技术栈

- 微信**原生**小程序（WXML / WXSS / JS），无 npm 依赖
- 数据层 `miniprogram/utils/storage.js` 基于 `wx.setStorageSync`，迁移云开发时只需替换该文件
- 设计语言：新极简 + 舒缓式，主色鼠尾草绿 `#5E8C7A`

## 目录结构

```
.
├── miniprogram/
│   ├── app.js / app.json / app.wxss / sitemap.json
│   ├── pages/
│   │   ├── index/    首页总览（统计、需关注、需要处理）
│   │   ├── items/    物品列表（搜索 / 分类 / 状态 / 排序）
│   │   ├── events/   事件列表（正计时事件专用）
│   │   ├── detail/   记录详情（环形进度 + 重新计时）
│   │   ├── edit/     添加 / 编辑（预设模板 + 双模式 + 物品/事件）
│   │   ├── usage/    使用记录（物品消耗流水）
│   │   ├── mine/     我的（统计 / 偏好 / 清空数据）
│   │   └── guide/    使用说明
│   ├── components/
│   │   ├── item-card/     记录卡片
│   │   ├── time-ring/     环形进度（conic-gradient）
│   │   ├── snackbar/      底部提示条（含撤销）
│   │   └── empty-state/   空状态
│   ├── utils/         storage / time / constants / util
│   └── assets/tabbar/ tabBar 图标（脚本生成）
├── tools/gen_tabbar_icons.py   重新生成 tabBar 图标（纯标准库）
├── project.config.json
└── 小程序项目档案.md            开发进度 / 接口 / 待办 / 提审记录
```

## 运行

1. 微信开发者工具 → 导入项目 → 选择本目录
2. 将 `project.config.json` 中的 `appid` 从 `touristappid` 替换为你的小程序 AppID
3. 点击编译；首次启动会写入 8 条示例数据（含有/无循环间隔两种事件），可在「我的 → 清空所有数据」清除

重新生成 tabBar 图标（修改配色/形状后）：

```bash
python tools/gen_tabbar_icons.py
```

## 数据模型

```js
{
  id, name, icon, category,
  kind,                            // item 物品 | event 事件（事件仅正计时）
  mode,                            // countdown 倒计时 | countup 正计时
  produceDate, shelfLife, shelfLifeUnit, expireDate, expireManual,
  lastDate, cycleDays, detailTiming,   // cycleDays 为空且 kind=event 时 = 纯记录（不提醒、无进度条）
  quantity, unit, location, remindDays, remark,
  createdAt, updatedAt
}
```

状态判定（`utils/time.js`，按自然日 UTC 计算）：

- 倒计时：`<0 已过期 / ≤3 紧急 / ≤remindDays 临近 / 其余 充裕`
- 正计时（有循环间隔）：`<0 已超期 / ≤urgentDays 该处理 / ≤soonDays 快到期 / 其余 正常`（物品与事件措辞不同）
  - 阈值随周期缩放：`urgentDays = cycle ≥ 7 ? 3 : floor(cycle × 0.25)`，`soonDays = max(urgentDays, min(remindDays, floor(cycle / 2)))`
- 正计时（纯记录，无循环间隔）：按已过去天数取档位 —— 刚刚做完 / 才做过不久 / 有一阵没做了 / 很久没做了 / 快忘记了

## 已知限制

- 环形进度使用 `conic-gradient`，极低版本 WebView 会退化为纯色环（不影响功能）
- 本地存储无云同步，卸载或换机会丢失数据
- 预设的保质期/周期为经验值，请以商品包装标注为准

## 后续规划

1. 真机适配与性能打磨
2. 微信流量主广告接入（需 UV 达标后开通）
3. 云开发多端同步、订阅消息过期推送
4. 批量操作、物品归档

## 许可

未指定 License，默认保留所有权利。
