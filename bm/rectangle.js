// bit murals by Eugene Yakshin, 2021
// License: CC Attribution-NonCommercial


class Rectangle {
    constructor(w = 10, h = 10, ox = 0, oy = 0) {
        this._w = w
        this._h = h
        this._oX = ox
        this._oY = oy
    }

    copy(r) {
        return new Rectangle(this._w, this._h, this._oX, this._oY)
    }

    setWidthAndHeight(w, h){
        this._w = w
        this._h = h
    }

    setOffsets(ox, oy){
        this._oX = ox
        this._oY = oy
    }

    contains(x, y) {
        return this.L() <= x && this.T() <= y
            && this.R() > x && this.B() > y
    }

    clear() {
        this._oX = this._oY = -1
        this._w = this._h = 0
    }

    L() { return this._oX }
    R() { return this._oX + this._w }
    T() { return this._oY }
    B() { return this._oY + this._h }
    W() { return this._w }
    H() { return this._h }
    MX() { return this._oX + 0.5 * this._w }
    MY() { return this._oY + 0.5 * this._h }

    getShiftedBy(dx, dy) {
        return new Rectangle(this._w, this._h, this._oX + dx, this._oY + dy)
    }

    getWithMargin(m) {
        return new Rectangle(this._w + 2*m, this._h + 2*m, this._oX - m, this._oY - m)
    }

    log(){
        return "oX & oY: " + this._oX + "  " + this._oY +  "\t    W & H: " + this._w + "  " + this._h
    }

    isValid() {
        if (typeof this._w === "undefined") return false
        if (typeof this._h === "undefined") return false
        if (typeof this._oX === "undefined") return false
        if (typeof this._oY === "undefined") return false
        if (this._w < 0) return false
        if (this._h < 0) return false
        return true
    }

    equalWH(r) { return (this._w === r._w) && (this._h === r._h) }

    equalOrigin(r) { return (this._oX === r._oX) && (this._oY === r._oY) }

    equal(r) { return this.equalWH(r) && this.equalOrigin(r) }
  }
