/**
 * 天天计时 · 备份与迁移（导出 / 导入）
 *
 * 数据全在本机，换手机或卸载小程序就会丢 —— 这里提供一条「用户自己拿得走」的路：
 *   导出：把记录序列化成 .json 文件，用微信的文件转发发到「文件传输助手」；
 *   导入：在同一会话里选回那个文件（或粘贴文本），合并或覆盖回本机。
 *
 * 格式约定（自己定的，要能长期读得动旧文件）：
 *   {
 *     format: 'tiantian-backup', formatVersion: 1,
 *     app: '天天计时', exportedAt: 毫秒, exportedAtText: '2026-10-20 02:41',
 *     count: 可见记录条数, settings: {...}, items: [...]
 *   }
 * 兼容：也接受 { items: [...] } 或裸数组，方便用户手工整理过的文件。
 */

const storage = require('./storage')
const util = require('./util')
const time = require('./time')
const { KIND, MODE } = require('./constants')

const FORMAT = 'tiantian-backup'
const FORMAT_VERSION = 1
const FILE_PREFIX = 'tiantian-backup'
/** 单文件保护：超过这个体量基本不是本产品的备份，直接拒绝，避免解析卡死 */
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ITEMS = 3000

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 文件名：tiantian-backup-20261020-0241.json（全 ASCII，避免部分机型聊天文件名乱码） */
function fileStamp(ms) {
  const d = new Date(ms)
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    '-' +
    pad2(d.getHours()) +
    pad2(d.getMinutes())
  )
}

function clockText(ms) {
  const d = new Date(ms)
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    ' ' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  )
}

function num(v, dft) {
  const n = Number(v)
  return Number.isFinite(n) ? n : dft
}

function str(v, dft) {
  return typeof v === 'string' ? v : v == null ? dft || '' : String(v)
}

/** 流水数组：只保留结构合法的条目，字段做最小规整 */
function normalizeLogs(list) {
  if (!Array.isArray(list)) return []
  const out = []
  list.forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const log = Object.assign({}, raw)
    log.id = str(log.id) || util.uuid()
    log.t = str(log.t)
    log.ts = num(log.ts, 0)
    if ('n' in log) log.n = num(log.n, 1) || 1
    if ('cyclic' in log) log.cyclic = !!log.cyclic
    if ('noTime' in log) log.noTime = !!log.noTime
    out.push(log)
  })
  return out
}

/**
 * 规整一条记录：外部文件不可信，字段缺失 / 类型不对都要能兜住
 * @returns {Object|null} 不合格返回 null（没有名字的记录直接丢弃）
 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = str(raw.name).trim()
  if (!name) return null

  const kind = raw.kind === KIND.EVENT ? KIND.EVENT : KIND.ITEM
  const mode = raw.mode === MODE.COUNTUP ? MODE.COUNTUP : MODE.COUNTDOWN
  const now = Date.now()

  return {
    id: str(raw.id) || util.uuid(),
    name: name,
    icon: str(raw.icon) || (kind === KIND.EVENT ? '🗓️' : '📦'),
    category: str(raw.category) || 'other',
    kind: kind,
    mode: mode,
    produceDate: str(raw.produceDate),
    shelfLife: raw.shelfLife === '' || raw.shelfLife == null ? '' : num(raw.shelfLife, ''),
    shelfLifeUnit: str(raw.shelfLifeUnit) || 'day',
    expireDate: str(raw.expireDate),
    expireManual: !!raw.expireManual,
    lastDate: str(raw.lastDate),
    lastAt: num(raw.lastAt, 0),
    cycleDays: raw.cycleDays === '' || raw.cycleDays == null ? '' : num(raw.cycleDays, ''),
    cyclic: !!raw.cyclic,
    archived: !!raw.archived,
    archivedAt: num(raw.archivedAt, 0),
    deleted: !!raw.deleted,
    quantity: num(raw.quantity, 1) || 1,
    unit: str(raw.unit) || (kind === KIND.EVENT ? '次' : '份'),
    location: str(raw.location),
    // remindDays = 0 是「不提前提醒」，不能被 || 兜成默认值
    remindDays: raw.remindDays == null ? 7 : num(raw.remindDays, 7),
    detailTiming: !!raw.detailTiming,
    pinned: !!raw.pinned,
    pinnedAt: num(raw.pinnedAt, 0),
    remark: str(raw.remark),
    usageLog: normalizeLogs(raw.usageLog),
    eventLog: normalizeLogs(raw.eventLog),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
    // 导入进来的都是用户自己的记录，一律不带「示例」标记
    demo: false
  }
}

/** 只认识这几个键，避免把奇怪字段写进设置 */
function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  if (raw.sortKey === 'urgent' || raw.sortKey === 'name' || raw.sortKey === 'recent') {
    out.sortKey = raw.sortKey
  }
  if (typeof raw.showAttention === 'boolean') out.showAttention = raw.showAttention
  if (typeof raw.showTodo === 'boolean') out.showTodo = raw.showTodo
  if (typeof raw.showOver === 'boolean') out.showOver = raw.showOver
  return Object.keys(out).length ? out : null
}

/**
 * 生成备份对象
 * 不导出「示例」记录（demo）：它们只是首启的示范，换手机后重新写一遍即可，
 * 混进来反而会被当成用户自己的东西。归档 / 已删除的记录要导出，流水挂在它们下面。
 */
function build() {
  const items = storage.readRaw().filter(i => !i.demo)
  const at = Date.now()
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    app: '天天计时',
    exportedAt: at,
    exportedAtText: clockText(at),
    count: items.filter(i => !i.archived).length,
    total: items.length,
    settings: storage.getSettings(),
    items: items
  }
}

function toJson(payload) {
  return JSON.stringify(payload)
}

function fileName(at) {
  return FILE_PREFIX + '-' + fileStamp(at || Date.now()) + '.json'
}

/**
 * 解析备份文本
 * @returns {{ok:Boolean, error:String, items:Array, settings:Object, exportedAtText:String, skipped:Number}}
 */
function parse(text) {
  const raw = String(text || '').trim()
  const empty = { ok: false, error: '', items: [], settings: null, exportedAtText: '', skipped: 0 }
  if (!raw) return Object.assign({}, empty, { error: '内容为空' })
  if (raw.length > MAX_BYTES) return Object.assign({}, empty, { error: '内容太大，不像是本小程序的备份' })

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return Object.assign({}, empty, { error: '内容不是有效的备份文件' })
  }

  let list = null
  let settings = null
  let exportedAtText = ''
  if (Array.isArray(data)) {
    list = data
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) list = data.items
    else return Object.assign({}, empty, { error: '没有找到记录列表' })
    settings = normalizeSettings(data.settings)
    exportedAtText = str(data.exportedAtText) || (data.exportedAt ? clockText(num(data.exportedAt, 0)) : '')
    // 认得出格式名的，版本比本机新就提醒一句（目前只有 1，先留好口子）
    if (data.format && data.format !== FORMAT) {
      return Object.assign({}, empty, { error: '这不是天天计时的备份文件' })
    }
    if (num(data.formatVersion, FORMAT_VERSION) > FORMAT_VERSION) {
      return Object.assign({}, empty, { error: '备份来自更新版本的小程序，请先升级' })
    }
  } else {
    return Object.assign({}, empty, { error: '内容不是有效的备份文件' })
  }

  if (list.length > MAX_ITEMS) return Object.assign({}, empty, { error: '记录条数超出预期' })

  const items = []
  let skipped = 0
  list.forEach(raw => {
    const it = normalizeItem(raw)
    if (it) items.push(it)
    else skipped++
  })

  if (!items.length) return Object.assign({}, empty, { error: '没有可导入的记录' })

  return { ok: true, error: '', items, settings, exportedAtText, skipped }
}

/**
 * 合并：按 id 对齐，同一条取 updatedAt 较新的版本
 * 归档记录也参与 —— 它们承载着记录页里的流水
 */
function mergeLists(local, incoming) {
  const list = local.slice()
  const index = {}
  list.forEach((it, i) => {
    index[it.id] = i
  })
  let added = 0
  let updated = 0
  let same = 0
  incoming.forEach(it => {
    const at = index[it.id]
    if (at === undefined) {
      index[it.id] = list.length
      list.push(it)
      added++
      return
    }
    if ((it.updatedAt || 0) > (list[at].updatedAt || 0)) {
      list[at] = it
      updated++
    } else {
      same++
    }
  })
  return { list, added, updated, same }
}

/**
 * 执行导入
 * @param {Array} items     normalize 后的记录
 * @param {Object} settings 备份里的设置（可为 null）
 * @param {String} mode     'merge' 合并 | 'replace' 覆盖
 * @returns {{added,updated,same,total,droppedDemo}}
 */
function applyImport(items, settings, mode) {
  let added = 0
  let updated = 0
  let same = 0
  let droppedDemo = 0

  if (mode === 'replace') {
    storage.replaceAll(items)
    added = items.length
  } else {
    // 合并前先清掉本机的示例：换机导入后还留一堆「示例」会让人以为导错了
    droppedDemo = storage.removeDemo()
    const res = mergeLists(storage.readRaw(), items)
    storage.replaceAll(res.list)
    added = res.added
    updated = res.updated
    same = res.same
  }

  if (settings) storage.saveSettings(settings)

  storage.pruneLogs()
  return { added, updated, same, total: items.length, droppedDemo }
}

/** 本机现状（给页面显示） */
function localSummary() {
  const all = storage.readRaw()
  const visible = all.filter(i => !i.archived)
  const real = visible.filter(i => !i.demo)
  return {
    count: real.length,
    itemCount: real.filter(i => i.kind !== KIND.EVENT).length,
    eventCount: real.filter(i => i.kind === KIND.EVENT).length,
    usageCount: storage.getAllUsage().length,
    eventLogCount: storage.getAllEventLogs().length,
    hasDemo: all.some(i => i.demo && !i.archived),
    today: time.today()
  }
}

module.exports = {
  FORMAT,
  FORMAT_VERSION,
  MAX_BYTES,
  build,
  toJson,
  fileName,
  clockText,
  parse,
  normalizeItem,
  mergeLists,
  applyImport,
  localSummary
}
