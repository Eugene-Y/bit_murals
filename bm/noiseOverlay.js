// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


// A tile of sparse dark and light specks, drawn over everything every frame
// at a random offset, so the whole picture shimmers slightly.
class NoiseOverlay {
    constructor(p5, side = 500) {
        this._side = side
        this._tile = p5.createGraphics(side, side)
        this._tile.colorMode(this._tile.HSB, 255)
        this.fillTile()
    }


    fillTile(){
        let n = this._tile
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


    draw(destCanvas, areaW, areaH){
        const nSide = this._side
        const d = 50 // чтобы разброс рандома был побольше и шум не "застывал"
        const m = nSide / d
        const x0 = Math.ceil(Math.random() * m) * d
        const y0 = Math.ceil(Math.random() * m) * d

        let filledH = 0
        let destW = 0;

        let fillLine = (dy) => {
            let filledW = 0
            let destH = Math.min(nSide, areaH - (filledH - y0))
            while (filledW - x0 < areaW) {
                destW = Math.min(nSide, areaW - (filledW - x0))
                destCanvas.image(this._tile,
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
