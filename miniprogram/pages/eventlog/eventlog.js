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

/**
 * 每条流水右侧的来源标记
 * - 记录已被用户删除：这条计时已经不在列表里了，只把记录留了下来
 * - 倒计时完成且已收起：记一次后这条计时归档了
 * - 倒计时完成且已进入下一轮：明确写出来，避免和正计时的「重新计时」混淆
 * - 正计时重新计时：不加标记（本来就是它的日常）
 */
function logTag(l) {
  if (l.deleted) return ' · 记录已删除'
  if (l.archived) return ' · 计时已收起'
  if (l.type === 'done' && l.cyclic) return ' · 已完成 · 进入下一轮'
  return ''
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
    empty: true,
    limit: storage.LOG_LIMIT
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
      map[l.date].items.push(
        Object.assign({}, l, { timeText: fmtClock(l.ts), tag: logTag(l) })
      )
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
    const ds = e.currentTarget.dataset
    // 不循环的倒计时事件完成后会被收起、被删除的也会归档，都只剩这一条记录，点不进详情
    // （dataset 里布尔可能被转成字符串，用 Number 判断）
    if (Number(ds.archived)) {
      wx.showToast({
        title: Number(ds.deleted) ? '这条记录已删除，记录仍然保留' : '这条计时已收起，记录仍然保留',
        icon: 'none'
      })
      return
    }
    if (ds.id) wx.navigateTo({ url: '/pages/detail/detail?id=' + ds.id })
  },

  /** 长按某条记录 → 删除这一条（只删记录，不影响当前计时） */
  onDeleteLog(e) {
    const ds = e.currentTarget.dataset
    wx.showModal({
      title: '删除这条记录？',
      content: '只删掉这一条记录，当前计时不受影响。',
      confirmText: '删除',
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.removeLog(ds.id, ds.logid)
        this.load()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  /** 清空全部事件记录 */
  onClearLogs() {
    wx.showModal({
      title: '清空事件记录？',
      content: '全部事件记录会被清掉，各条计时的进度不受影响。',
      confirmText: '清空',
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.clearLogs('event')
        this.load()
        wx.showToast({ title: '已清空', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '天天计时 · 记住每件物品的保质期与更换周期',
      path: '/pages/index/index'
    }
  }
})
