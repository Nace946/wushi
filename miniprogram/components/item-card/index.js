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
    // 简洁模式（首页关注列表用，隐藏进度条）
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
    percentWidth: '0%',
    meta: '',
    isCountUp: false,
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
      const parts = []
      if (item.location) parts.push(item.location)
      // 正计时不展示数量
      if (item.quantity && !isCountUp) parts.push('×' + item.quantity)
      this.setData({
        state,
        percentWidth: Math.round(state.percent * 100) + '%',
        meta: parts.join(' · '),
        isCountUp: item.mode === MODE_COUNTUP
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
