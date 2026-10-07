/**
 * 物时 · 通用工具
 */

/** 生成简易唯一 ID（本地存储场景足够，无需强随机） */
function uuid() {
  return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function toast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1800 })
}

/** 安全取值，避免 undefined 传入 setData */
function safe(value, fallback = '') {
  return value === undefined || value === null ? fallback : value
}

/** 数值夹紧 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

module.exports = { uuid, toast, safe, clamp }
