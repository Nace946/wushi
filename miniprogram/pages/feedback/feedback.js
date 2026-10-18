Page({
  data: {
    content: ''
  },

  onInput(e) {
    this.setData({ content: e.detail.value })
  },

  // 点击「发送反馈」：先把内容复制到剪贴板，再交由 open-type="contact" 打开客服会话
  onSend() {
    const text = (this.data.content || '').trim()
    if (!text) return

    wx.setClipboardData({
      data: text,
      fail: () => {
        wx.showToast({ title: '复制失败，请手动输入', icon: 'none', duration: 2200 })
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
