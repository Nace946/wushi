# 物时 · 微信小程序

> 记住每件物品的保质期与更换周期 —— 食品、药品、化妆品用**倒计时**防过期；床单、牙刷、滤芯用**正计时**提醒更换。

## 功能

| 能力 | 说明 |
|---|---|
| 倒计时模式 | 填生产日期 + 保质期（天/月/年），自动算到期日；包装只印到期日时可手动填写 |
| 正计时模式 | 记上次清洗/更换日期 + 建议周期，显示已用天数，处理完一键"重新开始计时" |
| 四档状态 | 充裕（绿）→ 临近（琥珀）→ 紧急（红）→ 已过期（灰），配色低饱和，降低焦虑感 |
| 预设模板 | 33 个常见物品一键填充（牛奶 7 天、床单 14 天、牙刷 90 天、滤芯 180 天…） |
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
│   │   ├── index/    首页总览（统计、需关注、分类入口）
│   │   ├── items/    物品列表（搜索 / 分类 / 状态 / 排序）
│   │   ├── detail/   物品详情（环形进度 + 重新计时）
│   │   ├── edit/     添加 / 编辑（预设模板 + 双模式表单）
│   │   ├── mine/     我的（统计 / 偏好 / 清空数据）
│   │   └── guide/    使用说明
│   ├── components/
│   │   ├── item-card/     物品卡片
│   │   ├── time-ring/     环形进度（conic-gradient）
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
3. 点击编译；首次启动会写入 5 条示例数据，可在「我的 → 清空所有数据」清除

重新生成 tabBar 图标（修改配色/形状后）：

```bash
python tools/gen_tabbar_icons.py
```

## 数据模型

```js
{
  id, name, icon, category,        // food / medicine / cosmetic / daily / appliance / other
  mode,                            // countdown 倒计时 | countup 正计时
  produceDate, shelfLife, shelfLifeUnit, expireDate, expireManual,
  lastDate, cycleDays,
  quantity, unit, location, remindDays, remark,
  createdAt, updatedAt
}
```

状态判定（`utils/time.js`，按自然日 UTC 计算）：

- 倒计时：`<0 已过期 / ≤3 紧急 / ≤remindDays 临近 / 其余 充裕`
- 正计时：`<0 已超期 / ≤3 该处理 / ≤remindDays 快到期 / 其余 正常`

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
