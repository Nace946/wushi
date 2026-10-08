Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    pieces: []
  },

  attached() {
    this.build()
  },

  methods: {
    /** 生成丝带碎片：细长条 + 尾部渐隐，从两侧斜向上喷出后飘向中间 */
    build() {
      const colors = ['#3F8A6B', '#D18C2A', '#D4553C', '#5EAE8C', '#E8B84B']
      const pieces = []
      for (let i = 0; i < 18; i++) {
        const isLeft = i % 2 === 0
        const slot = Math.floor(i / 2) % 5
        const color = colors[i % colors.length]
        pieces.push({
          id: i,
          side: isLeft ? 'l' : 'r',
          // 起点贴着左右边缘，高度错开，形成喷射层次
          x: isLeft ? 0 : 98,
          top: 46 + slot * 9,
          // 细长丝带：宽度固定很窄，长度错落
          w: 5,
          h: 38 + (i % 4) * 13,
          // 尾部渐隐，接近真实丝带的通透感
          bg: 'linear-gradient(180deg,' + color + ' 0%,' + color + '55 100%)',
          delay: (i % 5) * 60,
          dur: 1500 + (i % 4) * 160
        })
      }
      this.setData({ pieces })
    }
  }
})
