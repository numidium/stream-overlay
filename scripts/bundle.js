(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Queue = require('./queue.js')
const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const alertQueue = new Queue(10);
const token = (new URLSearchParams(document.location.hash.substring(1))).get("access_token");
const url = `wss://eventsub.wss.twitch.tv/ws`;
const eventSocket = new WebSocket(url);
eventSocket.onopen = () => {
    console.log("Socket connected.");
    return false;
};

eventSocket.onerror = (error) => {
    console.log(`Socket error: ${error}`);
};

const followType = "channel.follow";
const subscribeType = "channel.subscribe";
const resubType = "channel.subscription.message";
const chatMessageType = "channel.chat.message";
const cheerType = "channel.cheer";
let sessionId = null;
eventSocket.onmessage = (e) => {
    let data = JSON.parse(e.data);
    const messageType = data.metadata.message_type;
    if (messageType === "session_welcome") {
        sessionId = data.payload.session.id;
        subscribeToEvent(chatMessageType);
        subscribeToEvent(followType);
        subscribeToEvent(subscribeType);
        subscribeToEvent(resubType);
        subscribeToEvent(cheerType);
    }
    else if (messageType === "notification") {
        const subType = data.payload.subscription.type;
        if (subType === followType) {
            const userName = data.payload.event.user_name;
            alertQueue.enqueue({ alertTitle: `${userName} is now a follower!`, alertMessage: "Greetings!", sound: "follower-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subscribeType) {
            const userName = data.payload.event.tier;
            const tier = Number(data.payload.event.tier) / 1000;
            alertQueue.enqueue({ alertTitle: `${userName} joined the Mages' Guild!`, alertMessage: `Tier ${tier} sub.`, sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === resubType) {
            const userName = data.payload.event.user_name;
            const tier = Number(data.payload.event.tier) / 1000;
            const message = data.payload.event.message.text;
            const cumulativeMonths = Math.floor(data.payload.event.cumulative_months);
            alertQueue.enqueue({ alertTitle: `${userName} has been subscribed at tier ${tier} for ${cumulativeMonths} months!`, alertMessage: message, sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === chatMessageType) {
            const userName = data.payload.event.chatter_user_name;
            const message = data.payload.event.message.text;
            handleSoundCommands(message);
            // attention horse
            if (data.payload.event.channel_points_custom_reward_id === "66c634dd-ff8a-4193-9f03-16c0cb648c08") {
                alertQueue.enqueue({ alertTitle: `${userName} is an attention horse!`, alertMessage: message, sound: "horse-sound", image: "attention-horse" });
                startAlertAnims(alertQueue);
            }
        }
        else if (subType === cheerType) {
            const userName = data.payload.event.is_anonymous ? "Anonymous" : data.payload.event.user_name;
            const message = data.payload.event.message;
            const bits = Number(data.payload.event.bits);
            if (bits < 500)
                alertQueue.enqueue({ alertTitle: `${userName} sent ${bits} bits!`, alertMessage: message, sound: "bits1-sound" });
            else
                alertQueue.enqueue({ alertTitle: `BIG CHEER! ${userName} sent ${bits} bits!!`, alertMessage: message, sound: "bits2-sound" });
            startAlertAnims(alertQueue);
        }
        /*
        // redemptions without messages
        else if (subType === "channel.channel_points_custom_reward_redemption.add") {
            const userName = data.payload.event.chatter_user_name;
            const message = data.payload.event.message.text;
        }
        */
    }

    //console.log(data);
    return false; // don't close connection
};

eventSocket.onclose = (e) => {
    console.log("Socket closed.");
}

function subscribeToEvent(subType) {
    const userId = "66293282"; // numidium3rd
    const subscription = {
        type: subType,
        version: "1",
        condition: {
            broadcaster_user_id: userId
        },
        transport: {
            method: "websocket",
            session_id: sessionId
        }
    };
    
    if (subType === followType) {
        subscription.version = "2";
        subscription.condition.moderator_user_id = userId;
    }
    else if (subType === chatMessageType)
        subscription.condition.user_id = userId;

    var req = new XMLHttpRequest();
    req.open("POST", "https://api.twitch.tv/helix/eventsub/subscriptions", true);
    req.setRequestHeader("Client-ID", "CLIENT_ID");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.send(JSON.stringify(subscription));
    req.onreadystatechange = function () {
    }
}

function playSound(selector) {
    const sound = document.querySelector(selector);
    sound.cloneNode().play();
}

function handleSoundCommands(message) {
    // parse/play sound commands
    let soundCommand = null;
    for (let i = 0; i < soundCommands.length; i++) {
        if (message.toLowerCase().startsWith(soundCommands[i])) {
            soundCommand = soundCommands[i];
            break;
        }
    }
    
    if (soundCommand !== null) {
        const attributeValue = soundCommand.replaceAll("'", "\\'");
        playSound(`audio[command='${attributeValue}']`);
    }
}

let isAlertAnimRunning = false;
function startAlertAnims(queue) {
    if (isAlertAnimRunning)
        return;
    isAlertAnimRunning = true;
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
                const alertImages = document.getElementById("alert-area").querySelectorAll("img");
                for (let i = 0; i < alertImages.length; i++) {
                    alertImages[i].style.display = "none";
                }
                
                if (item.image != null)
                    document.getElementById(item.image).style.display = "inline";
                playSound(`#${item.sound}`);
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

},{"./queue.js":2}],2:[function(require,module,exports){
module.exports = class Queue {
    constructor(size) {
        this.items = new Array(size);
        this.backIndex = 0;
    }

    enqueue(item) {
        if (this.backIndex < this.items.length) {
            this.items[this.backIndex++] = item;
            return true;
        }

        return false;
    }

    dequeue() {
        const item = this.items[0];
        for (let i = 0; i < this.backIndex; i++) {
            this.items[i] = this.items[i + 1];
        }

        if (this.backIndex > 0)
            --this.backIndex;
        delete this.items[this.backIndex];
        return item;
    }

    isEmpty() {
        return this.items[0] === undefined;
    }
}
},{}]},{},[1]);
