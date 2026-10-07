/**
 * 物时 · 日期与计时计算
 * 全部按「自然日」计算，使用 UTC 时间戳避免时区/夏令时误差
 */

const DAY = 86400000

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** Date -> 'YYYY-MM-DD' */
function formatDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/** 'YYYY-MM-DD' -> 当天 00:00 的 UTC 时间戳 */
function toStamp(str) {
  if (!str) return NaN
  const parts = String(str).split('-')
  if (parts.length !== 3) return NaN
  return Date.UTC(+parts[0], +parts[1] - 1, +parts[2])
}

/** 今天 */
function today() {
  const d = new Date()
  return formatDate(d)
}

/** 两个日期相差天数：to - from */
function diffDays(from, to) {
  const a = toStamp(from)
  const b = toStamp(to)
  if (isNaN(a) || isNaN(b)) return 0
  return Math.round((b - a) / DAY)
}

/** 日期加/减天数 */
function addDays(str, n) {
  const t = toStamp(str)
  if (isNaN(t)) return str
  return formatDate(new Date(t + n * DAY))
}

/** 日期加月（处理月末溢出，如 1/31 + 1 月 = 2/28） */
function addMonths(str, n) {
  const t = toStamp(str)
  if (isNaN(t)) return str
  const d = new Date(t)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return formatDate(target)
}

function addYears(str, n) {
  return addMonths(str, n * 12)
}

/** 保质期数值 + 单位 -> 到期日 */
function computeExpire(produceDate, value, unit) {
  if (!produceDate || !value) return ''
  const v = Number(value)
  if (!v) return ''
  if (unit === 'month') return addMonths(produceDate, v)
  if (unit === 'year') return addYears(produceDate, v)
  return addDays(produceDate, v)
}

/** 保质期数值 + 单位 -> 折算天数（用于进度环） */
function daysOf(value, unit) {
  const v = Number(value) || 0
  if (unit === 'month') return v * 30
  if (unit === 'year') return v * 365
  return v
}

/** 天数 -> 人类可读文案 */
function humanDays(days) {
  const d = Math.abs(Math.round(days))
  if (d >= 365) {
    const y = (d / 365).toFixed(1).replace(/\.0$/, '')
    return y + '年'
  }
  if (d >= 30) {
    const m = (d / 30).toFixed(1).replace(/\.0$/, '')
    return m + '个月'
  }
  return d + '天'
}

/** 'YYYY-MM-DD' -> '2026.10.07' */
function formatCN(str) {
  if (!str) return ''
  const p = String(str).split('-')
  return p[0] + '.' + p[1] + '.' + p[2]
}

/** 星期几 */
function weekday(str) {
  const t = toStamp(str)
  if (isNaN(t)) return ''
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(t).getUTCDay()]
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

/**
 * 计算单个物品的运行状态
 * @param {Object} item 物品对象
 * @returns {Object} state
 */
function getItemState(item) {
  const t = today()
  const base = {
    status: 'normal',
    statusLabel: '正常',
    color: '#5E8C7A',
    soft: '#EAF1ED',
    remainDays: 0, // 还可处理的剩余天数（倒计时=距过期；正计时=距建议更换）
    usedDays: 0,
    percent: 0, // 进度环填充比例 0~1
    mainValue: '0',
    mainUnit: '天',
    mainLabel: '剩余',
    subText: '',
    targetDate: ''
  }

  if (!item) return base

  const remind = Number(item.remindDays) || 7

  if (item.mode === 'countup') {
    // —— 正计时：距上次换洗/更换已过去多久 ——
    const cycle = Number(item.cycleDays) || 30
    const used = diffDays(item.lastDate, t)
    const remain = cycle - used
    const nextDate = addDays(item.lastDate, cycle)

    let status = 'normal'
    if (remain < 0) status = 'over'
    else if (remain <= 3) status = 'urgent'
    else if (remain <= remind) status = 'soon'

    const meta = {
      normal: { label: '正常', color: '#5E8C7A', soft: '#EAF1ED' },
      soon: { label: '快到期', color: '#D9A05B', soft: '#FAF1E2' },
      urgent: { label: '该处理了', color: '#D8735F', soft: '#FBEAE5' },
      over: { label: '已超期', color: '#D8735F', soft: '#FBEAE5' }
    }[status]

    return Object.assign(base, {
      status,
      statusLabel: meta.label,
      color: meta.color,
      soft: meta.soft,
      remainDays: remain,
      usedDays: used,
      percent: clamp01(cycle > 0 ? used / cycle : 0),
      mainValue: String(used),
      mainUnit: '天',
      mainLabel: '已使用',
      subText:
        remain < 0
          ? '建议更换时间已过 ' + Math.abs(remain) + ' 天'
          : remain === 0
            ? '已到建议周期，建议今天处理'
            : '建议 ' + formatCN(nextDate) + ' 前更换',
      targetDate: nextDate
    })
  }

  // —— 倒计时：还有多久过期 ——
  const expireDate = item.expireDate || computeExpire(item.produceDate, item.shelfLife, item.shelfLifeUnit)
  const remain = diffDays(t, expireDate)
  const total = Math.max(1, diffDays(item.produceDate, expireDate))

  let status = 'normal'
  if (remain < 0) status = 'over'
  else if (remain <= 3) status = 'urgent'
  else if (remain <= remind) status = 'soon'

  const meta = {
    normal: { label: '充裕', color: '#5E8C7A', soft: '#EAF1ED' },
    soon: { label: '临近', color: '#D9A05B', soft: '#FAF1E2' },
    urgent: { label: '紧急', color: '#D8735F', soft: '#FBEAE5' },
    over: { label: '已过期', color: '#9A9A94', soft: '#F0EFEC' }
  }[status]

  return Object.assign(base, {
    status,
    statusLabel: meta.label,
    color: meta.color,
    soft: meta.soft,
    remainDays: remain,
    usedDays: Math.max(0, total - remain),
    percent: clamp01(1 - remain / total),
    mainValue: String(remain < 0 ? Math.abs(remain) : remain),
    mainUnit: '天',
    mainLabel: remain < 0 ? '已过期' : '剩余',
    subText:
      remain < 0
        ? '已于 ' + formatCN(expireDate) + ' 过期'
        : formatCN(expireDate) + ' 到期 · ' + weekday(expireDate),
    targetDate: expireDate
  })
}

/** 给物品附加状态字段，返回新数组 */
function decorate(list) {
  return (list || []).map(item => {
    const state = getItemState(item)
    return Object.assign({}, item, {
      _state: state,
      _sort: state.remainDays
    })
  })
}

/** 排序：紧急优先 / 名称 / 添加时间 */
function sortItems(list, sortKey) {
  const arr = list.slice()
  if (sortKey === 'name') {
    arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'))
  } else if (sortKey === 'recent') {
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  } else {
    arr.sort((a, b) => (a._sort || 0) - (b._sort || 0))
  }
  return arr
}

module.exports = {
  DAY,
  formatDate,
  toStamp,
  today,
  diffDays,
  addDays,
  addMonths,
  addYears,
  computeExpire,
  daysOf,
  humanDays,
  formatCN,
  weekday,
  getItemState,
  decorate,
  sortItems
}
