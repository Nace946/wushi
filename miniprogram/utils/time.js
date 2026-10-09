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

/** 'YYYY-MM-DD' -> 本地时区当天 0 点的毫秒时间戳（用于分钟/小时级精算） */
function dayStart(str) {
  const p = String(str || '').split('-')
  if (p.length !== 3) return NaN
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime()
}

/**
 * 正计时的起点时刻：优先用精确时刻 lastAt，没有则退回「上次日期当天 0 点」
 * @param {Object} item
 * @returns {Number} 毫秒时间戳，无法解析时返回 NaN
 */
function startStamp(item) {
  if (!item) return NaN
  const at = Number(item.lastAt)
  if (at > 0) return at
  return dayStart(item.lastDate)
}

/** 毫秒时间戳 -> 'HH:mm' */
function formatTime(stamp) {
  const n = Number(stamp)
  if (!n) return ''
  const d = new Date(n)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
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
 * 起点到「现在」的时长，拆成 年 / 月 / 日 / 时
 * 为 0 的段不显示，例如：3个月5天、1年2个月、2天6小时
 *
 * 起点优先取精确时刻 atStamp（新建 / 重新计时 / 用户点「取当前时间」时写入），
 * 这样小时数才是真的「过了几小时」，而不是「从当天 0 点算起几小时」；
 * 没有精确时刻时退回 startDate 当天 0 点。
 *
 * @param {String} startDate 'YYYY-MM-DD'
 * @param {Number} atStamp 精确起始时刻（毫秒，可选）
 * @param {Date} now 参照时间，默认当前
 */
function formatDuration(startDate, atStamp, now) {
  let s
  const at = Number(atStamp)
  if (at > 0) {
    s = new Date(at)
  } else {
    const t = dayStart(startDate)
    if (isNaN(t)) return ''
    s = new Date(t)
  }
  if (isNaN(s.getTime())) return ''

  const n = now || new Date()
  if (n.getTime() < s.getTime()) return ''

  let years = n.getFullYear() - s.getFullYear()
  let months = n.getMonth() - s.getMonth()
  let days = n.getDate() - s.getDate()
  let hours = n.getHours() - s.getHours()
  let mins = n.getMinutes() - s.getMinutes()

  // 分不够向小时借，小时不够向天借，天不够向上个月借
  if (mins < 0) {
    mins += 60
    hours -= 1
  }
  if (hours < 0) {
    hours += 24
    days -= 1
  }
  if (days < 0) {
    months -= 1
    days += new Date(n.getFullYear(), n.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const parts = []
  if (years) parts.push(years + '年')
  if (months) parts.push(months + '个月')
  if (days) parts.push(days + '天')
  if (hours) parts.push(hours + '小时')

  if (!parts.length) return '不足 1 小时'
  return parts.join('')
}

/**
 * 求解正计时的「起点精确时刻」（所有正计时记录共有，与「详细计时」开关无关）
 *
 * 没有它，起点只能退回「上次日期当天 0 点」，今天刚记的事也会显示成
 * 「已过去 8 小时」，既不准也容易让人误会。
 *
 * @param {String} lastDate 'YYYY-MM-DD' 上次发生 / 更换日期
 * @param {Number} lastAt 已记录的精确时刻（毫秒，可为 0）
 * @returns {Number} 毫秒时间戳；0 表示按当天 0 点计
 */
function resolveStartAt(lastDate, lastAt) {
  if (!lastDate) return 0
  const at = Number(lastAt) || 0
  // 已记过「与上次日期同一天」的时刻：沿用原值，避免每次保存都把起点往后推
  if (at > 0 && formatDate(new Date(at)) === lastDate) return at
  // 日期就是今天（新建、或老数据从没记过）：以此刻为起点
  if (lastDate === today()) return Date.now()
  // 过去某天发生的事无从得知几点，交给当天 0 点
  return 0
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
    remindable: true, // 是否具备提醒语义（纯记录型事件为 false，不进首页关注/处理列表）
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

    // 起点精确时刻 lastAt 是所有正计时记录共有的（新建 / 重新计时 / 取当前时间时写入），
    // 有了它小时数才是真的「过了几小时」；只有历史数据没有它，才退回「上次日期当天 0 点」
    const startMs = startStamp(item)
    const elapsedMs = isNaN(startMs) ? NaN : Math.max(0, Date.now() - startMs)

    // 「已过去多少天」也按真实时长折算：否则跨天时会冒出「0 天」配「1天6小时」这种自相矛盾
    const used = isNaN(elapsedMs)
      ? Math.max(0, diffDays(item.lastDate, t))
      : Math.floor(elapsedMs / DAY)
    const underDay = !isNaN(elapsedMs) && elapsedMs < DAY

    // 不足一天：主数值改用「小时 / 分钟」，比「0 天」更贴近真实感受
    let mainValue = String(used)
    let mainUnit = '天'
    if (underDay) {
      if (elapsedMs < 3600000) {
        mainValue = String(Math.max(1, Math.floor(elapsedMs / 60000)))
        mainUnit = '分钟'
      } else {
        mainValue = String(Math.floor(elapsedMs / 3600000))
        mainUnit = '小时'
      }
    }

    // 详细时长：超过一天时补充 年/月/日/时 细分；不足一天时主数值已经足够精确，不重复展示
    const detailText =
      item.detailTiming && !underDay ? formatDuration(item.lastDate, item.lastAt) : ''

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
        remindable: false, // 没有提醒日期，就不该出现在首页「需要关注 / 需要处理」里
        mainValue: mainValue,
        mainUnit: mainUnit,
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
      // 进度条按真实时长算：短周期（如洗澡 2 天）才不会整天停在 0%
      percent: clamp01(
        cycle > 0 ? (isNaN(elapsedMs) ? used / cycle : elapsedMs / (cycle * DAY)) : 0
      ),
      hasProgress: true,
      mainValue: mainValue,
      mainUnit: mainUnit,
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
  resolveStartAt,
  DAY,
  formatDate,
  toStamp,
  dayStart,
  startStamp,
  formatTime,
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
