const time = require('../../utils/time')
const storage = require('../../utils/storage')

/** 时间戳 → HH:MM */
function fmtClock(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const h = String(d.getHours())
  const m = String(d.getMinutes())
  return (h.length < 2 ? '0' + h : h) + ':' + (m.length < 2 ? '0' + m : m)
}

/** 同一条记录相邻两次之间的间隔文案（本次 − 上次） */
function fmtGap(ms) {
  if (!ms || ms <= 0) return ''
  const hour = 3600000
  if (ms < hour) return '相隔 ' + Math.max(1, Math.round(ms / 60000)) + ' 分钟'
  if (ms < time.DAY) return '相隔 ' + Math.floor(ms / hour) + ' 小时'
  const d = Math.floor(ms / time.DAY)
  if (d >= 365) return '相隔 ' + (d / 365).toFixed(1).replace(/\.0$/, '') + ' 年'
  if (d >= 30) return '相隔 ' + Math.floor(d / 30) + ' 个月'
  return '相隔 ' + d + ' 天'
}

Page({
  data: {
    groups: [],
    todayCount: 0,
    totalCount: 0,
    empty: true
  },

  onShow() {
    this.load()
  },

  load() {
    const logs = storage.getAllEventLogs()
    const today = time.today()

    // 逐条补上「与上一次相隔多久」：按时间正序推，同一条记录记住上一次的时刻
    const asc = logs.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))
    const lastByItem = {}
    asc.forEach(l => {
      const prev = lastByItem[l.itemId]
      l.gapText = prev ? fmtGap((l.ts || 0) - prev) : ''
      lastByItem[l.itemId] = l.ts || 0
    })

    let todayCount = 0
    logs.forEach(l => {
      if (l.date === today) todayCount++
    })

    // 按日期分组（倒序）
    const map = {}
    logs.forEach(l => {
      if (!map[l.date]) map[l.date] = { date: l.date, title: '', items: [] }
      map[l.date].items.push(Object.assign({}, l, { timeText: fmtClock(l.ts) }))
    })

    const groups = Object.keys(map)
      .sort()
      .reverse()
      .map(d => {
        const g = map[d]
        g.title = this.dateTitle(d)
        return g
      })

    this.setData({
      groups,
      todayCount,
      totalCount: logs.length,
      empty: groups.length === 0
    })
  },

  dateTitle(d) {
    const today = time.today()
    if (d === today) return '今天'
    if (d === time.addDays(today, -1)) return '昨天'
    return time.formatCN(d) + ' · ' + time.weekday(d)
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onShareAppMessage() {
    return {
      title: '物时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
