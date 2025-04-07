(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Queue = require('./queue.js')
const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
const soundCooldowns = {};
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const alertQueue = new Queue(15);
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
const giftType = "channel.subscription.gift";
const resubType = "channel.subscription.message";
const chatMessageType = "channel.chat.message";
const cheerType = "channel.cheer";
const raidType = "channel.raid";
const pollBeginType = "channel.poll.begin";
const pollEndType = "channel.poll.end";
let sessionId = null;
eventSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const payloadEvent = data.payload.event;
    const messageType = data.metadata.message_type;
    if (messageType === "session_welcome") {
        sessionId = data.payload.session.id;
        subscribeToEvent(chatMessageType);
        subscribeToEvent(followType);
        subscribeToEvent(subscribeType);
        subscribeToEvent(giftType);
        subscribeToEvent(resubType);
        subscribeToEvent(cheerType);
        subscribeToEvent(raidType);
        subscribeToEvent(pollBeginType);
        subscribeToEvent(pollEndType);
    }
    else if (messageType === "notification") {
        const subType = JSON.parse(e.data).payload.subscription.type;
        if (subType === followType) {
            const userName = payloadEvent.user_name;
            alertQueue.enqueue({ alertTitle: `${userName} is now a follower!`, alertMessage: "Greetings!", sound: "follower-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subscribeType) {
            const userName = payloadEvent.user_name;
            const tier = Number(payloadEvent.tier) / 1000;
            alertQueue.enqueue({ alertTitle: `${userName} joined the Mages' Guild!`, alertMessage: `Tier ${tier} sub.`, sound: "spell-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === giftType) {
            const userName = getName(payloadEvent);
            const numGifts = payloadEvent.total;
            const tier = payloadEvent.tier;
            alertQueue.enqueue({ alertTitle: `${userName} gifted ${numGifts} tier ${tier} subs!`, alertMessage: "Thanks!", sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === resubType) {
            const userName = payloadEvent.user_name;
            const message = payloadEvent.message.text;
            const cumulativeMonths = Math.floor(payloadEvent.cumulative_months);
            alertQueue.enqueue({ alertTitle: `${userName} has been subbed for ${cumulativeMonths} months total!`, alertMessage: message, sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === chatMessageType) {
            const userName = payloadEvent.chatter_user_name;
            const message = payloadEvent.message.text;
            handleSoundCommands(message, userName, soundCooldowns);
            // attention horse
            if (payloadEvent.channel_points_custom_reward_id === "66c634dd-ff8a-4193-9f03-16c0cb648c08") {
                alertQueue.enqueue({ alertTitle: `${userName} is an attention horse!`, alertMessage: message, sound: "horse-sound", image: "attention-horse" });
                startAlertAnims(alertQueue);
            }
        }
        else if (subType === cheerType) {
            const userName = getName(payloadEvent);
            const message = payloadEvent.message;
            const bits = Number(payloadEvent.bits);
            if (bits < 500)
                alertQueue.enqueue({ alertTitle: `${userName} sent ${bits} bits!`, alertMessage: message, sound: "bits1-sound" });
            else
                alertQueue.enqueue({ alertTitle: `BIG CHEER! ${userName} sent ${bits} bits!!`, alertMessage: message, sound: "bits2-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === raidType) {
            const userName = payloadEvent.from_broadcaster_user_name;
            const viewers = payloadEvent.viewers;
            alertQueue.enqueue({ alertTitle: `${userName} raided with ${viewers} viewers!`, alertMessage: "Welcome, raiders!", sound: "raid-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === pollBeginType) {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            let choicesText = "";
            for (let i = 0; i < choices.length; i++) {
                choicesText += `* ${choices[i].title}<br />`;
            }

            alertQueue.enqueue({ alertTitle: `Poll started: ${voteQuestion}`, alertMessage: choicesText, sound: "vote-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === pollEndType && payloadEvent.status === "completed") {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            let choicesMarkup = "";
            let maxVotes = 0;
            let sortedChoices = choices.slice().sort((a, b) => {
                if (a.votes > maxVotes)
                    maxVotes = a.votes;
                else if (b.votes > maxVotes)
                    maxVotes = b.votes;
                if (a.votes > b.votes)
                    return 1;
                if (a.votes < b.votes)
                    return -1;
                if (maxVotes === 0 && a.votes > 0 || b.votes > 0)
                    maxVotes = a.votes;
                return 0;
            });

            let tieWays = 1;
            for (let i = sortedChoices.length - 1; i > 0; i--) {
                if (sortedChoices[i].votes === sortedChoices[i - 1].votes && sortedChoices[i].votes === maxVotes) {
                    tieWays++;
                }
            }
            
            const isTied = tieWays > 1;
            const winColor = isTied ? "crimson" : "limegreen";
            const winStyleAttr = ` style="color: ${winColor};"`;
            for (let i = 0; i < choices.length; i++) {
                let choiceAttr = choices[i].votes === maxVotes ? winStyleAttr : "";
                choicesMarkup += `<span${choiceAttr}>* ${choices[i].title} - (${choices[i].votes})</span><br />`;
            }

            let tieText = isTied ? ` (${tieWays}-way tie) ` : "";
            alertQueue.enqueue({ alertTitle: `Poll ended${tieText}: ${voteQuestion}`, alertMessage: choicesMarkup, sound: (isTied ? "vote-fail-sound" : "vote-pass-sound") });
            startAlertAnims(alertQueue);
        }
        /*
        // redemptions without messages
        else if (subType === "channel.channel_points_custom_reward_redemption.add") {
            const userName = payloadEvent.chatter_user_name;
            const message = payloadEvent.message.text;
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
        condition: {},
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
    if (subType === raidType)
        subscription.condition.to_broadcaster_user_id = userId;
    else
        subscription.condition.broadcaster_user_id = userId;

    var req = new XMLHttpRequest();
    req.open("POST", "https://api.twitch.tv/helix/eventsub/subscriptions", true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
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

function handleSoundCommands(message, userName, cooldowns) {
    // parse/play sound commands
    let soundCommand = null;
    for (let i = 0; i < soundCommands.length; i++) {
        if (message.toLowerCase().startsWith(soundCommands[i])) {
            soundCommand = soundCommands[i];
            break;
        }
    }
    
    if (soundCommand !== null) {
        if (cooldowns[userName] == null) {
            cooldowns[userName] = { lastCmdTime: Date.now(), spamCount: 0, time: 0, cooling: false };
        }

        const cooldown = cooldowns[userName];
        const baseCoolDownTime = 60000;
        const spamWindow = 15000;
        const spamThreshold = 5;
        const timeSinceLastCmd = Date.now() - cooldown.lastCmdTime;
        if (timeSinceLastCmd >= baseCoolDownTime)
            cooldown.cooling = false;
        if (cooldown.cooling) {
            return;
        }

        cooldown.spamCount = timeSinceLastCmd <= spamWindow ? cooldown.spamCount + 1 : 1;
        if (cooldown.spamCount >= spamThreshold) {
            cooldown.cooling = true;
            cooldown.time += baseCoolDownTime;
            alertQueue.enqueue({ alertTitle: `${userName} is on sound timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Enough!", sound: "enough-sound", image: "enough" });
            startAlertAnims(alertQueue);
        }
        else {
            const attributeValue = soundCommand.replaceAll("'", "\\'");
            playSound(`audio[command='${attributeValue}']`);
        }

        cooldown.lastCmdTime = Date.now();
    }
}

function getName(event) {
    return event.is_anonymous ? "Anonymous" : event.user_name;
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
                document.getElementById("sub-message").innerHTML = item.alertMessage;
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
