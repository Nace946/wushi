/**
 * 物时 · 本地数据层
 * 首版使用 wx.setStorageSync 持久化；后续迁移云开发时只需替换本文件实现
 */

const time = require('./time')
const util = require('./util')
const { MODE, PRESETS } = require('./constants')

const KEY_ITEMS = 'wushi_items_v1'
const KEY_INIT = 'wushi_inited_v1'
const KEY_SETTINGS = 'wushi_settings_v1'

const DEFAULT_SETTINGS = {
  sortKey: 'urgent', // urgent | name | recent
  showOver: true, // 列表是否显示已过期物品
  dailyRemind: true, // 进入时是否提示待处理物品
  reduceMotion: false // 降低动效（舒缓式可访问性选项）
}

/** 读取全部物品 */
function getAll() {
  try {
    const list = wx.getStorageSync(KEY_ITEMS)
    return Array.isArray(list) ? list : []
  } catch (e) {
    console.error('[storage] 读取失败', e)
    return []
  }
}

/** 整体写回 */
function saveAll(list) {
  try {
    wx.setStorageSync(KEY_ITEMS, list)
    return true
  } catch (e) {
    console.error('[storage] 写入失败', e)
    wx.showToast({ title: '保存失败，存储空间不足', icon: 'none' })
    return false
  }
}

function getById(id) {
  return getAll().find(i => i.id === id) || null
}

/** 新增，返回完整对象 */
function add(item) {
  const list = getAll()
  const now = Date.now()
  const full = Object.assign(
    {
      id: util.uuid(),
      name: '',
      icon: '📦',
      category: 'other',
      mode: MODE.COUNTDOWN,
      produceDate: '',
      shelfLife: '',
      shelfLifeUnit: 'day',
      expireDate: '',
      expireManual: false,
      lastDate: '',
      cycleDays: '',
      quantity: 1,
      unit: '份',
      location: '',
      remindDays: 7,
      remark: '',
      createdAt: now,
      updatedAt: now
    },
    item,
    { id: item.id || util.uuid(), createdAt: now, updatedAt: now }
  )
  list.unshift(full)
  saveAll(list)
  return full
}

/** 局部更新 */
function update(id, patch) {
  const list = getAll()
  const idx = list.findIndex(i => i.id === id)
  if (idx === -1) return null
  list[idx] = Object.assign({}, list[idx], patch, { updatedAt: Date.now() })
  saveAll(list)
  return list[idx]
}

function remove(id) {
  const list = getAll().filter(i => i.id !== id)
  return saveAll(list)
}

function clearAll() {
  return saveAll([])
}

/** 正计时：记录一次「已更换/已清洗」，重置计时 */
function resetCycle(id) {
  return update(id, { lastDate: time.today() })
}

/** 设置读写 */
function getSettings() {
  try {
    const s = wx.getStorageSync(KEY_SETTINGS)
    return Object.assign({}, DEFAULT_SETTINGS, s || {})
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS)
  }
}

function saveSettings(patch) {
  const next = Object.assign(getSettings(), patch || {})
  try {
    wx.setStorageSync(KEY_SETTINGS, next)
  } catch (e) {
    console.error('[storage] 设置保存失败', e)
  }
  return next
}

/** 首次启动：写入示例数据（用户可在「我的」一键清空） */
function ensureInit() {
  let inited = false
  try {
    inited = !!wx.getStorageSync(KEY_INIT)
  } catch (e) {
    inited = false
  }
  if (inited) return false

  const t = time.today()
  const demo = [
    {
      name: '鲜牛奶',
      icon: '🥛',
      category: 'food',
      mode: MODE.COUNTDOWN,
      produceDate: time.addDays(t, -3),
      shelfLife: 7,
      shelfLifeUnit: 'day',
      quantity: 2,
      unit: '瓶',
      location: '冰箱冷藏',
      remindDays: 2,
      remark: '示例数据，可长按删除'
    },
    {
      name: '酸奶',
      icon: '🍶',
      category: 'food',
      mode: MODE.COUNTDOWN,
      produceDate: time.addDays(t, -16),
      shelfLife: 14,
      shelfLifeUnit: 'day',
      quantity: 4,
      unit: '盒',
      location: '冰箱冷藏',
      remindDays: 3
    },
    {
      name: '感冒药',
      icon: '💊',
      category: 'medicine',
      mode: MODE.COUNTDOWN,
      produceDate: time.addDays(t, -400),
      shelfLife: 2,
      shelfLifeUnit: 'year',
      quantity: 1,
      unit: '盒',
      location: '药箱',
      remindDays: 30
    },
    {
      name: '床单被套',
      icon: '🛏️',
      category: 'daily',
      mode: MODE.COUNTUP,
      lastDate: time.addDays(t, -9),
      cycleDays: 14,
      quantity: 1,
      unit: '套',
      location: '卧室',
      remindDays: 3
    },
    {
      name: '牙刷',
      icon: '🪥',
      category: 'daily',
      mode: MODE.COUNTUP,
      lastDate: time.addDays(t, -95),
      cycleDays: 90,
      quantity: 1,
      unit: '支',
      location: '卫生间',
      remindDays: 7
    }
  ].map(i =>
    Object.assign({}, i, {
      id: util.uuid(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  )

  saveAll(demo)
  try {
    wx.setStorageSync(KEY_INIT, 1)
  } catch (e) {
    // 忽略
  }
  return true
}

/** 从预设模板创建（补全字段） */
function buildFromPreset(preset) {
  return {
    name: preset.name,
    icon: preset.icon,
    category: preset.category,
    mode: preset.mode,
    produceDate: preset.mode === MODE.COUNTDOWN ? time.today() : '',
    shelfLife: preset.shelfLife || '',
    shelfLifeUnit: preset.shelfLifeUnit || 'day',
    expireDate: '',
    expireManual: false,
    lastDate: preset.mode === MODE.COUNTUP ? time.today() : '',
    cycleDays: preset.cycleDays || '',
    quantity: 1,
    unit: preset.unit || '份',
    location: preset.location || '',
    remindDays: preset.remindDays || 7,
    remark: ''
  }
}

module.exports = {
  KEY_ITEMS,
  DEFAULT_SETTINGS,
  getAll,
  saveAll,
  getById,
  add,
  update,
  remove,
  clearAll,
  resetCycle,
  getSettings,
  saveSettings,
  ensureInit,
  buildFromPreset,
  PRESETS
}
