Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    text: {
      type: String,
      value: ''
    },
    showUndo: {
      type: Boolean,
      value: true
    }
  },

  data: {
    visible: false,
    leaving: false
  },

  observers: {
    /** 进场直接显示；退场先播淡出动画再移除，避免"啪"地消失 */
    show: function (v) {
      if (v) {
        this.setData({ visible: true, leaving: false })
        return
      }
      if (!this.data.visible) return
      this.setData({ leaving: true })
      setTimeout(() => {
        this.setData({ visible: false, leaving: false })
      }, 240)
    }
  },

  methods: {
    onUndo() {
      this.triggerEvent('undo')
    },

    /** 阻止点击透传到下层页面 */
    noop() {}
  }
})
