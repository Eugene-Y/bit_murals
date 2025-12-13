// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// TODO post in social networks
// https://p5js.org/reference/#/p5/httpPost
// https://shiffman.net/a2z/twitter-bots/

// TODO экспорт анимации пороговых значений brightness:
// семплирование при помощи SampleSet
// и установка порога на каждом новом значении

const rvtemplate = (p) => {

  let div

  let pattern
  let generator
  let controller
  let view

  let mouseReleaseFix = 0

  p.setup = function() {
    console.group("Bit Murals: setup")
    div = p.canvas.parentElement
    const w = div.clientWidth
    const h = div.clientHeight
    let c = p.createCanvas(w, h)
    c.drop(p.gotFile)
    c.mouseOver(p.mouseOver)
    p.colorMode(p.HSB, 255)
    p.background(40)
    p.strokeCap(p.SQUARE)
    //p.pixelDensity(3) // TODO

    view       = new View(p)
    controller = new Controller(p)
    generator  = new Generator()
    pattern    = new Pattern(w, h)

    controller.setup(pattern, generator)
    view.setup(pattern, controller, w, h)

    controller.nextPattern()
    view.onPatternChange()
    p.resizeCanvas(w, h)

    console.groupEnd()
  }


  p.windowResized = function() {
    const w = div.clientWidth
    const h = div.clientHeight
    p.resizeCanvas(w, h)
    view.setWidthAndHeight(w, h)
    view.updateLayout()
  }


  p.draw = function() {
    //p.scale(0.8) // координаты мыши не масштабируются в используемой версии p5js
    p.push()
    p.background(40)
    p.pop()
    view.draw()
  }


  p.gotFile = function(f) {
    console.log("dropped file", f.name)
    view.stopSlideshow()
    view.loadSettingsFromDroppedFile(f)
  }

  p.mousePressed = function(){
    p.mouseClicked(p.mouseX, p.mouseY)
  }

  p.mouseClicked = function(){
    if (performance.now() - mouseReleaseFix > 10)
      view.mouseClicked(p.mouseX, p.mouseY, p.keyIsDown(p.SHIFT))
  }

  p.mouseReleased = function(){
    mouseReleaseFix = performance.now()
    view.mouseReleased()
  }

  p.doubleClicked = function() {
    view.doubleClicked(p.mouseX, p.mouseY, p.keyIsDown(p.SHIFT))
  }

  p.mouseOver = function(){
    // TODO hints
  }

  p.mouseWheel = function(event){
    view.mouseWheel(p.mouseX, p.mouseY, event.delta, p.keyIsDown(p.SHIFT), p.keyIsDown(p.CONTROL))
    return false // avoid scaling the page with ctrl + wheel
  }

  p.mouseDragged = function(){
    let dx = p.mouseX - p.pmouseX
    let dy = p.mouseY - p.pmouseY
    view.mouseDragged(p.mouseX, p.mouseY, dx, dy)
  }

  p.keyPressed = function() {
    view.keyPressed(p.key, p.keyCode,
                    p.keyIsDown(p.SHIFT), p.keyIsDown(p.CONTROL), p.keyIsDown(p.ALT),)
  }

  p.keyReleased = function() {
    view.keyReleased()
  }
}

const rv = new p5(rvtemplate)