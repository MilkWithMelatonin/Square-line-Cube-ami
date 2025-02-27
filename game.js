// Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Player Object
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 6,
  dx: 0,
  dy: 0,
  angle: 0, // Player's rotation angle
  lastFootStepTime: 0, // Time of last footstep sound
  gunLength: 20, // Length of the gun
  gunWidth: 5 // Width of the gun
};

// Bullet Object
const bullets = [];
const bulletSpeed = 16;

// Shooting cooldown
let canShoot = true;
const shootCooldown = 250; // 0.25 seconds cooldown in milliseconds
let lastShotTime = 0;
let rightTriggerPressed = false; // To prevent holding right trigger for constant shooting

// Reload System
let isReloading = false;
const reloadCooldown = 2000; // 2 seconds reload time
let lastReloadTime = 0;
let shotsFired = 0; // Track number of shots fired

// Crosshair cursor
document.body.style.cursor = "none";  // Hide the default cursor

// Mouse Position
let mouseX = 0;
let mouseY = 0;

// Camera Shake variables
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let shakeDuration = 0;  // How long the shake lasts
const shakeIntensity = 10; // Intensity of the shake

// Create audio objects for sounds
const shootSound = new Audio('Shot.wav');  // Replace with the correct path to your sound file
const footstepSound = new Audio('Foot.wav'); // Footstep sound (replace with correct path)
const restartSound = new Audio('Restart.wav'); // Restart sound (replace with correct path)
const reloadSound = new Audio('Reload.wav'); // Reload sound (replace with correct path)

// Listen for mouse movement for cursor and to rotate player
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

// Listen for mouse click (left-click to shoot)
document.addEventListener("mousedown", (e) => {
  if (e.button === 0) { // Left-click (button 0)
    const currentTime = Date.now();
    if (canShoot && !isReloading) {
      shoot(currentTime);
    }
  }
});

// Listen for keyboard input (WASD keys)
document.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "ArrowUp") player.dy = -player.speed;
  if (e.key === "s" || e.key === "ArrowDown") player.dy = player.speed;
  if (e.key === "a" || e.key === "ArrowLeft") player.dx = -player.speed;
  if (e.key === "d" || e.key === "ArrowRight") player.dx = player.speed;

  // Reset the game if "P" is pressed (new restart key)
  if (e.key === "p" || e.key === "P") {
    restartGame();
  }

  // Reload on "R" key
  if (e.key === "r" || e.key === "R") {
    reload();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "ArrowUp" || e.key === "s" || e.key === "ArrowDown") player.dy = 0;
  if (e.key === "a" || e.key === "ArrowLeft" || e.key === "d" || e.key === "ArrowRight") player.dx = 0;
});

// Detect gamepad input
function handleGamepadInput() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  if (gamepads[0]) {
    const gamepad = gamepads[0];

    // Left Joystick (Move player)
    player.dx = gamepad.axes[0] * player.speed;
    player.dy = gamepad.axes[1] * player.speed;

    // Right Joystick (Aim player) - If the joystick is moved, update the angle
    if (Math.abs(gamepad.axes[2]) > 0.1 || Math.abs(gamepad.axes[3]) > 0.1) {
      player.angle = Math.atan2(gamepad.axes[3], gamepad.axes[2]);
    }

    // Right Trigger (Shoot)
    if (gamepad.buttons[5].pressed && !rightTriggerPressed && !isReloading) {
      const currentTime = Date.now();
      if (canShoot) {
        shoot(currentTime);
      }
      rightTriggerPressed = true;
    } else if (!gamepad.buttons[5].pressed) {
      rightTriggerPressed = false;
    }

    // X button (Reload)
    if (gamepad.buttons[2].pressed && !isReloading) {
      reload();
    }

    // Y button (Restart Game) - Xbox controllers typically map Y to gamepad.buttons[3]
    if (gamepad.buttons[3].pressed) {
      restartGame();
    }
  }
}

// Function to handle shooting
function shoot(currentTime) {
  const angle = player.angle;

  // Calculate bullet's starting position at the gun barrel
  const gunEndX = player.x + Math.cos(player.angle) * player.gunLength;
  const gunEndY = player.y + Math.sin(player.angle) * player.gunLength;

  const velocityX = Math.cos(angle) * bulletSpeed;
  const velocityY = Math.sin(angle) * bulletSpeed;

  bullets.push({
    x: gunEndX,
    y: gunEndY,
    radius: 5,
    dx: velocityX,
    dy: velocityY
  });

  // Increment shot counter
  shotsFired++;

  // If 15 shots have been fired, disable shooting and wait for reload
  if (shotsFired >= 15) {
    canShoot = false;
    isReloading = true;
    reloadSound.play(); // Play reload sound when reloading
    lastReloadTime = currentTime;
  } else {
    // Start the cooldown
    lastShotTime = currentTime;
    canShoot = false;
  }

  // Trigger camera shake
  shakeDuration = 10;  // Camera shake lasts for 10ms after shooting

  // Play the shoot sound
  shootSound.play();  // Plays the Shot.wav sound
}

// Reload System
function reload() {
  if (isReloading) {
    const currentTime = Date.now();
    if (currentTime - lastReloadTime >= reloadCooldown) {
      isReloading = false;
      shotsFired = 0;  // Reset shot counter after reload
      canShoot = true;  // Allow shooting again
    }
  }
}

// Prevent character from going off-screen
function preventEdgeCollision(character) {
  if (character.x - character.size / 2 < 0) character.x = character.size / 2;
  if (character.x + character.size / 2 > canvas.width) character.x = canvas.width - character.size / 2;
  if (character.y - character.size / 2 < 0) character.y = character.size / 2;
  if (character.y + character.size / 2 > canvas.height) character.y = canvas.height - character.size / 2;
}

// Check for collision with bullets
function checkBulletCollision() {
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];

    // If the bullet is off-screen, remove it
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(i, 1);
      i--;
    }
  }
}

// Update game logic
function update() {
  const currentTime = Date.now();

  // Handle gamepad input for movement, aiming, and shooting
  handleGamepadInput();

  // Move player
  player.x += player.dx;
  player.y += player.dy;

  // Prevent player from going off-screen
  preventEdgeCollision(player);

  // Check for bullet collisions (currently no boss to collide with)
  checkBulletCollision();

  // Check if shooting cooldown has passed
  if (currentTime - lastShotTime >= shootCooldown) {
    canShoot = true;
  }

  // Apply camera shake
  if (shakeDuration > 0) {
    shakeOffsetX = Math.random() * shakeIntensity - shakeIntensity / 2;
    shakeOffsetY = Math.random() * shakeIntensity - shakeIntensity / 2;
    shakeDuration--;  // Decrease the shake duration
  } else {
    shakeOffsetX = 0;
    shakeOffsetY = 0;
  }

  // Play footstep sound every 1 second while walking
  if ((player.dx !== 0 || player.dy !== 0) && currentTime - player.lastFootStepTime > 350) {
    footstepSound.play(); // Plays the footstep sound every second
    player.lastFootStepTime = currentTime; // Update last footstep time
  }

  // Draw everything
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas (white background is default)

  // Apply shake offset to everything
  ctx.save();
  ctx.translate(shakeOffsetX, shakeOffsetY);

  // Draw the player as a blue square (cube)
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = "blue";
  ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);

  // Draw the gun as a small gray rectangle attached to the player
  ctx.fillStyle = "gray";
  ctx.fillRect(player.gunLength - player.gunWidth / 2, -player.gunWidth / 2, player.gunLength, player.gunWidth);
  ctx.restore();

  // Draw crosshair cursor
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.moveTo(mouseX - 10, mouseY);
  ctx.lineTo(mouseX + 10, mouseY);
  ctx.moveTo(mouseX, mouseY - 10);
  ctx.lineTo(mouseX, mouseY + 10);
  ctx.stroke();

  // Move and draw bullets
  for (let i = 0; i < bullets.length; i++) {
    let bullet = bullets[i];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    // Draw the bullet as a gray circle
    ctx.fillStyle = "gray";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Request next frame
  requestAnimationFrame(update);
}

// Restart the game by resetting the state
function restartGame() {
  // Play the restart sound
  restartSound.play();

  // Reset player position and other game states
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.dx = 0;
  player.dy = 0;
  player.angle = 0;
  player.lastFootStepTime = 0;

  // Reset bullets
  bullets.length = 0;

  // Reset shooting cooldown
  canShoot = true;
  shotsFired = 0;
  isReloading = false;
  lastShotTime = 0;

  // Reset camera shake
  shakeOffsetX = 0;
  shakeOffsetY = 0;
  shakeDuration = 0;
}

// Start the game loop
update();
