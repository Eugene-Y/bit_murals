// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Framing {
    constructor(x0 = 0, y0 = 0, zoom = 1) {
        this.x0 = x0
        this.y0 = y0
        this.zoom = zoom
    }

    copy() { return new Framing(this.x0, this.y0, this.zoom) }

    set(f){
        this.x0 = f.x0
        this.y0 = f.y0
        this.zoom = f.zoom
    }

    equal(f) { return this.x0 == f.x0 && this.y0 == f.y0 && this.zoom == f.zoom }
}




class PanZoomController {
    constructor (){
        this._pattern = null
        this.l = new Logger("PanZoomController")
        this.l.setActive(false)
    }


    setPattern(p) { this._pattern = p }


    panPatternBy(dx, dy){
        const z = this._pattern.getZoom()
        dx *= z
        dy *= z
        this.l.logc("shifting pattern by", dx, dy)
	    this._pattern.shiftOXYby(dx, dy)
        this.l.loge()
    }


    zoomPattern(x, y, oX, oY, amount, snap, slow){
        this.l.logc("zooming", amount)
        const currZoom = this._pattern.getZoom()
        let newZoom = currZoom
        if (snap)
            newZoom = this.calculateSnappedZoom(amount)
        else if (slow)
            newZoom = this.calculateSlowZoom(amount)
        else
            newZoom = this.calculateNormalZoom(amount)

        if (newZoom == currZoom) {
            this.l.log("same zoom! :/")
            return false
        }

        this.l.log("new zoom:", newZoom)
        this._pattern.setZoom(newZoom)

        const [w, h] = this._pattern.getWidthAndHight()
        const xPortion = (x - oX) / w
        const yPortion = (y - oY) / h
        const dMarginX = (currZoom - newZoom) * w
        const dMarginY = (currZoom - newZoom) * h
        const dX = -dMarginX * xPortion
        const dY = -dMarginY * yPortion
        this._pattern.shiftOXYby(dX, dY)
        this.l.loge()
        return true
    }


    calculateSnappedZoom(amount){
        this.l.log("snapped zoom")
        const currZoom = this._pattern.getZoom()
        const z = amount > 0 ?
                  currZoom * 2
                : currZoom / 2
        return z
   }


    calculateSlowZoom(amount){
        this.l.log("slow zoom")
        const currZoom = this._pattern.getZoom()
        const z = amount > 0 ?
                  currZoom * 1.1
                : currZoom / 1.1
        return z
    }


    calculateNormalZoom(amount){
        this.l.log("normal zoom")
        const currZoom = this._pattern.getZoom()
        const zRatio = Math.pow(2, Math.abs(amount) / 64.0)
        const z = amount > 0 ?
                  currZoom * zRatio
                : currZoom / zRatio
        return z
    }


    setFraming(newFraming) {
        if (newFraming.equal(this._pattern.getFraming())) {
            this.l.log("same framing")
            return false
        }

        this._pattern.setFraming(newFraming)
        return true
    }
}