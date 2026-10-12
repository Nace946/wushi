const time = require('../../utils/time')

const MODE_COUNTUP = 'countup'

Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    item: {
      type: Object,
      value: null,
      observer(val) {
        this.compute(val)
      }
    },
    // 简洁模式（首页列表用，只保留核心信息，不显示副文案）
    compact: {
      type: Boolean,
      value: false
    },
    // 是否显示快捷操作按钮（倒计时 − / 正计时 ↺）
    showUse: {
      type: Boolean,
      value: true
    }
  },

  data: {
    state: null,
    meta: '',
    isCountUp: false,
    isEvent: false,
    isEventCountdown: false,
    showAction: true,
    popping: false,
    flying: false
  },

  methods: {
    compute(item) {
      if (!item) {
        this.setData({ state: null })
        return
      }
      const state = item._state || time.getItemState(item)
      const isCountUp = item.mode === MODE_COUNTUP
      // 事件没有「实体」，不涉及数量与存放位置（v3.0 起事件也支持倒计时）
      const isEvent = item.kind === 'event'
      const parts = []
      if (!isEvent) {
        if (item.location) parts.push(item.location)
        // 正计时不展示数量
        if (item.quantity && !isCountUp) parts.push('×' + item.quantity)
      }
      const isEventCountdown = isEvent && !isCountUp
      this.setData({
        state,
        meta: parts.join(' · '),
        isCountUp,
        isEvent,
        isEventCountdown,
        // 快捷按钮：正计时 = 重新计时（物品 / 事件都适用）
        //           倒计时 = 物品「用掉一个」/ 事件「已完成」（v3.2 起事件倒计时也能一键完成）
        showAction: true
      })
    },

    /** 轻震动：增强"按下去有回应"的手感（不支持时静默跳过） */
    vibrate() {
      try {
        wx.vibrateShort({ type: 'light', fail: () => {} })
      } catch (e) {
        // 忽略
      }
    },

    /** 倒计时：用掉一个 —— 一次点击 + 弹跳动效 + 数字上浮 */
    onUse() {
      const item = this.data.item
      if (!item) return
      if (Number(item.quantity) <= 0) {
        wx.showToast({ title: '数量已经是 0', icon: 'none' })
        return
      }

      this.vibrate()
      this.setData({ popping: true, flying: true })
      setTimeout(() => this.setData({ popping: false }), 320)
      setTimeout(() => this.setData({ flying: false }), 820)

      this.triggerEvent('use', { id: item.id })
    },

    /**
     * 倒计时事件：这件事已完成
     * 与「用掉一个」区分开 —— 事件没有数量，也不需要 −1 的飘字
     */
    onFinish() {
      const item = this.data.item
      if (!item) return

      this.vibrate()
      this.setData({ popping: true })
      setTimeout(() => this.setData({ popping: false }), 320)

      this.triggerEvent('finish', { id: item.id })
    },

    /** 正计时：重新开始计时（等同详情页「我刚处理过」） */
    onReset() {
      const item = this.data.item
      if (!item) return

      this.vibrate()
      this.setData({ popping: true })
      setTimeout(() => this.setData({ popping: false }), 320)

      this.triggerEvent('reset', { id: item.id })
    },

    onTap() {
      this.triggerEvent('tap', { id: this.data.item && this.data.item.id })
    },

    onLongPress() {
      this.triggerEvent('longpress', { id: this.data.item && this.data.item.id })
    }
  }
})
