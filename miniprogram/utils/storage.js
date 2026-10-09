/**
 * 物时 · 本地数据层
 * 首版使用 wx.setStorageSync 持久化；后续迁移云开发时只需替换本文件实现
 */

const time = require('./time')
const util = require('./util')
const { MODE, KIND, PRESETS, PIN_LIMIT } = require('./constants')

const KEY_ITEMS = 'wushi_items_v1'
const KEY_INIT = 'wushi_inited_v1'
const KEY_SETTINGS = 'wushi_settings_v1'

const DEFAULT_SETTINGS = {
  sortKey: 'urgent', // urgent | name | recent
  showOver: true, // 列表是否显示已过期物品
  dailyRemind: true, // 进入时是否提示待处理物品
  reduceMotion: false // 降低动效（舒缓式可访问性选项）
}

/** 读取全部物品（含事件）；旧数据无 kind 字段时按「物品」补齐 */
function getAll() {
  try {
    const list = wx.getStorageSync(KEY_ITEMS)
    if (!Array.isArray(list)) return []
    return list.map(i => (i && i.kind ? i : Object.assign({}, i, { kind: KIND.ITEM })))
  } catch (e) {
    console.error('[storage] 读取失败', e)
    return []
  }
}

/** 只取物品（不含事件） */
function getItems() {
  return getAll().filter(i => i.kind !== KIND.EVENT)
}

/** 只取事件 */
function getEvents() {
  return getAll().filter(i => i.kind === KIND.EVENT)
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
      kind: KIND.ITEM, // item 物品 | event 事件
      mode: MODE.COUNTDOWN,
      produceDate: '',
      shelfLife: '',
      shelfLifeUnit: 'day',
      expireDate: '',
      expireManual: false,
      lastDate: '',
      lastAt: 0, // 正计时起点精确时刻（毫秒，所有正计时都写）；0 = 按上次日期当天 0 点计
      cycleDays: '',
      quantity: 1,
      unit: '份',
      location: '',
      remindDays: 7,
      detailTiming: false, // 正计时：是否显示 年/月/日/时 细分时长
      pinned: false, // 是否置顶到首页「置顶」分组
      pinnedAt: 0, // 置顶时间（毫秒），用于按置顶先后排序
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

/** 正计时：记录一次「已更换/已清洗」或「刚刚发生过」，重置计时（起点落到此刻） */
function resetCycle(id) {
  // 起点精确时刻对所有正计时都有效，不必等用户开「详细计时」
  return update(id, { lastDate: time.today(), lastAt: Date.now() })
}

/** 每件物品最多保留的消耗流水条数 */
const USAGE_LOG_LIMIT = 40

/** 取全部置顶记录（按置顶时间先后，先置顶的排前面） */
function getPinned() {
  return getAll()
    .filter(i => i && i.pinned)
    .sort((a, b) => (Number(a.pinnedAt) || 0) - (Number(b.pinnedAt) || 0))
}

/** 已置顶数量（可排除某条，用于判断「改这条时是否还占着名额」） */
function countPinned(excludeId) {
  return getAll().filter(i => i && i.pinned && i.id !== excludeId).length
}

/**
 * 置顶 / 取消置顶
 * 置顶名额满时不会写入，返回 { ok:false, reason:'full' } 交由页面提示
 * @param {String} id
 * @param {Boolean} on
 * @returns {{ok:Boolean, reason?:String, item?:Object, limit:Number, used:Number}}
 */
function setPinned(id, on) {
  const list = getAll()
  const idx = list.findIndex(i => i.id === id)
  if (idx === -1) return { ok: false, reason: 'missing', limit: PIN_LIMIT, used: 0 }

  const used = list.filter(i => i && i.pinned && i.id !== id).length
  if (on && used >= PIN_LIMIT) {
    return { ok: false, reason: 'full', limit: PIN_LIMIT, used }
  }

  list[idx] = Object.assign({}, list[idx], {
    pinned: !!on,
    pinnedAt: on ? Date.now() : 0,
    updatedAt: Date.now()
  })
  saveAll(list)
  return { ok: true, item: list[idx], limit: PIN_LIMIT, used: on ? used + 1 : used }
}

/**
 * 用掉 n 个：减少数量并记一笔消耗流水
 * @returns {null|{item:Object, logId:String, before:Number, after:Number, n:Number}}
 */
function useItem(id, n) {
  const item = getById(id)
  if (!item) return null
  const num = Number(n) || 1
  const before = Number(item.quantity) || 0
  const after = Math.max(0, before - num)

  const log = {
    id: util.uuid(),
    t: time.today(),
    ts: Date.now(),
    n: num,
    unit: item.unit || ''
  }
  const logs = Array.isArray(item.usageLog) ? item.usageLog.slice(0, USAGE_LOG_LIMIT - 1) : []
  logs.unshift(log)

  const updated = update(id, { quantity: after, usageLog: logs })
  return { item: updated, logId: log.id, before, after, n: num }
}

/** 撤销一次消耗：数量加回并删除该条流水 */
function undoUse(id, logId) {
  const item = getById(id)
  if (!item) return null
  const logs = Array.isArray(item.usageLog) ? item.usageLog : []
  const log = logs.find(l => l.id === logId)
  if (!log) return null

  const cur = Number(item.quantity) || 0
  return update(id, {
    quantity: cur + (Number(log.n) || 1),
    usageLog: logs.filter(l => l.id !== logId)
  })
}

/**
 * 批量撤销：把连续多次「用掉」一次性还原
 * @param {String} id 物品 id
 * @param {Array} logIds 需要撤销的流水 id 列表
 */
function undoUseBatch(id, logIds) {
  const item = getById(id)
  if (!item) return null
  const set = {}
  ;(logIds || []).forEach(x => {
    set[x] = true
  })

  const logs = Array.isArray(item.usageLog) ? item.usageLog : []
  let back = 0
  const kept = logs.filter(l => {
    if (set[l.id]) {
      back += Number(l.n) || 1
      return false
    }
    return true
  })
  if (!back) return item

  const cur = Number(item.quantity) || 0
  return update(id, { quantity: cur + back, usageLog: kept })
}

/** 清空某物品的消耗流水 */
function clearUsage(id) {
  return update(id, { usageLog: [] })
}

/** 汇总全部消耗流水（时间倒序），供记录页使用 */
function getAllUsage() {
  const list = getAll()
  const out = []
  list.forEach(item => {
    const logs = Array.isArray(item.usageLog) ? item.usageLog : []
    logs.forEach(l => {
      out.push({
        logId: l.id,
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        date: l.t,
        ts: l.ts || 0,
        n: Number(l.n) || 1,
        unit: l.unit || item.unit || ''
      })
    })
  })
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0))
  return out
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
  const nowMs = Date.now()
  // 「洗澡」示例：几小时前发生的事，用来演示「不足一天按小时显示」
  const washAt = nowMs - (new Date(nowMs).getHours() >= 5 ? 5 : 1) * 3600000
  const demo = [
    {
      name: '鲜牛奶',
      icon: '🥛',
      category: 'food',
      mode: MODE.COUNTDOWN,
      produceDate: time.addDays(t, -5),
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
      remindDays: 30,
      // 示例：置顶一条倒计时，首启即可看到首页「置顶」分组
      pinned: true,
      pinnedAt: nowMs - 2000
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
      remindDays: 3,
      // 示例：置顶一条正计时，说明置顶对两种计时都适用
      pinned: true,
      pinnedAt: nowMs - 1000
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
    },
    {
      name: '洗澡',
      icon: '🛁',
      category: 'life',
      kind: KIND.EVENT,
      mode: MODE.COUNTUP,
      lastDate: t,
      lastAt: washAt, // 5 小时前：列表里直接显示「5 小时」，而不是「0 天」
      detailTiming: true,
      cycleDays: 2,
      remindDays: 1
    },
    {
      name: '吃火锅',
      icon: '🍲',
      category: 'food',
      kind: KIND.EVENT,
      mode: MODE.COUNTUP,
      lastDate: time.addDays(t, -38),
      cycleDays: 30,
      remindDays: 7
    },
    {
      // 纯记录型示例：不设循环间隔，只留一个时间痕迹
      name: '理发',
      icon: '💇',
      category: 'life',
      kind: KIND.EVENT,
      mode: MODE.COUNTUP,
      lastDate: time.addDays(t, -23),
      remindDays: 0
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
  const kind = preset.kind || KIND.ITEM
  return {
    name: preset.name,
    icon: preset.icon,
    category: preset.category,
    kind,
    mode: preset.mode,
    produceDate: preset.mode === MODE.COUNTDOWN ? time.today() : '',
    shelfLife: preset.shelfLife || '',
    shelfLifeUnit: preset.shelfLifeUnit || 'day',
    expireDate: '',
    expireManual: false,
    lastDate: preset.mode === MODE.COUNTUP ? time.today() : '',
    lastAt: 0,
    cycleDays: preset.cycleDays || '',
    quantity: 1,
    unit: preset.unit || (kind === KIND.EVENT ? '次' : '份'),
    location: preset.location || '',
    // 纯记录型事件预设的 remindDays 为 0，不能用 || 兜底
    remindDays: preset.remindDays === undefined ? 7 : Number(preset.remindDays),
    detailTiming: false,
    pinned: false,
    pinnedAt: 0,
    remark: ''
  }
}

module.exports = {
  KEY_ITEMS,
  DEFAULT_SETTINGS,
  getAll,
  getItems,
  getEvents,
  saveAll,
  getById,
  add,
  update,
  remove,
  clearAll,
  resetCycle,
  useItem,
  undoUse,
  undoUseBatch,
  clearUsage,
  getAllUsage,
  getPinned,
  countPinned,
  setPinned,
  getSettings,
  saveSettings,
  ensureInit,
  buildFromPreset,
  PRESETS
}
