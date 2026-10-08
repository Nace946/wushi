/**
 * 物时 · 日期与计时计算
 * 全部按「自然日」计算，使用 UTC 时间戳避免时区/夏令时误差
 */

const { kindText, OPEN_LEVELS } = require('./constants')

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
 * 把「上次处理日期（当天 0 点）」到现在的时长拆成 年 / 月 / 日 / 时
 * 为 0 的段不显示，例如：3个月5天、1年2个月、2天6小时
 */
function formatDuration(startDate, now) {
  if (!startDate) return ''
  const s = new Date(String(startDate).slice(0, 10) + 'T00:00:00')
  if (isNaN(s.getTime())) return ''
  const n = now || new Date()
  if (n.getTime() < s.getTime()) return ''

  let years = n.getFullYear() - s.getFullYear()
  let months = n.getMonth() - s.getMonth()
  let days = n.getDate() - s.getDate()

  // 天数不够时向上借一个月
  if (days < 0) {
    months -= 1
    const prevMonthLast = new Date(n.getFullYear(), n.getMonth(), 0).getDate()
    days += prevMonthLast
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  // 天已按整天计，不足一天的部分即今天的小时数
  const hours = n.getHours()

  const parts = []
  if (years) parts.push(years + '年')
  if (months) parts.push(months + '个月')
  if (days) parts.push(days + '天')
  if (hours) parts.push(hours + '小时')

  if (!parts.length) return '不足 1 小时'
  return parts.join('')
}

/**
 * 「纯记录」档位：不设循环间隔时，按已过去天数取一档说法
 * @param {Number} days 距上次发生的天数
 */
function pickOpenLevel(days) {
  const d = Math.max(0, Number(days) || 0)
  for (let i = 0; i < OPEN_LEVELS.length; i++) {
    if (d <= OPEN_LEVELS[i].maxDays) return OPEN_LEVELS[i]
  }
  return OPEN_LEVELS[OPEN_LEVELS.length - 1]
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
    color: '#3F8A6B',
    soft: '#DCEFE4',
    remainDays: 0, // 还可处理的剩余天数（倒计时=距过期；正计时=距建议更换）
    usedDays: 0,
    percent: 0, // 进度环填充比例 0~1
    hasProgress: true, // 是否显示进度条/进度环（纯记录型事件为 false）
    mainValue: '0',
    mainUnit: '天',
    mainLabel: '剩余',
    subText: '',
    detailText: '', // 正计时且开启「详细计时」时的 年/月/日/时 细分
    targetDate: ''
  }

  if (!item) return base

  const remind = Number(item.remindDays) || 7

  if (item.mode === 'countup') {
    // —— 正计时：距上次换洗/更换 / 上次发生某事已过去多久 ——
    const kt = kindText(item.kind)
    const cycle = Number(item.cycleDays) || 0
    const used = Math.max(0, diffDays(item.lastDate, t))
    // 详细时长：用户开启「详细计时」时给出 年/月/日/时 细分
    const detailText = item.detailTiming ? formatDuration(item.lastDate) : ''

    if (cycle <= 0) {
      // —— 纯记录：没有循环间隔，只是一直数着「距离上次多久」 ——
      const lv = pickOpenLevel(used)
      return Object.assign(base, {
        status: lv.status,
        statusLabel: lv.label,
        color: lv.color,
        soft: lv.soft,
        remainDays: -used, // 越久没做排得越前
        usedDays: used,
        percent: 0,
        hasProgress: false, // 取消进度条
        mainValue: String(used),
        mainUnit: '天',
        mainLabel: '已过去',
        subText: lv.sub,
        detailText: detailText,
        targetDate: '',
        nextLabel: kt.nextLabel
      })
    }

    const remain = cycle - used
    const nextDate = addDays(item.lastDate, cycle)

    // 阈值随周期缩放：周期只有 1~2 天时，固定的「3 天」会把刚做完的事判成紧急
    // 周期 ≥ 7 天时保持原有口径（3 天以内紧急），短周期按比例收紧
    const urgentDays = cycle >= 7 ? 3 : Math.floor(cycle * 0.25)
    const soonDays = Math.max(urgentDays, Math.min(remind, Math.floor(cycle / 2)))

    let status = 'normal'
    if (remain < 0) status = 'over'
    else if (remain <= urgentDays) status = 'urgent'
    else if (remain <= soonDays) status = 'soon'

    const meta = {
      normal: { label: '正常', color: '#3F8A6B', soft: '#DCEFE4' },
      soon: { label: '快到期', color: '#D18C2A', soft: '#FBEBD3' },
      urgent: { label: '该处理了', color: '#D4553C', soft: '#FCE0D8' },
      over: { label: '已超期', color: '#D4553C', soft: '#FCE0D8' }
    }[status]

    return Object.assign(base, {
      status,
      statusLabel: meta.label,
      color: meta.color,
      soft: meta.soft,
      remainDays: remain,
      usedDays: used,
      percent: clamp01(cycle > 0 ? used / cycle : 0),
      hasProgress: true,
      mainValue: String(used),
      mainUnit: '天',
      mainLabel: '已过去',
      subText:
        remain < 0
          ? kt.subOver(Math.abs(remain))
          : remain === 0
            ? kt.subDue
            : kt.subSoon(formatCN(nextDate)),
      detailText: detailText,
      targetDate: nextDate,
      nextLabel: kt.nextLabel
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
    normal: { label: '充裕', color: '#3F8A6B', soft: '#DCEFE4' },
    soon: { label: '临近', color: '#D18C2A', soft: '#FBEBD3' },
    urgent: { label: '紧急', color: '#D4553C', soft: '#FCE0D8' },
    over: { label: '已过期', color: '#7C7C76', soft: '#E9E4D9' }
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
  formatDuration,
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
