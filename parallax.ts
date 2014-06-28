module Parallax {

    export interface IKeyframe {
        selector: string;
        duration?: number;
        animations?: IAnimation[]
    }

    export interface IAnimation {
        selector: string;
        startTime?: number;
        endTime?: number;
        translateX?: number;
        translateY?: number;
        opacity?: number;
        scale?: number;
        rotate?: number;

        initialOpacity?: number;
        initialScale?: number;
        initialRotation?: number;
    }

    export class Scene {
        $window = $(window);
        $body = $("body");
        windowHeight: number;
        windowWidth: number;
        bodyHeight: number;
        previousScrollTop: number;
        scrollTop: number;
        scrollIntervalId: number;
        currentSceneNumber: number;
        curKeyframeStartTime: number;

        keyframes: Keyframe[];
        keyframesMaxIndex: number;

        constructor(keyframes: IKeyframe[]) {
            this.keyframes = keyframes.map(desc => new Keyframe(desc));
            this.$window.resize(() => this.init());
            this.init();
        }

        init() {
            this.scrollTop = this.$window.scrollTop();
            this.windowHeight = this.$window.height();
            this.windowWidth = this.$window.width();
            this.keyframes.forEach(keyframe => {
                keyframe.convertToPixels(this.windowHeight, this.windowWidth);
            });
            this.keyframesMaxIndex = this.keyframes.length - 1;
            this.bodyHeight = this.windowHeight;
            this.keyframes.forEach(f => this.bodyHeight += f.durationPx);
            this.$body.height(this.bodyHeight);

            // scroll to top
            window.scrollTo(0, 0);
            this.previousScrollTop = 0;

            // set the current frame to 0 (first frame)
            this.curKeyframeStartTime = 0;
            this.currentSceneNumber = 0;

            var keyframe = this.keyframes[this.currentSceneNumber];
            keyframe.update(this.scrollTop - this.curKeyframeStartTime, true, true);
            keyframe.show();

            // now that everything is set up, start the interval to update screen
            this.scrollIntervalId = setInterval(() => {
                this.update();
            }, 10);
        }

        update() {
            window.requestAnimationFrame(() => {
                this.previousScrollTop = this.scrollTop;
                this.scrollTop = this.$window.scrollTop();
                var isScrollingDown = this.scrollTop >= this.previousScrollTop;

                var keyframe = this.keyframes[this.currentSceneNumber];

                if (this.scrollTop > this.curKeyframeStartTime + keyframe.durationPx) {
                    this.currentSceneNumber = Math.min(this.currentSceneNumber + 1, this.keyframesMaxIndex);
                    this.curKeyframeStartTime += keyframe.durationPx;
                    // make sure the previous keyframe is set to its finishing position
                    keyframe.update(keyframe.durationPx, isScrollingDown, true);
                    // now hide it and show the new one
                    keyframe.hide();
                    keyframe = this.keyframes[this.currentSceneNumber];
                    keyframe.update(0, true, true);
                    keyframe.show();
                } else if (this.scrollTop < this.curKeyframeStartTime) {
                    this.currentSceneNumber = Math.max(0, this.currentSceneNumber - 1);
                    this.curKeyframeStartTime -= keyframe.durationPx;
                    // make sure the previous keyframe is set to its starting position
                    keyframe.update(0, true, true);
                    // now hide it and show the new one
                    keyframe.hide();
                    keyframe = this.keyframes[this.currentSceneNumber];
                    keyframe.update(0, isScrollingDown, true);
                    keyframe.show();
                }

                var time = this.scrollTop - this.curKeyframeStartTime;
                keyframe.update(time, isScrollingDown, false);
            });
        }
    }

    export class Keyframe {
        element: JQuery;
        elementsDown: Parallax.Element[];
        elementsUp: Parallax.Element[];
        durationPercent: number;
        durationPx: number;

        constructor(description: IKeyframe) {
            this.element = $(description.selector);
            this.durationPercent = description.duration === undefined ? 1 : description.duration;
            if (!this.element) {
                throw "No element selected for this page with selector: " + description.selector;
            }
            if (description.animations === undefined) {
                this.elementsDown = [];
                this.elementsUp = [];
            } else {
                this.elementsDown = description.animations.map(desc => new Parallax.Element(this, desc));
            }
        }

        /// Show page, position all elements on their starting position
        show() {
            this.element.show();
        }

        /// Hide page
        hide() {
            this.element.hide();
        }

        update(time: number, isScrollingDown: boolean, forceUpdate: boolean) {
            var elements = isScrollingDown ? this.elementsDown : this.elementsUp;
            elements.forEach(element => element.updateAnimation(time, this.durationPx, isScrollingDown, forceUpdate));
        }

        convertToPixels(height: number, width: number) {
            this.durationPx = this.durationPercent * height;
            this.elementsDown.forEach(element => element.convertToPixels(height, width, this.durationPx));
            // now sort the elements on their startTime
            this.elementsDown.sort((a, b) => a.startTime - b.startTime);
            this.elementsUp = this.elementsDown.slice(0).sort((a, b) => b.startTime - a.startTime);
        }
    }

    export interface Animation {
        translateX?: number;
        translateY?: number;
        opacity?: number[];
        rotate?: number[];
        scale?: number[];

        translateXpx?: number[];
        translateYpx?: number[];
    }

    export class Element {
        element: JQuery;
        translateXpx: number;
        translateYpx: number;
        startTime: number;
        endTime: number;
        duration: number;
        isTranslate: boolean;
        isOpacity: boolean;
        isScale: boolean;
        isRotation: boolean;

        constructor(keyframe: Keyframe, private description: IAnimation) {
            this.element = description.selector.charAt(0) === "#" ? $(description.selector) : $(description.selector, keyframe.element);
            if (!this.element) {
                throw "No element selected with selector: " + description.selector + " in keyframe " + keyframe.element.attr("id");
            }
            this.description = $.extend({
                initialOpacity: 1,
                initialScale: 1,
                initialRotation: 0
            }, this.description);

            this.isTranslate = this.description.translateX !== undefined || this.description.translateY !== undefined;
            this.isOpacity = this.description.opacity !== undefined;
            this.isScale = this.description.scale !== undefined;
            this.isRotation = this.description.rotate !== undefined;
        }

        updateAnimation(time: number, totalDuration: number, isScrollingDown: boolean, forceUpdate: boolean) {
            var canSkip = (time < this.startTime && isScrollingDown) || (time > this.endTime && !isScrollingDown);
            if (canSkip && !forceUpdate)
                return;

            // build transform
            var css = {}, transform = "";
            if (this.isTranslate) {
                transform += "translate3d(" + this.calcPropValue(this.translateXpx, time, 0) + "px, " + this.calcPropValue(this.translateYpx, time, 0) + "px, 0)";
            }
            if (this.isScale) {
                transform += " scale(" + this.calcPropValue(this.description.scale, time, this.description.initialScale, false) + ")";
            }
            if (this.isRotation) {
                transform += " rotate(" + this.calcPropValue(this.description.rotate, time, this.description.initialRotation) + "deg)";
            }
            if (transform.length > 0) {
                css["transform"] = transform;
            }
            if (this.isOpacity) {
                css["opacity"] = this.calcPropValue(this.description.opacity, time, this.description.initialOpacity);
            }

            this.element.css(css);
        }

        calcPropValue(value: number, time: number, defaultValue: number, useRounding: boolean = true) {
            if (value === undefined || time < this.startTime)
                return defaultValue;

            if (time > this.endTime) {
                return value;
            }

            var result = this.easeInOutQuad(time - this.startTime, defaultValue, value - defaultValue, this.duration);
            if (useRounding)
                result = +result.toFixed(2);

            return result;
        }

        easeInOutQuad(time: number, start: number, delta: number, duration: number): number {
            //sinusoadial in and out
            return -delta / 2 * (Math.cos(Math.PI * time / duration) - 1) + start;
        }

        convertToPixels(height: number, width: number, totalDuration: number) {
            this.translateXpx = convertPercentToPx(this.description.translateX, width);
            this.translateYpx = convertPercentToPx(this.description.translateY, height);

            // calculate startTime and endTime
            this.startTime = this.description.startTime ? this.description.startTime * totalDuration : 0;
            this.endTime = this.description.endTime ? this.description.endTime * totalDuration : totalDuration;
            this.duration = this.endTime - this.startTime;
        }
    }

    function convertPercentToPx(value: any, fullValue: number) {
        if (typeof value === "string" && value.match(/%/g)) {
            return (parseFloat(value) / 100) * fullValue;
        }
        return value ? value : 0;
    }
}