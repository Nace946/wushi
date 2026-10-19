const backup = require('../../utils/backup')

Page({
  data: {
    count: 0,
    itemCount: 0,
    eventCount: 0,
    usageCount: 0,
    eventLogCount: 0,
    hasDemo: false,
    canShare: false,
    busy: false,
    // 解析成功后的「待确认」预览；真正入库要用户点合并/覆盖
    preview: null
  },

  onLoad() {
    // wx.shareFileMessage 需基础库 2.16.1+（且仅真机可用），没有就走复制兜底
    this.setData({ canShare: typeof wx.shareFileMessage === 'function' })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData(backup.localSummary())
  },

  /* ---------------- 导出 ---------------- */

  onExport() {
    if (this.data.busy) return
    if (this.data.count === 0) {
      wx.showToast({ title: '还没有可导出的记录', icon: 'none' })
      return
    }

    const payload = backup.build()
    const json = backup.toJson(payload)
    const name = backup.fileName(payload.exportedAt)

    this.setData({ busy: true })

    // 先落到临时目录，再交给微信转发 —— 转发的是文件本身，不经过服务器
    let filePath = ''
    try {
      filePath = wx.env.USER_DATA_PATH + '/' + name
      wx.getFileSystemManager().writeFileSync(filePath, json, 'utf8')
    } catch (e) {
      console.error('[backup] 写入临时文件失败', e)
      filePath = ''
    }

    if (filePath && typeof wx.shareFileMessage === 'function') {
      wx.shareFileMessage({
        filePath: filePath,
        fileName: name,
        success: () => {
          this.setData({ busy: false })
          wx.showToast({ title: '备份已发出', icon: 'success' })
        },
        fail: err => {
          this.setData({ busy: false })
          const msg = (err && err.errMsg) || ''
          // 用户自己取消，不必再弹复制框
          if (msg.indexOf('cancel') > -1 || msg.indexOf('deny') > -1) return
          this.copyFallback(json, name, msg)
        }
      })
      return
    }

    this.setData({ busy: false })
    this.copyFallback(json, name, '')
  },

  /**
   * 兜底：分享文件不可用时，把备份内容复制到剪贴板
   * 记录多的时候内容会长，所以文案里提醒「更适合文件方式」
   */
  copyFallback(json, name, reason) {
    wx.setClipboardData({
      data: json,
      success: () => {
        wx.showModal({
          title: '备份内容已复制',
          content:
            '当前设备不支持直接发送文件，备份内容已复制到剪贴板。\n\n' +
            '可以粘贴到「文件传输助手」或备忘录里保存，换手机后在小程序里用「从剪贴板粘贴」导入。\n\n' +
            '文件名：' + name,
          showCancel: false,
          confirmText: '知道了'
        })
      },
      fail: () => {
        wx.showModal({
          title: '导出失败',
          content: reason ? '分享与复制都没成功（' + reason + '）。' : '复制没成功，请稍后重试。',
          showCancel: false
        })
      }
    })
  },

  /* ---------------- 导入 ---------------- */

  onPickFile() {
    if (typeof wx.chooseMessageFile !== 'function') {
      wx.showModal({
        title: '微信版本过低',
        content: '当前微信不支持从聊天记录选文件，请升级微信，或改用「从剪贴板粘贴」导入。',
        showCancel: false
      })
      return
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: res => {
        const f = (res.tempFiles || [])[0]
        if (!f) return
        if (f.size && f.size > backup.MAX_BYTES) {
          wx.showModal({ title: '文件太大', content: '这个文件不像是本小程序的备份。', showCancel: false })
          return
        }
        let text = ''
        try {
          text = wx.getFileSystemManager().readFileSync(f.path, 'utf8')
        } catch (e) {
          console.error('[backup] 读取文件失败', e)
          wx.showModal({ title: '读取失败', content: '没能读到这个文件，换一个再试。', showCancel: false })
          return
        }
        this.handleText(text, '聊天文件「' + (f.name || '未命名') + '」')
      },
      fail: () => {}
    })
  },

  onPaste() {
    wx.getClipboardData({
      success: res => {
        const text = res && res.data
        if (!text) {
          wx.showToast({ title: '剪贴板是空的', icon: 'none' })
          return
        }
        this.handleText(text, '剪贴板内容')
      },
      fail: () => {
        wx.showToast({ title: '读不到剪贴板', icon: 'none' })
      }
    })
  },

  handleText(text, source) {
    const r = backup.parse(text)
    if (!r.ok) {
      wx.showModal({
        title: '读取失败',
        content: r.error + '\n\n请确认选的是「天天计时」导出的 .json 备份。',
        showCancel: false
      })
      return
    }
    this.pending = r
    this.setData({
      preview: {
        source: source,
        count: r.items.length,
        itemCount: r.items.filter(i => i.kind !== 'event').length,
        eventCount: r.items.filter(i => i.kind === 'event').length,
        atText: r.exportedAtText,
        skipped: r.skipped
      }
    })
    wx.pageScrollTo({ selector: '#preview-card', duration: 260 })
  },

  onCancelPreview() {
    this.pending = null
    this.setData({ preview: null })
  },

  onMerge() {
    const p = this.data.preview
    if (!p || !this.pending) return
    wx.showModal({
      title: '合并导入',
      content:
        '备份里的 ' + p.count + ' 条会与本机现有的 ' + this.data.count + ' 条合并：' +
        '同一条记录按较新的那份算，不会重复。',
      confirmText: '确认合并',
      confirmColor: '#0A7F4E',
      success: res => {
        if (res.confirm) this.doApply('merge')
      }
    })
  },

  onReplace() {
    const p = this.data.preview
    if (!p || !this.pending) return
    wx.showModal({
      title: '覆盖本机数据',
      content:
        '将清空本机现有的 ' + this.data.count + ' 条记录，替换为备份里的 ' + p.count + ' 条。' +
        '这一步无法撤销。',
      confirmText: '确认覆盖',
      confirmColor: '#E0341F',
      success: res => {
        if (res.confirm) this.doApply('replace')
      }
    })
  },

  doApply(mode) {
    const r = backup.applyImport(this.pending.items, this.pending.settings, mode)
    this.pending = null
    this.setData({ preview: null })
    this.refresh()

    const bits = []
    if (r.added) bits.push('新增 ' + r.added + ' 条')
    if (r.updated) bits.push('更新 ' + r.updated + ' 条')
    if (!bits.length) bits.push('本机内容已是最新')
    if (r.droppedDemo) bits.push('顺手清掉 ' + r.droppedDemo + ' 条示例')

    wx.showModal({
      title: '导入完成',
      content: bits.join('，') + '。',
      showCancel: false,
      confirmText: '好的'
    })
  }
})
