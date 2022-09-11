const dbg = (...objs) => {
    const enabled = location.hash === "#debug";
    if (objs.length > 0) {
        if (enabled) {
            console.log(objs);
        }
        return objs;
    } else {
        return enabled;
    }
};

const input = {
    left: false,
    right: false,
    pause: false,
    gameOver: false
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
const seed = Date.now();
const seededRandom = s => {
    const random = () => (2 ** 31 - 1 & (s = Math.imul(48271, s + seed))) / 2 ** 31;
    for (let i = 0; i < 10; i++) {
        random();
    }
    return random;
};

// Current level data
let level = {
    size: 12,
    floorWidth: 6,
    populated: false,
    wind: 0 // TODO
};

const camera = {
    view: {
        size: 10,
        speed: 1
    },
    keep: true,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 }
};

const player = {
    sprite: {
        imageId: "player_falling",
        scale: 1,
        animation: {
            frames: 2,
            delay: 500,
        }
    },
    player: {
        score: 0,
        lives: 2,
        bounce: 0
    },
    keep: true,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 2 },
    damping: 0,
    rotation: 0,
    rotationalVelocity: 3,
    collision: {
        radius: .5,
        attach: true
    }
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

    if (input.pause || input.gameOver) {
        return;
    }
    
    // Populate new level
    if (!level.populated) {
        for (let y = 0; y < level.size; y++) {
            const random = seededRandom(y);

            if (random() < 0.3) {
                entities.push({
                    sprite: {
                        imageId: "bush",
                        scale: 1
                    },
                    position: { x: (random() - 0.5) * (level.floorWidth - 2), y: y - 0.3 },
                    collision: {
                        radius: .5,
                        attach: true
                    }
                });
            }
        }
    }

    // Camera
    camera.velocity = Vec.scale(
        Vec.add(
            Vec.scale(player.velocity, 1.5),
            Vec.subtract(player.position, camera.position)
        ),
        camera.view.speed
    );

    // Player movement
    if (!player.attachedTo) {
        if (input.left || input.right) {

        }

        // Bounce
        player.player.bounce = 1 - Math.abs(Math.sin(time * 0.003));

        // Spawn particles
        for (let i = 1; i < deltaMs * player.player.bounce * 0.2; i++) {
            const direction = Vec.rotate({ x: 0, y: -1 }, (Math.random() - 0.5) * 3);
            entities.push({
                particle: {
                    color: colors[Math.floor(Math.random() * 3 + 14)],
                    size: Math.random() * 0.1 + 0.1
                },
                age: 0,
                lifetime: Math.random() * 300 + 200,
                position: Vec.add(player.position, Vec.scale(direction, Math.random() * 0.5)),
                velocity: Vec.scale(direction, Math.random() * 1.2 + 0.2),
                collision: {
                    radius: 1,
                    attach: false
                }
            });
        }
    }

    // Player collision
    for (let entity of entities.filter(e => e.collision)) {
        const distance = Vec.distance(entity.position, player.position);
        if (distance > entity.collision.radius + player.collision.radius) {
            continue; // Too far away
        }

        if (entity.sprite?.imageId === "bush") {
            zzfx(...[1.55, , 309, , .08, .18, 3, 1.6, -6.7, , , , , .3, , .1, .05, .69, .03]);

            player.velocity = Vec.scale(player.velocity, 0.8);
            entity.sprite.imageId = "bush_dead";

            // Spawn particles
            for (let i = 1; i < 50; i++) {
                const direction = Vec.rotate({ x: 0, y: 1 }, Math.random() * 2 * Math.PI);
                entities.push({
                    particle: {
                        color: colors[Math.floor(Math.random() * 3 + 6)],
                        size: Math.random() * 0.1 + 0.1
                    },
                    age: 0,
                    lifetime: Math.random() * 400 + 600,
                    position: Vec.add(entity.position, Vec.scale(direction, Math.random() * 0.5)),
                    velocity: Vec.scale(direction, Math.random() * 1.5 + 0.2),
                    damping: 2,
                    gravity: 1,
                    collision: {
                        radius: 1,
                        attach: false
                    }
                });
            }
        }
    }

    // Gravity
    for (let entity of entities.filter(e => e.gravity)) {
        entity.velocity = Vec.add(entity.velocity, Vec.scale({ x: 0, y: 1 }, entity.gravity * delta));
    }

    // Velocity
    for (let entity of entities.filter(e => e.velocity)) {
        if (entity.attachedTo) {
            entity.position = Vec.add(entity.position, Vec.scale(entity.attachedTo.velocity, delta));
        } else {
            entity.position = Vec.add(entity.position, Vec.scale(entity.velocity, delta));
        }
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
        if (entity.attachedTo) {
            const rotation = entity.attachedTo.rotationalVelocity * delta;
            const offset = Vec.rotate(
                Vec.subtract(entity.position, entity.attachedTo.position),
                rotation
            );
            entity.position = Vec.add(entity.attachedTo.position, offset);
            entity.rotation += rotation;
        } else {
            entity.rotation += entity.rotationalVelocity * delta;
        }
        entity.rotation %= 2 * Math.PI;
    }

    // Damping
    for (let entity of entities.filter(e => e.damping)) {
        entity.velocity = Vec.scale(entity.velocity, 1 - entity.damping * delta);
    }
    for (let entity of entities.filter(e => e.rotationalDamping)) {
        entity.rotationalVelocity *= 1 - entity.rotationalDamping * delta;
    }

    // Increase age
    for (let entity of entities.filter(e => e.age != null)) {
        entity.age += deltaMs;
    }

    // Game over
    if (player.player.lives <= 0) {
        input.gameOver = true;
        for (let entity of entities.filter(e => !e.star && e !== camera)) {
            entity.destroy = true;
        }
    }

    // Remove entities with no lifetime left
    entities
        .filter(e => e.lifetime && e.age > e.lifetime)
        .forEach(e => e.destroy = true);

    // Remove entities marked to be destroyed
    entities = entities.filter(e => !e.destroy);

    // Remove attachments to destroyed entities
    for (let entity of entities.filter(e => e.attachedTo?.destroy)) {
        entity.attachedTo = null;
    }
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
    ctx.scale(scale, scale);
    const topLeft = Vec.add(camera.position, Vec.scale({ x: 1, y: 1 }, -camera.view.size / 2));
    ctx.translate(-topLeft.x, -topLeft.y);

    // Draw floors
    for (let y = 0; y < level.size; y++) {
        const random = seededRandom(y);
        for (let x = 0; x < level.floorWidth; x++) {
            let type = "steps";
            let flip = random() > 0.5;
            if (x === 0 || x === level.floorWidth - 1) {
                type = "wall";
                flip = x !== 0;
            }

            const imageId = `${type}${Math.round(random())}`;
            const image = document.getElementById(imageId);

            ctx.save();
            ctx.translate(x - level.floorWidth / 2, y);
            ctx.scale(flip ? -1 : 1, 1);
            ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, flip ? -1 : 1, 1);
            ctx.restore();
        }
    }

    // Draw sprites
    for (let entity of entities.filter(e => e.sprite)) {
        ctx.save();
        ctx.translate(entity.position.x, entity.position.y);
        if (entity.player?.bounce) {
            ctx.translate(0, entity.player.bounce * 0.3);
        }
        ctx.rotate(entity.rotation);


        const image = document.getElementById(entity.sprite.imageId);

        let frame = 0;
        let frameWidth = image.naturalWidth;
        if (entity.sprite.animation) {
            frame = Math.floor(time / entity.sprite.animation.delay) % entity.sprite.animation.frames;
            frameWidth = image.naturalWidth / entity.sprite.animation.frames;
        }

        const size = Vec.scale({ x: 1, y: 1 }, entity.sprite.scale);
        ctx.translate(-size.x / 2, -size.y / 2); // Center image
        ctx.drawImage(image, frameWidth * frame, 0, frameWidth, image.naturalHeight, 0, 0, size.x, size.y);

        ctx.restore();
    }

    // Draw particles
    for (let entity of entities.filter(e => e.particle)) {
        ctx.save();
        //ctx.globalAlpha = 1 - entity.age / entity.lifetime;
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
    ctx.fillStyle = colors[0];
    const unit = canvas.width / 48; // Used for ui element sizes

    if (input.gameOver) {
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
    } else {
        // Draw arrow in direction of joeys
        for (let entity of entities.filter(e => e.sprite?.imageId === "joey")) {
            const between = Vec.subtract(entity.position, camera.position);
            const distance = Vec.length(between);
            const scale = 40 / distance + 1;

            ctx.save();

            ctx.globalAlpha = Math.max(0, Math.min(1, (distance - 60) / 10));
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Vec.angle(between));
            ctx.translate(10 * unit, 0);
            ctx.scale(scale, scale);

            ctx.beginPath();
            ctx.moveTo(0, -unit);
            ctx.lineTo(unit, 0);
            ctx.lineTo(0, unit);
            ctx.fill();

            ctx.restore();
        }

        // Draw score
        ctx.save();
        ctx.translate(0, canvas.height);
        ctx.scale(unit / 4, unit / 4);
        ctx.translate(2, -8)
        drawWord("000".concat(player.player.score).substring(player.player.score.toString().length));
        ctx.restore();
    }

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

    if (e.key === " ") {
        input.action = true;
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

    if (e.key === " ") {
        input.action = false;
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