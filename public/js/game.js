'use strict'
const STAGE_HEIGHT = 512,
    STAGE_WIDTH = 512

let renderer = PIXI.autoDetectRenderer(STAGE_HEIGHT, STAGE_WIDTH, {
    resolution: window.devicePixelRatio
})
document.body.appendChild(renderer.view)

function getTextureFromCache(fileName) {
    return PIXI.utils.TextureCache[fileName]
}

function createSpriteFromTexture(texture) {
    return new PIXI.Sprite(texture)
}

function createSpriteFromCache(fileName) {
    return createSpriteFromTexture(getTextureFromCache(fileName))
}

function centerSpriteVertically(sprite, stage) {
    return stage.height / 2 - sprite.height / 2
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEnemies(numberOfEnemies) {
    let spacing = 48,
        xOffset = 150,
        newEnemies = [],
        speed = 2,
        direction = 1

    for (var i = 0; i < numberOfEnemies; i++) {
        let blob = createSpriteFromCache('blob.png')
        blob.position.set(spacing * i + xOffset, getRandomInt(32, STAGE_HEIGHT - blob.height - 32))
        blob.vy = speed * direction
        direction *= -1
        newEnemies.push(blob)
    }

    return newEnemies
}

function getKeyListener(keyCode) {
    var key = {
        code: keyCode,
        isDown: false,
        isUp: true,
        onPress: null,
        onRelease: null,
        downHandler: function(event) {
            if (event.keyCode === key.code) {
                if (key.isUp && key.onPress) key.onPress()
                key.isDown = true
                key.isUp = false
                event.preventDefault()
            }
        },
        upHandler: function(event) {
            if (event.keyCode === key.code) {
                if (key.isDown && key.onRelease) key.onRelease()
                key.isDown = false
                key.isUp = true
                event.preventDefault()
            }
        }
    }

    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    )
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    )
    return key
}

function setDirectionalListener(sprite) {
    let left = getKeyListener(37),
        up = getKeyListener(38),
        right = getKeyListener(39),
        down = getKeyListener(40)

    left.onPress = function () {
        sprite.vx = -5
    }
    left.onRelease = function () {
        if (!right.isDown) {
            sprite.vx = 0
        }
    }

    up.onPress = function() {
        sprite.vy = -5
    }
    up.onRelease = function() {
        if (!down.isDown) {
            sprite.vy = 0
        }
    }

    right.onPress = function() {
        sprite.vx = 5
    }
    right.onRelease = function() {
        if (!left.isDown) {
            sprite.vx = 0
        }
    }

    down.onPress = function() {
        sprite.vy = 5
    }
    down.onRelease = function() {
        if (!up.isDown) {
            sprite.vy = 0
        }
    }
}

function createGameOverScene() {
    let gameOverScene = new PIXI.Container()
    message = new PIXI.Text(
        "You Lose.",
        {font: "64px Futura", fill: "white"}
    )

    message.x = 120
    message.y = STAGE_HEIGHT / 2 - 32

    gameOverScene.addChild(message)

    return gameOverScene
}

function createFirstStageScene() {
    let firstStageScene = new PIXI.Container()
    dungeon = createSpriteFromCache('dungeon.png')
    firstStageScene.addChild(dungeon)

    treasure = createSpriteFromCache('treasure.png')
    treasure.x = firstStageScene.width - treasure.width - 48
    treasure.y = centerSpriteVertically(treasure, firstStageScene)
    firstStageScene.addChild(treasure)

    explorer = createSpriteFromCache('explorer.png')
    explorer.x = explorer.width + 48
    explorer.y = centerSpriteVertically(explorer, firstStageScene)
    explorer.vy = 0
    explorer.vx = 0
    firstStageScene.addChild(explorer)
    setDirectionalListener(explorer)

    door = createSpriteFromCache('door.png')
    door.position.set(32, 0)
    firstStageScene.addChild(door)

    enemies = generateEnemies(6)
    firstStageScene.addChild(...enemies)

    healthBar = getHealthBar()
    firstStageScene.addChild(healthBar)
    return firstStageScene
}

function getHealthBar() {
    let healthBar = new PIXI.DisplayObjectContainer()
    healthBar.position.set(STAGE_WIDTH - 170, 6)

    let innerBar = new PIXI.Graphics()
    innerBar.beginFill(0x000000)
    innerBar.drawRect(0, 0, 128, 8)
    innerBar.endFill()
    healthBar.addChild(innerBar)

    let outerBar = new PIXI.Graphics()
    outerBar.beginFill(0xFF3300)
    outerBar.drawRect(0, 0, 128, 8)
    outerBar.endFill()
    healthBar.addChild(outerBar)

    healthBar.outer = outerBar

    return healthBar
}

let firstStageScene,
    gameOverScene,
    dungeon,
    explorer,
    treasure,
    door,
    healthBar,
    message,
    state,
    stage = new PIXI.Container(),
    explorerHit = false,
    enemies = []

PIXI.loader
    .add('images/treasureHunter.json')
    .load(setup)

function setup() {
    firstStageScene = createFirstStageScene()
    gameOverScene = createGameOverScene()
    gameOverScene.visible = false

    stage.addChild(firstStageScene)
    stage.addChild(gameOverScene)

    state = gameOn

    gameLoop()
}

function gameOver() {
    firstStageScene.visible = false
    gameOverScene.visible = true
}

function gameOn () {
    const mapContainerField = {x: 28, y: 10, width: 488, height: 480}

    explorer.y += explorer.vy
    explorer.x += explorer.vx
    contain(explorer, mapContainerField)

    enemies.forEach(enemy => {
        enemy.y += enemy.vy
        var enemyHitsWall = contain(enemy, {x: 28, y: 10, width: 488, height: 480})

        if (enemyHitsWall === "top" || enemyHitsWall === "bottom") {
            enemy.vy *= -1
        }

        if(hitTestRectangle(explorer, enemy)) {
            explorerHit = true
        }
    })

    if (explorerHit) {
        explorer.alpha = 0.5;
        explorerHit = !explorerHit
        healthBar.outer.width -= 1;
    } else {
        explorer.alpha = 1;
    }

    if (hitTestRectangle(explorer, treasure)) {
        treasure.x = explorer.x + 8
        treasure.y = explorer.y + 8
    }

    if (hitTestRectangle(treasure, door)) {
        state = gameOver
        message.text = "You Win!"
    }

    if (healthBar.outer.width < 0) {
        state = gameOver
        message.text = "You Lose."
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop)

    state()

    renderer.render(stage)
}

function hitTestRectangle(r1, r2) {

    var combinedHalfWidths, combinedHalfHeights, vx, vy

    r1.centerX = r1.x + r1.width / 2
    r1.centerY = r1.y + r1.height / 2
    r2.centerX = r2.x + r2.width / 2
    r2.centerY = r2.y + r2.height / 2

    r1.halfWidth = r1.width / 2
    r1.halfHeight = r1.height / 2
    r2.halfWidth = r2.width / 2
    r2.halfHeight = r2.height / 2

    vx = r1.centerX - r2.centerX
    vy = r1.centerY - r2.centerY

    combinedHalfWidths = r1.halfWidth + r2.halfWidth
    combinedHalfHeights = r1.halfHeight + r2.halfHeight

    return Math.abs(vx) < combinedHalfWidths && Math.abs(vy) < combinedHalfHeights
}

function contain(sprite, container) {
    if (sprite.x < container.x) {
        sprite.x = container.x
        return "left"
    }

    if (sprite.y < container.y) {
        sprite.y = container.y
        return "top"
    }

    if (sprite.x + sprite.width > container.width) {
        sprite.x = container.width - sprite.width
        return "right"
    }

    if (sprite.y + sprite.height > container.height) {
        sprite.y = container.height - sprite.height
        return "bottom"
    }
}
