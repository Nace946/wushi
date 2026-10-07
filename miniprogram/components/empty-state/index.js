Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    emoji: { type: String, value: '🌿' },
    text: { type: String, value: '暂无数据' },
    subText: { type: String, value: '' },
    buttonText: { type: String, value: '' }
  },

  methods: {
    onAction() {
      this.triggerEvent('action')
    }
  }
})
