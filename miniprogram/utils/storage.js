/**
 * 天天计时 · 本地数据层
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
  showAttention: true, // 首页是否显示「需要关注」分组
  showTodo: true, // 首页是否显示「需要处理」分组
  reduceMotion: false // 降低动效（舒缓式可访问性选项）
}

/**
 * 读取原始数据（含已归档的记录），仅供本文件内部「读-改-写」使用
 *
 * 写操作必须基于它，否则会把归档记录从存储里抹掉（见 getAll 的说明）。
 */
function readAll() {
  try {
    const list = wx.getStorageSync(KEY_ITEMS)
    if (!Array.isArray(list)) return []
    return list.map(i => (i && i.kind ? i : Object.assign({}, i, { kind: KIND.ITEM })))
  } catch (e) {
    console.error('[storage] 读取失败', e)
    return []
  }
}

/**
 * 读取全部记录（含事件）；旧数据无 kind 字段时按「物品」补齐
 *
 * 已归档（archived）的记录不再返回：不循环的事件在完成后要「记录进统计并自动删除」，
 * 而事件记录页的数据源是各条记录里的 eventLog —— 直接删掉记录会连流水一起丢。
 * 因此「删除」实现为归档：对列表 / 统计不可见，流水仍然保留在事件记录里。
 */
function getAll() {
  return readAll().filter(i => !i.archived)
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
  const list = readAll()
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
      // 事件 × 倒计时：完成后是否自动进入下一轮（false = 完成后记录一次并归档）
      cyclic: false,
      archived: false, // 已归档：对列表与统计不可见，但流水保留在「事件记录」里
      quantity: 1,
      unit: '份',
      location: '',
      remindDays: 7,
      detailTiming: false, // 正计时：是否显示 年/月/日/时 细分时长
      pinned: false, // 是否置顶到首页「置顶」分组
      pinnedAt: 0, // 置顶时间（毫秒），用于按置顶先后排序
      remark: '',
      eventLog: [], // 事件/正计时「重新计时」流水（时间倒序，最多 EVENT_LOG_LIMIT 条）
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
  const list = readAll()
  const idx = list.findIndex(i => i.id === id)
  if (idx === -1) return null
  list[idx] = Object.assign({}, list[idx], patch, { updatedAt: Date.now() })
  saveAll(list)
  return list[idx]
}

/**
 * 删除记录
 *
 * 有流水的改成「软删除」：只打归档标记，不真抹掉数据 —— 否则它名下的使用 / 事件流水会跟着消失
 * （用户需求：「删除的物品记录也要保存」）。归档后列表、统计、置顶、详情都看不到它。
 * deleted 用来与「不循环事件完成后自动归档」区分，记录页据此显示不同的来源标记。
 *
 * 一条流水都没有的记录直接真删 —— 留着也没有任何可展示的东西。
 */
function remove(id) {
  const list = readAll()
  const idx = list.findIndex(i => i.id === id)
  if (idx === -1) return false
  const it = list[idx]
  const hasLog =
    (Array.isArray(it.usageLog) && it.usageLog.length > 0) ||
    (Array.isArray(it.eventLog) && it.eventLog.length > 0)

  if (!hasLog) {
    list.splice(idx, 1)
    return saveAll(list)
  }

  list[idx] = Object.assign({}, it, {
    archived: true,
    archivedAt: Date.now(),
    deleted: true,
    pinned: false,
    pinnedAt: 0,
    updatedAt: Date.now()
  })
  return saveAll(list)
}

function clearAll() {
  return saveAll([])
}

/** 示例记录（首启写入的示范内容）：只用于提示操作，不算用户的真实物品 */
function getDemo() {
  return readAll().filter(i => i.demo && !i.archived)
}

/** 还剩下的示例条数 */
function countDemo() {
  return getDemo().length
}

/**
 * 一键清空示例：真删除（连流水一起回收）
 * 与 remove() 的软删除不同 —— 示例本来就不是用户的数据，留流水没有意义
 * @returns {Number} 清掉的条数
 */
function removeDemo() {
  const list = readAll()
  const keep = list.filter(i => !i.demo)
  const n = list.length - keep.length
  if (!n) return 0
  saveAll(keep)
  return n
}

/**
 * 流水总上限：使用记录、事件记录各只保留最近 100 条
 *
 * 注意是「跨全部记录合计」的全局上限，不是每条记录各自 100 条 ——
 * 记录页本来就是一个把所有记录混排在一起的列表，按页总量截断才符合「记录存储 100 条」的直觉。
 * 每次写入流水后由 pruneLogs() 收敛。
 */
const LOG_LIMIT = 100

/** 正计时：记录一次「已更换/已清洗」或「刚刚发生过」，重置计时（起点落到此刻）并留一条流水 */
function resetCycle(id) {
  const item = getById(id)
  const now = Date.now()
  const log = { id: util.uuid(), type: 'reset', t: time.today(), ts: now }
  const logs = Array.isArray(item && item.eventLog) ? item.eventLog.slice() : []
  logs.unshift(log)
  // 起点精确时刻对所有正计时都有效，不必等用户开「详细计时」
  const updated = update(id, { lastDate: time.today(), lastAt: now, eventLog: logs })
  pruneLogs()
  return updated
}

/**
 * 倒计时事件「已完成」：记一笔流水，再决定是进入下一轮还是把这笔计时收起来
 *
 * **两种结果都会先记一笔流水**（`type:'done'`），所以不论循环与否，
 * 这一次完成都会出现在「事件记录」里（循环的那笔带 `cyclic:true` 标记，见 eventlog 页）。
 *
 * - 循环（item.cyclic）：进入下一轮 —— 整段周期往后平移一期（见 time.advanceCountdown），
 *   中途提前完成时，这一轮没走完的时间会顺延进去，不会白白丢掉
 * - 不循环：仅归档 —— 对列表与统计不可见（体感就是「自动删除」），
 *   但流水保留在 eventLog 里，所以「事件记录」仍能看到这一次完成
 *
 * @param {String} id
 * @returns {null|{mode:'recycled'|'archived', item:Object|null}}
 */
function finishEvent(id) {
  const item = getById(id)
  if (!item) return null
  const now = Date.now()
  const cyclic = !!item.cyclic
  // type 区分「正计时重新计时」与「倒计时完成」；cyclic 记录这次完成走的是哪条分支
  const log = { id: util.uuid(), type: 'done', cyclic, t: time.today(), ts: now }
  const logs = Array.isArray(item.eventLog) ? item.eventLog.slice() : []
  logs.unshift(log)

  if (cyclic) {
    const next = time.advanceCountdown(item)
    const updated = update(
      id,
      Object.assign({}, next, { lastDate: '', lastAt: 0, eventLog: logs })
    )
    pruneLogs()
    return { mode: 'recycled', item: updated }
  }

  update(id, { archived: true, archivedAt: now, eventLog: logs })
  pruneLogs()
  return { mode: 'archived', item: null }
}

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
  const list = readAll()
  const idx = list.findIndex(i => i.id === id)
  if (idx === -1) return { ok: false, reason: 'missing', limit: PIN_LIMIT, used: 0 }

  // 只数还在台面上的置顶（归档记录不该占名额）
  const used = list.filter(i => i && i.pinned && !i.archived && i.id !== id).length
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
  const logs = Array.isArray(item.usageLog) ? item.usageLog.slice() : []
  logs.unshift(log)

  const updated = update(id, { quantity: after, usageLog: logs })
  pruneLogs()
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

/* ---------- 流水收敛与手动删除（v3.10） ---------- */

/**
 * 把某一类流水按时间收敛到 LOG_LIMIT 条（跨全部记录合计）
 * @returns {Boolean} 是否有改动
 */
function pruneField(list, field) {
  const flat = []
  list.forEach((it, i) => {
    const logs = Array.isArray(it[field]) ? it[field] : []
    logs.forEach(l => flat.push({ i, id: l.id, ts: Number(l.ts) || 0 }))
  })
  if (flat.length <= LOG_LIMIT) return false

  // 时间新的留下；每条记录内部本来就是新在前，用 (记录下标 | 流水 id) 标记要保留的
  flat.sort((a, b) => b.ts - a.ts)
  const keep = {}
  flat.slice(0, LOG_LIMIT).forEach(x => {
    keep[x.i + '|' + x.id] = true
  })

  let changed = false
  list.forEach((it, i) => {
    const logs = Array.isArray(it[field]) ? it[field] : []
    const kept = logs.filter(l => keep[i + '|' + l.id])
    if (kept.length !== logs.length) {
      it[field] = kept
      changed = true
    }
  })
  return changed
}

/** 归档后名下已经没有任何流水的空壳记录，直接清掉，别白占存储 */
function dropEmptyArchived(list) {
  return list.filter(it => {
    if (!it || !it.archived) return true
    const u = Array.isArray(it.usageLog) ? it.usageLog.length : 0
    const e = Array.isArray(it.eventLog) ? it.eventLog.length : 0
    return u > 0 || e > 0
  })
}

/**
 * 收敛流水：① 使用记录 / 事件记录各只留最近 LOG_LIMIT 条；② 清掉归档后已无流水的空壳
 * 每次写入流水之后调用（本地数据量很小，多读写一次可忽略）
 * @returns {Boolean} 是否有改动
 */
function pruneLogs() {
  const list = readAll()
  const changed = pruneField(list, 'usageLog') | pruneField(list, 'eventLog')
  const kept = dropEmptyArchived(list)
  if (!changed && kept.length === list.length) return false
  return saveAll(kept)
}

/**
 * 手动删除一条流水（记录页长按某条 → 删除）
 *
 * 只删这条记录本身，**不改数量、不动计时** —— 想「撤回一次用掉、把数量加回来」请用 undoUse。
 * @param {String} itemId 所属记录 id
 * @param {String} logId  流水 id
 * @returns {Boolean} 是否删掉了
 */
function removeLog(itemId, logId) {
  const list = readAll()
  const it = list.find(i => i.id === itemId)
  if (!it) return false

  let hit = false
  ;['usageLog', 'eventLog'].forEach(f => {
    const logs = Array.isArray(it[f]) ? it[f] : []
    const kept = logs.filter(l => l.id !== logId)
    if (kept.length !== logs.length) {
      it[f] = kept
      hit = true
    }
  })
  if (!hit) return false

  it.updatedAt = Date.now()
  return saveAll(dropEmptyArchived(list))
}

/**
 * 清空一类流水（记录页底部「清空」）：只清流水，记录自身的数量与计时都不受影响
 * @param {String} type 'usage' 使用记录 | 'event' 事件记录
 */
function clearLogs(type) {
  const field = type === 'event' ? 'eventLog' : 'usageLog'
  const list = readAll()
  let changed = false
  list.forEach(it => {
    if (Array.isArray(it[field]) && it[field].length > 0) {
      it[field] = []
      changed = true
    }
  })
  if (!changed) return false
  return saveAll(dropEmptyArchived(list))
}

/**
 * 汇总全部消耗流水（时间倒序），供记录页使用
 *
 * 与事件记录同理用 readAll：被删除（归档）的物品，它留下的使用流水仍应显示在记录页里。
 */
function getAllUsage() {
  const out = []
  readAll().forEach(item => {
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
        unit: l.unit || item.unit || '',
        // 所属记录已归档：点不进详情，只在记录里留痕
        archived: !!item.archived,
        // 是「被用户删除」而不是「不循环事件完成后自动收起」
        deleted: !!item.deleted
      })
    })
  })
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0))
  return out
}

/**
 * 汇总全部「事件」的重新计时 / 完成流水（时间倒序），供事件记录页使用
 *
 * 这里刻意用 readAll：不循环的事件完成后会被归档（列表里看不到），
 * 但它留下的那一次完成记录仍应出现在事件记录里。
 */
function getAllEventLogs() {
  const out = []
  readAll()
    .filter(item => item && item.kind === KIND.EVENT)
    .forEach(item => {
      const logs = Array.isArray(item.eventLog) ? item.eventLog : []
      logs.forEach(l => {
        out.push({
          logId: l.id,
          itemId: item.id,
          name: item.name,
          icon: item.icon,
          date: l.t,
          ts: l.ts || 0,
          // 流水来源：reset = 正计时重新计时；done = 倒计时「已完成」（老数据无 type）
          type: l.type || (item.archived ? 'done' : 'reset'),
          // 这一次完成是否进入了下一轮（循环事件）
          cyclic: !!l.cyclic,
          // 已归档：这条计时在列表里已经收起（自动收起或被删除），点不进详情
          archived: !!item.archived,
          // 归档原因是「用户删除了记录」，而不是「不循环事件完成后自动收起」
          deleted: !!item.deleted
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
      // 生产日期 7 天前 + 保质期 7 天 = 今天到期：用来演示「剩余不足一天时改显示小时」
      produceDate: time.addDays(t, -7),
      shelfLife: 7,
      shelfLifeUnit: 'day',
      quantity: 2,
      unit: '瓶',
      location: '冰箱冷藏',
      remindDays: 2,
      remark: '示例数据，可一键清空'
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
      updatedAt: Date.now(),
      // v3.11：首启写入的这些只是「示例」，用于提示怎么操作 ——
      // 不计入首页 / 我的统计，卡片上带「示例」角标，可一键清空（removeDemo）
      demo: true
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
    cyclic: false,
    archived: false,
    quantity: 1,
    unit: preset.unit || (kind === KIND.EVENT ? '次' : '份'),
    location: preset.location || '',
    // 纯记录型事件预设的 remindDays 为 0，不能用 || 兜底
    remindDays: preset.remindDays === undefined ? 7 : Number(preset.remindDays),
    detailTiming: false,
    pinned: false,
    pinnedAt: 0,
    remark: '',
    eventLog: []
  }
}

module.exports = {
  KEY_ITEMS,
  DEFAULT_SETTINGS,
  LOG_LIMIT,
  getAll,
  getItems,
  getEvents,
  saveAll,
  getById,
  add,
  update,
  remove,
  clearAll,
  getDemo,
  countDemo,
  removeDemo,
  resetCycle,
  finishEvent,
  useItem,
  undoUse,
  undoUseBatch,
  clearUsage,
  pruneLogs,
  removeLog,
  clearLogs,
  getAllUsage,
  getAllEventLogs,
  getPinned,
  countPinned,
  setPinned,
  getSettings,
  saveSettings,
  ensureInit,
  buildFromPreset,
  PRESETS
}
