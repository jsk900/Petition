(function() {
    if ($("canvas").length) {
        const canvasSign = $("#canvas");
        const canvas     = $("canvas");
        const sign = canvas[0].getContext("2d");
        var prevX;
        var prevY;
        function draw(x, y, ifDown) {
            if (ifDown) {
                sign.beginPath();
                sign.strokeStyle = "#D4A73B";
                sign.moveTo(prevX, prevY);
                sign.lineTo(x, y);
                sign.closePath()
                sign.stroke();
            }
            prevX = x;
            prevY = y;
        }
        canvas.on("mousedown", (e) => {
            draw(e.offsetX, e.offsetY, false);
            canvas.on("mousemove", (e) => {
                draw(e.offsetX, e.offsetY, true);
            }).on("mouseleave", (e) => {
                down = false;
                canvasSign.val(canvas[0].toDataURL());
                canvas.off("mousemove").off("mouseleave").off("mouseup");
            }).on("mouseup", (e) => {
                down = false;
                canvasSign.val(canvas[0].toDataURL());
                canvas.off("mousemove").off("mouseleave").off("mouseup");
            });
        });
    }
}());
