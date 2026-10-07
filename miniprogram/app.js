/**
 * 物时 · 小程序入口
 * 首版为纯本地存储方案，不涉及登录、支付与任何敏感信息采集。
 */
const storage = require('./utils/storage')

App({
  globalData: {
    version: '1.0.0',
    // 是否需要刷新列表页（编辑/新增后回到列表时用于提示）
    dataDirty: false
  },

  onLaunch() {
    // 首次启动写入示例数据，避免空屏；用户可在「我的」一键清空
    storage.ensureInit()
  },

  onShow() {
    // 跨天使用时，状态会在各页 onShow 重新计算，无需额外处理
  }
})
