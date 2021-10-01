const rvtemplate = (p) => {

  p.setup = function() {
    div = p.canvas.parentElement
    const w = div.clientWidth
    const h = div.clientHeight
    let c = p.createCanvas(w, h)
    p.colorMode(p.HSB, 255)
    p.background(40)
    p.textSize(16)
    p.textAlign(p.CENTER, p.CENTER)
    p.strokeCap(p.SQUARE)

    p.ns = 500
    p.noise = p.createGraphics(p.ns, p.ns)
    p.fillNoiseCanvas()
  }


  p.windowResized = function () {
    const w = div.clientWidth
    const h = div.clientHeight
    p.resizeCanvas(w, h)
  }


  p.draw = function() {
    p.background(40, 150)
    const w = p.width
    const h = p.height
    p.drawNoise(w, h)
    const x = w/2 + 3 * Math.random()
    const y = h/2 + Math.random()
    p.fill(190 + 50 * Math.random())    
    p.textSize(20 * (1 + Math.random()/16))
    p.text("UNDER CONSTRUCTION", x, y)
  }


  p.fillNoiseCanvas = function() {
    let n = p.noise
    n.clear()
    let fill = (p, c, a) => {
      for (let i = 0; i < n.width; ++i)
        for (let j = 0; j < n.height; ++j)
          if (Math.random() < p) {
            const r = Math.random()
            n.stroke(c, a * r)
            n.point(i, j)
          }
    }
    fill(0.5, 0, 25)
    fill(0.1, 255, 20)
  }


  p.drawNoise = function(areaW, areaH) {
    const d = 50
    const m = p.ns / d
    const x0 = Math.ceil(Math.random() * m) * d
    const y0 = Math.ceil(Math.random() * m) * d

    let filledH = 0
    let destW = 0;

    let fillLine = (dy) => {
      let filledW = 0
      let destH = Math.min(p.ns, areaH - (filledH - y0))
      while (filledW - x0 < areaW) {
        destW = Math.min(p.ns, areaW - (filledW - x0))
        p.image(p.noise,
          -x0 + filledW, dy - y0,
          destW, destH,
          0, 0,
          destW, destH)
        filledW += destW
      }
      return destH
    }

    while (filledH - y0 < areaH)
      filledH += fillLine(filledH)
  }
}

const rv = new p5(rvtemplate)