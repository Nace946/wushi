Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    // 0 ~ 1
    percent: {
      type: Number,
      value: 0,
      observer() {
        this.build()
      }
    },
    size: { type: Number, value: 240 },
    stroke: { type: Number, value: 18 },
    color: { type: String, value: '#3F8A6B' },
    track: { type: String, value: '#E8E6E0' },
    hole: { type: String, value: '#FFFFFF' }
  },

  data: {
    gradient: '',
    holeSize: '0rpx'
  },

  lifetimes: {
    attached() {
      this.build()
    }
  },

  methods: {
    build() {
      const p = Math.min(1, Math.max(0, Number(this.data.percent) || 0))
      const d = this.data
      const fixed = p.toFixed(4)
      // 使用 conic-gradient 绘制环形进度；低版本 WebView 不支持时退化为纯色底环，建议真机验证
      this.setData({
        gradient: `conic-gradient(from -90deg, ${d.color} 0turn ${fixed}turn, ${d.track} ${fixed}turn 1turn)`,
        holeSize: d.size - d.stroke * 2 + 'rpx'
      })
    }
  }
})
