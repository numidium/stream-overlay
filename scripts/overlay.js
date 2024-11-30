const tmi = require("tmi.js");
const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const client = new tmi.Client({
	channels: ["numidium3rd"]
});

const alertQueue = new Queue(10);
client.connect();
client.on("message", (channel, tags, message, self) => {
    let command = null;
    for (let i = 0; i < soundCommands.length; i++) {
        if (message.toLowerCase().startsWith(soundCommands[i])) {
            command = soundCommands[i];
            break;
        }
    }
    
    if (command !== null) {
        const attributeValue = command.replaceAll("'", "\\'");
        playSound(`audio[command='${attributeValue}']`);
    }
});

client.on("raided", (channel, username, viewers) => {
    alertQueue.enqueue({ alertTitle: `${username} has raided with ${viewers} viewers!`, alertMessage: message, sound: "raid-sound" });
    startAlertAnims(alertQueue, sound);
});

client.on("subscription", (channel, username, method, message, userstate) => {
    alertQueue.enqueue({ alertTitle: `${username} joined the Mages' Guild!`, alertMessage: message, sound: "subscriber-sound" });
    startAlertAnims(alertQueue, sound);
});

client.on("resub", (channel, username, months, message, userstate, methods) => {
    const cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
    alertQueue.enqueue({ alertTitle: `${username} has been subscribed for ${cumulativeMonths} months!`, alertMessage: message, sound: "subscriber-sound" });
    startAlertAnims(alertQueue, sound);
});

client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
    // Do your stuff.
    let senderCount = ~~userstate["msg-param-sender-count"];
});

client.on("cheer", (channel, userstate, message) => {
    alertQueue.enqueue({ alertTitle: `${userstate["display-name"]} sent ${userstate.bits} bits!`, alertMessage: message, sound: "bits1-sound" });
    startAlertAnims(alertQueue, sound);
});

function playSound(id) {
    const sound = document.getElementById(id);
    sound.currentTime = 0;
    sound.play();
}

let isAlertAnimRunning = false;
function startAlertAnims(queue) {
    if (isAlertAnimRunning)
        return;
    const fadeTimeLimit = 2000;
    const stayTimeLimit = 5000;
    let alertElement = document.getElementById("alert-area");
    let timeLast = document.timeline.currentTime;
    let opacity = 0;
    let state = 0;
    let stayTime = 0;
    function animStep(timeStamp) {
        const timeDelta = timeStamp - timeLast;
        timeLast = timeStamp;
        switch (state) {
            case 0: // Initialize
                let item = queue.dequeue();
                document.getElementById("sub-title").textContent = item.alertTitle;
                document.getElementById("sub-message").textContent = item.alertMessage;
                playSound(item.sound);
                state++;
                break;
            case 1: // Fade In
                if (opacity < 1) {
                    alertElement.style.opacity = opacity;
                    opacity += timeDelta / fadeTimeLimit;
                }
                else {
                    alertElement.style.opacity = 1;
                    state++;
                }

                break;
            case 2: // Stay
                if (stayTime < stayTimeLimit) {
                    stayTime += timeDelta;
                }
                else {
                    stayTime = 0;
                    state++;
                }

                break;
            case 3: // Fade Out
                if (opacity > 0) {
                    alertElement.style.opacity = opacity;
                    opacity -= timeDelta / fadeTimeLimit;
                }
                else {
                    alertElement.style.opacity = 0;
                    state++;
                }

                break;
            case 4: // End
                if (queue.isEmpty()) {
                    isAlertAnimRunning = false;
                    return;
                }
                else {
                    state = 0;
                }

                break;
            default:
                break;
        }

        requestAnimationFrame(animStep);
    }

    requestAnimationFrame(animStep);
}
