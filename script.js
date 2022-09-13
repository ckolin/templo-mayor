const dbg = (...objs) => {
    const enabled = location.hash === "#debug";
    if (objs.length > 0) {
        if (enabled) {
            console.log(...objs);
        }
        return objs.length === 1 ? objs[0] : objs;
    } else {
        return enabled;
    }
};

// APOLLO palette by AdamCYounis (https://lospec.com/palette-list/apollo)
const colors = [
    "#172038", "#253a5e", "#3c5e8b", "#4f8fba", "#73bed3", "#a4dddb",
    "#19332d", "#25562e", "#468232", "#75a743", "#a8ca58", "#d0da91",
    "#4d2b32", "#7a4841", "#ad7757", "#c09473", "#d7b594", "#e7d5b3",
    "#341c27", "#602c2c", "#884b2b", "#be772b", "#de9e41", "#e8c170",
    "#241527", "#411d31", "#752438", "#a53030", "#cf573c", "#da863e",
    "#1e1d39", "#402751", "#7a367b", "#a23e8c", "#c65197", "#df84a5",
    "#090a14", "#10141f", "#151d28", "#202e37", "#394a50", "#577277",
    "#819796", "#a8b5b2", "#c7cfcc", "#ebede9"
];

// Text drawing
// Font is m3x6 by Daniel Linssen
const alphabet = "naobpcdresftguhvijkxlyz0123456789: ";
const fontImage = document.getElementById("font");
const drawWord = (word) => {
    let x = 0;
    const w = 3;
    const h = fontImage.naturalHeight;
    word
        .toLowerCase()
        .split("")
        .forEach(c => {
            const i = alphabet.indexOf(c);
            if (i === -1) { // HACK: Enable chaining characters ("N..N" looks like "M" for example)
                x--;
            } else {
                ctx.drawImage(fontImage, i * w, 0, w, h, x, 0, w, h);
                x += w + 1;
            }
        });
};

// Seeded random number generator
const seed = dbg(Date.now());
const seededRandom = s => {
    const random = (from = 0, to = 1) => {
        const value = (2 ** 31 - 1 & (s = Math.imul(48271, s + seed))) / 2 ** 31;
        return from + value * (to - from);
    };

    for (let i = 0; i < 11; i++) {
        random();
    }
    return random;
};

const input = {
    left: false,
    right: false,
    pause: false,
    transition: false, // TODO
    gameover: false
};

// Current level data
let level = {
    day: 1,
    width: 2,
    height: 4,
    wind: 0, // TODO
    age: 0,
    lifetime: 0,
    initialize: true
};

const camera = {
    view: {
        size: 8,
        speed: 1
    },
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
};

const player = {
    player: {
        score: 0,
        lives: 2,
        bounce: 0,
        acceleration: 5,
        maxSpeed: 1
    },
    sprite: {
        imageId: "player",
        animation: {
            frames: 2,
            delay: Infinity,
        }
    },
    age: 0,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    damping: 0.2,
    gravity: 0,
    rotation: 0,
    rotationalVelocity: 0,
    collision: { radius: 0.5 }
};

let entities = [
    camera,
    player
];

const angleDifference = (a, b) => {
    const res = a - b;
    if (res > Math.PI) {
        return res - 2 * Math.PI;
    } else if (res <= -Math.PI) {
        return res + 2 * Math.PI;
    } else {
        return res;
    }
};

let time = performance.now();
const update = () => {
    const newTime = performance.now();
    const deltaMs = newTime - time;
    const delta = deltaMs / 1000;
    time = newTime;

    if (input.pause || input.gameover) {
        return;
    }

    // Populate new level
    if (level.initialize) {
        player.sprite.animation.delay = 500;
        player.age = 0;
        player.gravity = 0.4;
        player.rotation = 0;
        player.rotationalVelocity = 3;
        player.position = { x: 0, y: -0.5 };
        camera.position = { x: 0, y: -2 };

        for (let y = 1; y < level.height; y++) {
            const random = seededRandom(y);

            if (random() < 0.3) {
                entities.push({
                    sprite: { imageId: "bush" },
                    age: 0,
                    position: { x: random(-1, 1) * level.width, y: y + 0.2 },
                    collision: { radius: .3 }
                });
            }
        }

        entities.push({
            sprite: {
                imageId: "goal",
                scale: 3
            },
            position: { x: 0, y: level.height + 1 }
        });

        level.age = 0;
        level.lifetime = Infinity;
        level.initialize = false;
    }

    // Camera
    camera.velocity = Vec.scale(
        Vec.add(
            Vec.scale(player.velocity, 1.5),
            Vec.subtract(player.position, camera.position)
        ),
        camera.view.speed
    );

    // Player steering
    const steering = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (steering === 0) {
        player.velocity.x *= 1 - delta;
    }
    player.velocity.x += steering * player.player.acceleration * delta;
    player.velocity.x = Math.min(player.player.maxSpeed, Math.max(-player.player.maxSpeed, player.velocity.x));

    // Player bounce
    if (player.sprite.animation.delay !== Infinity) {
        player.player.bounce = 1 - Math.abs(Math.sin(time * 0.003));
    } else {
        player.player.bounce = 0;
    }
    for (let i = 1; i < deltaMs * player.player.bounce * 0.2; i++) {
        const direction = Vec.rotate({ x: 0, y: -1 }, (Math.random() - 0.5) * 3);
        entities.push({
            particle: {
                color: colors[Math.floor(Math.random() * 3 + 41)],
                size: Math.random() * 0.1 + 0.05
            },
            age: 0,
            lifetime: Math.random() * 200 + 200,
            position: Vec.add(Vec.add(player.position, { x: 0, y: 0.6 }), Vec.scale(direction, Math.random() * 0.5)),
            velocity: Vec.scale(direction, Math.random() * 1.2 + 0.2),
        });
    }

    // Player collision
    for (let entity of entities.filter(e => e.collision)) {
        const distance = Vec.distance(entity.position, player.position);
        if (distance > entity.collision.radius + player.collision.radius) {
            continue; // Too far away
        }

        if (entity.sprite?.imageId === "bush") {
            zzfx(...[1.55, , 309, , .08, .18, 3, 1.6, -6.7, , , , , .3, , .1, .05, .69, .03]);

            player.player.score = Math.max(0, player.player.score - 10);
            player.velocity = Vec.scale(player.velocity, 0.5);
            entity.sprite = {
                imageId: "bush_dead",
                animation: {
                    frames: 2,
                    delay: 400
                }
            };

            // Spawn particles
            for (let i = 1; i < 64; i++) {
                const direction = Vec.rotate({ x: 0, y: 1 }, Math.random() * 2 * Math.PI);
                entities.push({
                    particle: {
                        color: colors[Math.floor(Math.random() * 3 + 6)],
                        size: Math.random() * 0.1 + 0.1
                    },
                    age: 0,
                    lifetime: Math.random() * 400 + 600,
                    position: Vec.add(entity.position, Vec.scale(direction, Math.random() * 0.3)),
                    velocity: Vec.scale(direction, Math.random() * 1.5 + 0.2),
                    damping: 2,
                    gravity: 0.8
                });
            }
        }
    }

    // Wall collision
    for (let entity of entities.filter(e => e.collision)) {
        if (entity.position.x >= -level.width && entity.position.x <= level.width) {
            continue; // Inside walls
        }

        entity.position.x = Math.min(Math.max(entity.position.x, -level.width), level.width);
        entity.velocity.x = 0;
    }

    // Gravity
    for (let entity of entities.filter(e => e.gravity)) {
        entity.velocity = Vec.add(entity.velocity, Vec.scale({ x: 0, y: 1 }, entity.gravity * delta));
    }

    // Velocity
    for (let entity of entities.filter(e => e.velocity)) {
        entity.position = Vec.add(entity.position, Vec.scale(entity.velocity, delta));
    }

    // Spring
    for (let entity of entities.filter(e => e.spring)) {
        entity.velocity = Vec.add(
            entity.velocity,
            Vec.scale(
                Vec.subtract(entity.spring.origin, entity.position),
                entity.spring.stiffness
            )
        );
    }

    // Rotation
    for (let entity of entities.filter(e => e.rotationalVelocity !== null)) {
        entity.rotation += entity.rotationalVelocity * delta;
        entity.rotation %= 2 * Math.PI;
    }

    // Damping
    for (let entity of entities.filter(e => e.damping)) {
        entity.velocity = Vec.scale(entity.velocity, 1 - entity.damping * delta);
    }
    for (let entity of entities.filter(e => e.rotationalDamping)) {
        entity.rotationalVelocity *= 1 - entity.rotationalDamping * delta;
    }

    // Time score
    if (level.lifetime === Infinity && player.age > 1000) {
        player.player.score = Math.max(0, player.player.score - 1);
        player.age = 0;
    }

    // Level completed
    if (player.position.y > level.height + 0.5 && level.lifetime === Infinity) {
        player.sprite.animation.delay = Infinity;
        player.velocity = { x: 0, y: 0 };
        player.gravity = 0;
        player.rotation = 0.5 * Math.PI;
        player.rotationalVelocity = 0;
        
        player.player.score += 100;
        level.lifetime = level.age + 1000;

        for (let i = 0; i < 64; i++) {
            const direction = Vec.rotate({ x: 0, y: -1 }, (Math.random() - 0.5) * 3);
            entities.push({
                particle: {
                    color: colors[Math.floor(Math.random() * 3 + 41)],
                    size: Math.random() * 0.15 + 0.05
                },
                age: 0,
                lifetime: Math.random() * 400 + 600,
                position: Vec.add(Vec.add(player.position, { x: 0, y: 0.6 }), Vec.scale(direction, Math.random() * 0.5)),
                velocity: Vec.scale(direction, Math.random() * 1.2 + 0.6),
                gravity: 0.8
            });
        }
    }

    // End of level
    level.age += deltaMs;
    if (level.age > level.lifetime) {
        // Prepare next level
        level.day++;
        level.height += 2;
        level.initialize = true;

        // Remove entities
        entities
            .filter(e => e !== player && e !== camera)
            .forEach(e => e.destroy = true);
    }

    // Increase age
    for (let entity of entities.filter(e => e.age != null)) {
        entity.age += deltaMs;
    }

    // Remove entities with no lifetime left
    entities
        .filter(e => e.lifetime && e.age > e.lifetime)
        .forEach(e => e.destroy = true);

    // Remove entities marked to be destroyed
    entities = entities.filter(e => !e.destroy);
};

const draw = () => {
    // Perform physics update
    update();

    // Draw background
    ctx.fillStyle = colors[2];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center around camera
    ctx.save();
    const scale = canvas.width / camera.view.size;
    const halfView = Vec.scale({ x: 1, y: 1 }, -camera.view.size / 2);
    const topLeft = Vec.add(camera.position, halfView);
    const bottomRight = Vec.add(camera.position, Vec.scale(halfView, -1));
    const translate = Vec.floor(Vec.scale(topLeft, -scale));
    ctx.translate(translate.x, translate.y);
    ctx.scale(scale, scale);

    // Draw tiles
    const tileset = document.getElementById("tileset");
    const tileWidth = 16;
    const leftWall = -level.width - 1;
    const rightWall = level.width;
    for (let y = Math.floor(topLeft.y); y <= bottomRight.y; y++) {
        for (let x = Math.floor(topLeft.x); x <= bottomRight.x; x++) {
            const random = seededRandom(y * 1e3 + x);

            let tile = 0;
            if (y === -1) {
                if (x > leftWall && x < rightWall) {
                    tile = 4; // Top steps
                } else if (x === leftWall) {
                    tile = 5; // Top left wall
                } else if (x === rightWall) {
                    tile = 6; // Top right wall
                }
            } else if (y >= 0 && y < level.height) {
                const leftEdge = leftWall - y - 1;
                const rightEdge = rightWall + y + 1;
                if (x > leftWall && x < rightWall) {
                    tile = 2; // Steps
                } else if (x === leftWall) {
                    tile = 1; // Left wall
                } else if (x === rightWall) {
                    tile = 3; // Right wall
                } else if (x > leftEdge && x < rightEdge) {
                    if (y === level.height - 1) {
                        tile = 14; // Bottom background wall
                    } else {
                        tile = 11; // Background wall
                    }
                } else if (x === leftEdge) {
                    tile = 12; // Left edge
                } else if (x === rightEdge) {
                    tile = 13; // Right edge
                }
            } else if (y === level.height) {
                if (x > leftWall && x < rightWall) {
                    tile = 7; // Bottom steps
                } else if (x === leftWall) {
                    tile = 8; // Bottom left wall
                } else if (x === rightWall) {
                    tile = 9; // Bottom right wall
                } else {
                    tile = 10; // Ground
                }
            } else if (y >= level.height) {
                tile = 10; // Ground
            }

            ctx.save();
            ctx.translate(x, y);
            ctx.drawImage(tileset, tile * tileWidth, 0, tileWidth, tileset.naturalHeight, 0, 0, 1, 1);
            ctx.restore();
        }
    }

    // Draw sprites
    for (let entity of [...entities.filter(e => e.sprite && e !== player), player]) {
        ctx.save();
        ctx.translate(entity.position.x, entity.position.y);
        if (entity.player?.bounce) {
            ctx.translate(0, entity.player.bounce * 0.4 - 0.2);
        }
        ctx.rotate(entity.rotation);


        const image = document.getElementById(entity.sprite.imageId);

        let frame = 0;
        let frameWidth = image.naturalWidth;
        if (entity.sprite.animation) {
            frame = Math.floor(entity.age / entity.sprite.animation.delay) % entity.sprite.animation.frames;
            frameWidth = image.naturalWidth / entity.sprite.animation.frames;
        }

        const size = Vec.scale({ x: 1, y: 1 }, entity.sprite.scale ?? 1);
        ctx.translate(-size.x / 2, -size.y / 2); // Center image
        ctx.drawImage(image, frameWidth * frame, 0, frameWidth, image.naturalHeight, 0, 0, size.x, size.y);

        ctx.restore();
    }

    // Draw particles
    for (let entity of entities.filter(e => e.particle)) {
        ctx.save();
        ctx.globalAlpha = 1 - (entity.age / entity.lifetime) ** 4;
        ctx.fillStyle = entity.particle.color;
        const s = entity.particle.size;
        ctx.fillRect(entity.position.x - s / 2, entity.position.y - s / 2, s, s);
        ctx.restore();
    }

    // Debug overlay
    if (dbg()) {
        ctx.save();
        ctx.lineWidth = 0.03;
        ctx.globalAlpha = 0.3;

        // Origin
        for (let entity of entities.filter(e => e.position)) {
            ctx.fillStyle = "#f00";
            ctx.fillRect(entity.position.x, entity.position.y, ctx.lineWidth, ctx.lineWidth);
        }

        // Collision radius
        for (let entity of entities.filter(e => e.collision)) {
            ctx.strokeStyle = "#00f";
            ctx.beginPath();
            ctx.arc(entity.position.x, entity.position.y, entity.collision.radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Velocity vector
        for (let entity of entities.filter(e => e.velocity)) {
            const end = Vec.add(entity.position, entity.velocity);
            ctx.strokeStyle = "#0f0";
            ctx.beginPath();
            ctx.moveTo(entity.position.x, entity.position.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    ctx.restore();

    // Draw hud
    ctx.globalCompositeOperation = "overlay";
    const unit = canvas.width / 48; // Used for ui element sizes
    if (input.gameover) {
        ctx.save();
        ctx.scale(unit, unit);
        ctx.translate(0, 5);
        drawWord("  ...gan..ne over");
        ctx.translate(0, 15)
        drawWord("     ." + "000".concat(player.wallaby.score).substring(player.wallaby.score.toString().length));
        ctx.translate(0, 8);
        ctx.scale(0.5, 0.5);
        drawWord("      joeys rescued");
        ctx.translate(0, 25);
        ctx.globalAlpha = 0.5;
        drawWord("    tap to try again");
        ctx.restore();

        // Restart game
        if (input.action) {
            location.reload();
        }
    } else if (input.transition) {
        // TODO
    } else {
        // Draw day
        ctx.save();
        ctx.translate(canvas.width / 2, 0);
        ctx.scale(unit / 2, unit / 2);
        ctx.translate(-11, 1)
        drawWord("day " + "00".concat(level.day).substring(level.day.toString().length));
        ctx.restore();

        // Draw score
        ctx.save();
        ctx.translate(canvas.width / 3, 0);
        ctx.scale(unit / 4, unit / 4);
        ctx.translate(-13, 1);
        drawWord("score");
        ctx.translate(3, 8)
        drawWord("0000".concat(player.player.score).substring(player.player.score.toString().length));
        ctx.restore();

        // Draw highscore
        const highscore = localStorage.getItem("tm-highscore") ?? 0;
        ctx.save();
        ctx.translate(canvas.width * 2 / 3, 0);
        ctx.scale(unit / 4, unit / 4);
        ctx.translate(-5, 1);
        drawWord("high");
        ctx.translate(0, 8)
        drawWord("0000".concat(highscore).substring(highscore.toString().length));
        ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    requestAnimationFrame(draw);
};

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
});

// Input
window.addEventListener("blur", () => input.pause = true);
window.addEventListener("focus", () => input.pause = false);

canvas.addEventListener("mousedown", () => input.action = true);
canvas.addEventListener("mouseup", () => input.action = false);

canvas.addEventListener("touchstart", () => input.action = true);
canvas.addEventListener("touchend", () => input.action = false);

document.addEventListener("keydown", (e) => {
    if (e.repeat) {
        return;
    }

    if (["a", "ArrowLeft"].includes(e.key)) {
        input.left = true;
    } else if (["d", "ArrowRight"].includes(e.key)) {
        input.right = true;
    }

    if (e.key === "Escape") {
        input.pause = !input.pause;
    } else {
        input.pause = false;
    }
});

document.addEventListener("keyup", (e) => {
    if (e.repeat) {
        return;
    }

    if (["a", "ArrowLeft"].includes(e.key)) {
        input.left = false;
    } else if (["d", "ArrowRight"].includes(e.key)) {
        input.right = false;
    }
});

// Canvas resizing
const resize = () => {
    const unit = 32;
    const size = Math.min(Math.floor(Math.min(window.innerWidth, window.innerHeight) / unit), 24);
    canvas.width = canvas.height = size * unit;
    canvas.style.left = `${(window.innerWidth - canvas.width) / 2}px`;
    canvas.style.top = `${(window.innerHeight - canvas.height) / 2}px`;
    ctx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", resize);

resize();
draw();