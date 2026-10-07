const time = require('../../utils/time')

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
    }
  },

  data: {
    state: null,
    percentWidth: '0%',
    location: '',
    meta: ''
  },

  methods: {
    compute(item) {
      if (!item) {
        this.setData({ state: null })
        return
      }
      const state = item._state || time.getItemState(item)
      const parts = []
      if (item.location) parts.push(item.location)
      if (item.quantity) parts.push('×' + item.quantity)
      this.setData({
        state,
        percentWidth: Math.round(state.percent * 100) + '%',
        meta: parts.join(' · ')
      })
    },

    onTap() {
      this.triggerEvent('tap', { id: this.data.item && this.data.item.id })
    },

    onLongPress() {
      this.triggerEvent('longpress', { id: this.data.item && this.data.item.id })
    }
  }
})
