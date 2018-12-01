var numPlayers = 8;

function initPong()
{
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");

    var collisionPointAmount = 14;
    if (numPlayers == 2)
    {
        collisionPointAmount = 20;
    }
    // var paddleWidth = 10;
    // var paddleHeight = 100/(numPlayers/2);
    var paddleWidth = 100/(numPlayers/2);
    
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
        minOffset = -maxOffset -(paddleWidth/1.6);
        // minOffset = -maxOffset
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

    var ballBottomLeftCoords = new Array();
    var ballBottomRightCoords = new Array();
    var ballTopLeftCoords = new Array();
    var ballTopRightCoords = new Array();

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
    var canReflect = true;
    var canCheckOut = true;

    var playerDegrees = new Array();
    var outCoords = new Array();
    var maxX = new Array();
    var maxY = new Array();
    var minX = new Array();
    var minY = new Array();
    for (i = 0; i < numPlayers; i++)
    {
        playerDegrees[i] = (360/numPlayers)*i + 90; 
        console.log(playerDegrees[i]);
        maxX[i] = Math.cos(playerDegrees[i] * Math.PI / 180)*(maxOffset+paddleWidth) + startingXPos[i];
        maxY[i] = Math.sin(playerDegrees[i] * Math.PI / 180)*(maxOffset+paddleWidth) + startingYPos[i];
        minX[i] = Math.cos(playerDegrees[i] * Math.PI / 180)*(minOffset) + startingXPos[i];
        minY[i] = Math.sin(playerDegrees[i] * Math.PI / 180)*(minOffset) + startingYPos[i];
        
        var item = new Array();;
        for (j = 0; j < (collisionPointAmount/2); j++)
        {
            var outCoord = {x: Math.cos(playerDegrees[i] * Math.PI / 180)*(j*(minOffset)/(collisionPointAmount/2)) + startingXPos[i]
                          , y: Math.sin(playerDegrees[i] * Math.PI / 180)*(j*(minOffset)/(collisionPointAmount/2)) + startingYPos[i]};
            item.push(outCoord);
        }
        for (j = 0; j < (collisionPointAmount/2); j++)
        {
            var outCoord = {x: Math.cos(playerDegrees[i] * Math.PI / 180)*(j*(maxOffset+paddleWidth)/(collisionPointAmount/2)) + startingXPos[i]
                          , y: Math.sin(playerDegrees[i] * Math.PI / 180)*(j*(maxOffset+paddleWidth)/(collisionPointAmount/2)) + startingYPos[i]};
            item.push(outCoord);
        }
        outCoords[i] = item;
    }
    var reboundAnglesNeutral = new Array();
    calcRandomAngles();
    function calcRandomAngles()
    {
        for (i = 0; i < numPlayers; i++)
        {
            var reboundAngle;
            if (playerDegrees[i]-90 >= 0 && playerDegrees[i]-90 < 45)
            {
                reboundAngle = {x: -1, y: -getRandom(0,1)};
            }
            if (playerDegrees[i]-90 >= 45 && playerDegrees[i]-90 < 90)
            {
                reboundAngle = {x: -getRandom(0,1), y: -1};
            }
            if (playerDegrees[i]-90 >= 90 && playerDegrees[i]-90 < 135)
            {
                reboundAngle = {x: -getRandom(0,1), y: -1};
            }
            if (playerDegrees[i]-90 >= 135 && playerDegrees[i]-90 < 180)
            {
                reboundAngle = {x: getRandom(0,1), y: -1};
            }
            if (playerDegrees[i]-90 >= 180 && playerDegrees[i]-90 < 225)
            {
                reboundAngle = {x: 1, y: getRandom(0,1)};
            }
            if (playerDegrees[i]-90 >= 225 && playerDegrees[i]-90 < 270)
            {
                reboundAngle = {x: getRandom(0,1), y: 1};
            }
            if (playerDegrees[i]-90 >= 270 && playerDegrees[i]-90 < 315)
            {
                reboundAngle = {x: getRandom(0,1), y: 1};
            }
            if (playerDegrees[i]-90 >= 315)
            {
                reboundAngle = {x: -getRandom(0,1), y: 1};
            }
            reboundAnglesNeutral[i] = reboundAngle;
        }
    }
    

    var lastPaddleContact;
    var lastOutContact;
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
            for (j = 0; j < collisionPointAmount; j++)
            {
                // drawRotatedRect(outCoords[i][j].x, outCoords[i][j].y, 10 ,10, 0, "brown"); // (DRAW OUT COLLISION POINTS)
                if (canCheckOut)
                {
                    if (ballCollidedWithPoint(outCoords[i][j]))
                    {
                        var ballOutDx = dx;
                        var ballOutDy = dy;
                        lastOutContact = i;
                        setTimeout(function() {
                            if (ballOutDx == dx && ballOutDy == dy)
                            {
                                console.log("Player " + lastOutContact + " lost!");
                            }
                        }, 250);
                        outPause();
                    }
                }
            }

            // drawRotatedRect(maxX[i], maxY[i], 10 ,10, 0, "red"); // (DRAW MAX OFFSET POINT)
            // drawRotatedRect(minX[i], minY[i], 10 ,10, 0, "green"); // (DRAW MIN OFFSET POINT)

            // var playerDegrees[i] = 90;
            newX = Math.cos(playerDegrees[i] * Math.PI / 180)*currentOffset + startingXPos[i];
            newY = Math.sin(playerDegrees[i] * Math.PI / 180)*currentOffset + startingYPos[i];
            ctx.beginPath();
            ctx.lineWidth = 10;
            ctx.stroke();
            // drawRotatedRect(currentXPos[i], currentYPos[i], 10 ,10, 0, "purple"); // (DRAW INITIAL PADDLE COLLISION POINT)

            var collisionCoordinates = new Array();
            collisionCoordinates[0] = {x: currentXPos[i], y: currentYPos[i]};
            for (j = 1; j < 6; j++)
            {
                ctx.beginPath();
                var childCollisionCoords = lineToAngle(ctx, newX, newY, j*paddleWidth/5, playerDegrees[i]);
                ctx.lineWidth = 10;
                ctx.stroke();
                //drawRotatedRect(childCollisionCoords.x, childCollisionCoords.y, 10 ,10, 0, "purple"); // (DRAW PADDLE COLLISION POINTS)
                collisionCoordinates[j] = childCollisionCoords;
            }
            for (j = 0; j < 6; j++)
            {
                if (canReflect)
                {
                    if (ballCollidedWithPoint(collisionCoordinates[j]))
                    {
                        lastPaddleContact = i;
                        setTimeout(function() {
                            dx = reboundAnglesNeutral[lastPaddleContact].x;
                            dy = reboundAnglesNeutral[lastPaddleContact].y;
                            calcRandomAngles();
                            console.log("Ball reflected off Player " + lastPaddleContact);
                            console.log(playerDegrees[lastPaddleContact]);
                        }, 20);
                        
                        reflectPause();
                    }
                }
            }

            currentXPos[i] = newX;
            currentYPos[i] = newY;
        }


        drawBall();
        if(Math.abs(x + dx) > canvas.width-300) { 
            dx = -dx;
        }
        if(Math.abs(y + dy) > canvas.height-200) {
            dy = -dy;
        }
        var ballDist = 15;
        ballBottomLeftCoords[0] = x - ballRadius;
        ballBottomLeftCoords[1] = y - ballRadius;
        ballBottomRightCoords[0] = x - ballRadius + ballDist;
        ballBottomRightCoords[1] = y - ballRadius;
        ballTopLeftCoords[0] = x - ballRadius;
        ballTopLeftCoords[1] = y - ballRadius + ballDist;
        ballTopRightCoords[0] = x - ballRadius + ballDist;
        ballTopRightCoords[1] = y - ballRadius + ballDist;
        
        // (DRAW BALL CORNER POINTS)
        // drawRotatedRect(ballBottomLeftCoords[0], ballBottomLeftCoords[1], 2 ,2, 0, "black");
        // drawRotatedRect(ballBottomRightCoords[0], ballBottomRightCoords[1], 2 ,2, 0, "black");
        // drawRotatedRect(ballTopLeftCoords[0], ballTopLeftCoords[1], 2 ,2, 0, "black");
        // drawRotatedRect(ballTopRightCoords[0], ballTopRightCoords[1], 2 ,2, 0, "black");

        x += dx;
        y += dy;
    }
    setInterval(update, 10);

    function ballCollidedWithPoint(point)
    {
        if (ballBottomLeftCoords[0] < point.x && point.x < ballBottomRightCoords[0])
        {
            if (ballBottomLeftCoords[1] < point.y && point.y < ballTopLeftCoords[1])
            {
                return true;
            }
        }
        return false;
    }

    function reflectPause()
    {
        canReflect = false;
        setTimeout(function() {
            canReflect = true;
        }, 250);
    }

    function outPause()
    {
        canCheckOut = false;
        setTimeout(function() {
            canCheckOut = true;
        }, 250);
    }

    function getRandom(min, max) {
        return Math.random();
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