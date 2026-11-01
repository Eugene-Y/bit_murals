// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// The p5 canvas covers the whole window above the panel and ignores the
// pointer: it draws the pattern where #pattern-area is, and the noise over all.
const friendlyTemplate = (p) => {
    let view

    p.setup = function() {
        const c = p.createCanvas(window.innerWidth, window.innerHeight)
        c.id("overlay")
        p.colorMode(p.HSB, 255)
        view = new FriendlyView(p)
        view.setup()
    }

    p.draw = function() { view.draw() }

    p.windowResized = function() { view.resize() }
}

new p5(friendlyTemplate)
