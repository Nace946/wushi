const time = require('../../utils/time')
const storage = require('../../utils/storage')
const { CATEGORIES, EVENT_CATEGORIES, MODE, KIND, kindText } = require('../../utils/constants')

Page({
  data: {
    id: '',
    item: null,
    state: null,
    categoryName: '',
    rows: [],
    isCountUp: false,
    isEvent: false,
    resetBtn: '',
    detailText: ''
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
  },

  onShow() {
    if (this.data.id) this.load()
  },

  load() {
    const item = storage.getById(this.data.id)
    if (!item) {
      // 可能是「不循环的事件倒计时」完成后已被收起（记录仍留在事件记录里）
      wx.showToast({ title: '这条计时已不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const state = time.getItemState(item)
    const cat = CATEGORIES.concat(EVENT_CATEGORIES).find(c => c.key === item.category)
    const isCountUp = item.mode === MODE.COUNTUP
    const isEvent = item.kind === KIND.EVENT
    const kt = kindText(item.kind)

    const rows = []
    if (isCountUp) {
      // 记过精确时刻就一起显示，方便回头对照「到底是几点发生的事」
      const lastVal = item.lastAt
        ? time.formatCN(item.lastDate) + ' ' + time.formatTime(item.lastAt)
        : time.formatCN(item.lastDate)
      rows.push({ label: kt.lastShort, value: lastVal })
      if (state.hasProgress) {
        rows.push({ label: kt.cycleShort, value: (item.cycleDays || '-') + ' 天' })
        rows.push({ label: kt.nextShort, value: time.formatCN(state.targetDate) })
      } else {
        // 纯记录型事件：没有循环间隔，只是安静地数着天数
        rows.push({ label: kt.cycleShort, value: kt.cycleOffShort })
      }
    } else {
      // 倒计时文案随类型变化：物品说「生产日期 / 保质期」，事件说「起始日期 / 持续天数」
      rows.push({ label: kt.cdStart, value: time.formatCN(item.produceDate) || '-' })
      if (item.expireManual) {
        rows.push({ label: kt.cdExpire, value: time.formatCN(item.expireDate) + '（手动）' })
      } else {
        rows.push({
          label: kt.cdSpan,
          value: (item.shelfLife || '-') + ' ' + { day: '天', month: '个月', year: '年' }[item.shelfLifeUnit || 'day']
        })
        rows.push({ label: kt.cdExpire, value: time.formatCN(state.targetDate) })
      }
      // 事件倒计时：完成后是自动进入下一轮，还是记一次后收起
      // （「直接填写到期日」没有周期长度，不做循环）
      if (isEvent) {
        rows.push({
          label: '完成后',
          value: item.expireManual
            ? '不循环 · 完成后只记一次'
            : item.cyclic
              ? kt.cyclicOnText
              : kt.cyclicOffText
        })
      }
    }
    // 没有循环间隔就没有提醒；remindDays 为 0 表示用户选择了「不提醒」
    if (state.hasProgress) {
      const rd = Number(item.remindDays) || 0
      rows.push({ label: '提前提醒', value: rd > 0 ? rd + ' 天' : '不提前提醒' })
    }
    // 数量与存放位置只对「物品 + 倒计时」有意义（事件与正计时都不涉及）
    if (!isCountUp && !isEvent) {
      if (item.location) rows.push({ label: '存放位置', value: item.location })
      // 注意：数量可能为 0，不能用 || 1 兜底（会显示成 1）
      const qty = item.quantity === 0 || item.quantity ? Number(item.quantity) : 1
      rows.push({ label: '数量', value: qty + ' ' + (item.unit || '') })
    }
    if (item.remark) rows.push({ label: '备注', value: item.remark })
    if (item.pinned) rows.push({ label: '首页展示', value: '📌 已置顶' })

    this.setData({
      item,
      state,
      rows,
      isCountUp,
      isEvent,
      resetBtn: kt.resetBtn,
      detailLabel: isEvent ? '已过去' : '已使用',
      detailText: state.detailText || '',
      categoryName: cat ? cat.name : '其他'
    })
    wx.setNavigationBarTitle({ title: item.name || '物品详情' })
  },

  // 正计时：记录一次「已更换 / 已清洗」或「刚刚发生过」
  onReset() {
    const item = this.data.item
    if (!item) return
    const kt = kindText(item.kind)
    wx.showModal({
      title: kt.resetModalTitle,
      content: kt.resetModal(item.name),
      confirmColor: '#0A7F4E',
      success: res => {
        if (!res.confirm) return
        storage.resetCycle(item.id)
        this.load()
        wx.showToast({ title: kt.resetToast, icon: 'success' })
      }
    })
  },

  /**
   * 倒计时事件：这件事已完成
   * 循环的重新计时并留在本页；不循环的记一笔后返回（记录并入「事件记录」）
   */
  onFinishEvent() {
    const item = this.data.item
    if (!item) return
    const cyclic = !!item.cyclic
    wx.showModal({
      title: '「' + item.name + '」已经完成？',
      content: cyclic
        ? '记录一次，并进入下一轮。这一轮没用完的时间会顺延进去，不会白白丢掉。'
        : '记录一次，这条计时会自动收起（记录仍保留在「事件记录」里）。',
      cancelText: '再想想',
      confirmText: '已完成',
      confirmColor: '#0A7F4E',
      success: res => {
        if (!res.confirm) return
        const r = storage.finishEvent(item.id)
        if (r && r.mode === 'recycled') {
          this.load()
          wx.showToast({ title: '已完成 · 已进入下一轮', icon: 'success' })
        } else {
          wx.showToast({ title: '已完成 · 已记录', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 700)
        }
      }
    })
  },

  // 倒计时：已用完 / 丢弃 —— 弹窗二选一
  onFinish() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '此物品已使用完或丢弃？',
      // 说明放在正文：官方限制 cancelText / confirmText 均最多 4 个字符
      content: '已购新品：保留记录，日期更新为今天重新计时。\n不再需要：直接删除这条记录。',
      cancelText: '已购新品',
      confirmText: '删除物品',
      confirmColor: '#E0341F',
      success: res => {
        if (res.confirm) {
          // 右侧按钮：删除
          storage.remove(item.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 600)
        } else if (res.cancel) {
          // 左侧按钮：保留信息，只把日期重置为今天
          wx.navigateTo({ url: '/pages/edit/edit?id=' + item.id + '&reset=1' })
        }
      },
      fail: err => {
        // 兜底提示，避免再次出现"点了没反应"却没有任何反馈
        console.error('[detail] showModal 失败', err)
        wx.showToast({ title: '弹窗失败，请重试', icon: 'none' })
      }
    })
  },

  /** 用掉一个：详情页也能一键记录 */
  onUse() {
    const item = this.data.item
    if (!item) return
    if (Number(item.quantity) <= 0) {
      wx.showToast({ title: '数量已经是 0', icon: 'none' })
      return
    }
    const res = storage.useItem(item.id, 1)
    if (!res) return
    try {
      wx.vibrateShort({ type: 'light', fail: () => {} })
    } catch (e) {
      // 忽略
    }
    const unit = res.item.unit || ''
    this.load()
    wx.showToast({
      title: res.after > 0 ? `已用掉 ${res.n}${unit} · 还剩 ${res.after}${unit}` : '已用完 · 记得补货',
      icon: 'none',
      duration: 2000
    })
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/edit/edit?id=' + this.data.id })
  },

  onDelete() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '删除「' + item.name + '」',
      content: '删除后无法恢复，确定继续吗？',
      confirmColor: '#E0341F',
      success: res => {
        if (!res.confirm) return
        storage.remove(item.id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.item ? this.data.item.name + ' · 物时' : '物时',
      path: '/pages/index/index'
    }
  }
})
