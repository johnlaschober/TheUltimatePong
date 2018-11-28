function initPong()
{
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");

    var numPlayers = 8;
    // var paddleWidth = 10;
    // var paddleHeight = 100/(numPlayers/2);
    var paddleWidth = 100/(numPlayers/2);
    var paddleHeight = 10;
    
    var startingXPos = new Array();
    var startingYPos = new Array();
    var currentXPos = new Array();
    var currentYPos = new Array();
    var maxOffset;
    var minOffset;

    var circleRadius = 100;

    ctx.translate(canvas.width/2,canvas.height/2);

    for (i = 0; i < numPlayers; i++)
    {
        startingXPos[i] = circleRadius * Math.cos(2*Math.PI*(i/numPlayers));
        startingYPos[i] = circleRadius * Math.sin(2*Math.PI*(i/numPlayers));

        // Calculate paddle constraints
        maxOffset = 360/Math.pow(numPlayers, 1.2); 
        minOffset = -maxOffset;
    }

    function lineToAngle(ctx, x1, y1, length, angle) {

        angle *= Math.PI / 180;
    
        var x2 = x1 + length * Math.cos(angle),
            y2 = y1 + length * Math.sin(angle);
    
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    
        return {x: x2, y: y2};
    }

    function drawRotatedRect(x, y, width, height, degrees, paddleColor)
    {
        ctx.save();
        ctx.beginPath();
        ctx.translate(x+width/2, y+height/2);
        ctx.rotate(degrees*Math.PI/180);
        ctx.rect(-width/2, -height/2, width, height);
        ctx.fillStyle=paddleColor;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
    
    var ballRadius = 10;
    var x = 0;
    var y = 0;
    var dx = 1;
    var dy = -1;
    function drawBall() {
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI*2);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
    }

    console.log(canvas.width);
    console.log(canvas.height);
    var currentOffset = 0;
    var printed = false;
    function update()
    {
        ctx.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        if (rightPressed && currentOffset <= maxOffset)
        {
            currentOffset += 1;
        }
        else if (leftPressed && currentOffset >= minOffset)
        {
            currentOffset -= 1;
        }
        for (i = 0; i < numPlayers; i++)
        {
            var currentDegrees = (360/numPlayers)*i + 90; 
            // var currentDegrees = 90;
            newX = Math.cos(currentDegrees * Math.PI / 180)*currentOffset + startingXPos[i];
            newY = Math.sin(currentDegrees * Math.PI / 180)*currentOffset + startingYPos[i];
            ctx.beginPath();
            var newCoords = lineToAngle(ctx, newX, newY, paddleWidth, currentDegrees);
            ctx.lineWidth = 10;
            ctx.stroke();
            drawRotatedRect(currentXPos[i], currentYPos[i], 10 ,10, 0, "red");
            drawRotatedRect(newCoords.x, newCoords.y, 10 ,10, 0, "green");

            currentXPos[i] = newX;
            currentYPos[i] = newY;

            var minX;
            var maxX;
            if (currentXPos[i] <= newCoords.x)
            {
                minX = currentXPos[i];
                maxX = newCoords.x;
            }
            else
            {
                minX = newCoords.x;
                maxX = currentXPos[i];
            }
            var minY;
            var maxY;
            if (currentYPos[i] <= newCoords.y)
            {
                minY = currentYPos[i];
                maxY = newCoords.y;
            }
            else
            {
                minY = newCoords.y;
                maxY = currentYPos[i];
            }

            if (x <= maxX && x >= minX && y <= maxY && y >= minY)
            {
                console.log("Hit paddle " + i);
                dy = -dy;
                dx = -dx;
            }
        }


        drawBall();
        if(Math.abs(x + dx) > canvas.width-250) { // Not sure why we need subtractions here...
            dx = -dx;
        }
        if(Math.abs(y + dy) > canvas.height-170) {
            dy = -dy;
        }
        
        x += dx;
        y += dy;
    }
    setInterval(update, 10);

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var rightPressed = false;
    var leftPressed = false;

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);

    function keyDownHandler(e) {
        if(e.keyCode == 39) {
            rightPressed = true;
        }
        else if(e.keyCode == 37) {
            leftPressed = true;
        }
    }
    function keyUpHandler(e) {
        if(e.keyCode == 39) {
            rightPressed = false;
        }
        else if(e.keyCode == 37) {
            leftPressed = false;
        }
    }
}