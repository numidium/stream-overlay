const Queue = require('./queue.js')
const { StatusCodes } = require('http-status-codes');
const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
const soundCooldowns = {};
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const alertQueue = new Queue(15);
const token = (new URLSearchParams(document.location.hash.substring(1))).get("access_token");
const eventSocket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
const userId = "66293282"; // numidium3rd
eventSocket.onopen = () => {
    console.log("Socket connected.");
    return false;
};

let cheermotes;
(function requestCheermotes() {
    const req = new XMLHttpRequest();
    req.open("GET", `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${userId}`, true);
    //req.open("GET", `http://localhost:3001/helix/bits/cheermotes?broadcaster_id=${userId}`, true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status >= StatusCodes.OK && req.status < StatusCodes.BAD_REQUEST) {
            cheermotes = JSON.parse(req.response);
        }
    };

    req.send();
})();

eventSocket.onerror = (error) => {
    console.log(`Socket error: ${error}`);
};

const subTypes = {
    follow: "channel.follow",
    subscribe: "channel.subscribe",
    gift: "channel.subscription.gift",
    resub: "channel.subscription.message",
    chatMessage: "channel.chat.message",
    cheer: "channel.cheer",
    raid: "channel.raid",
    pollBegin: "channel.poll.begin",
    pollEnd: "channel.poll.end"
};

let sessionId = null;
eventSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    const payloadEvent = data.payload.event;
    const messageType = data.metadata.message_type;
    if (messageType === "session_welcome") {
        sessionId = data.payload.session.id;
        subscribeToEvent(subTypes.chatMessage);
        subscribeToEvent(subTypes.follow);
        subscribeToEvent(subTypes.subscribe);
        subscribeToEvent(subTypes.gift);
        subscribeToEvent(subTypes.resub);
        subscribeToEvent(subTypes.cheer);
        subscribeToEvent(subTypes.raid);
        subscribeToEvent(subTypes.pollBegin);
        subscribeToEvent(subTypes.pollEnd);
    }
    else if (messageType === "notification") {
        const subType = JSON.parse(e.data).payload.subscription.type;
        if (subType === subTypes.follow) {
            const userName = payloadEvent.user_name;
            alertQueue.enqueue({ alertTitle: `${userName} is now a follower!`, alertMessage: "Greetings!", sound: "follower-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.subscribe) {
            const userName = payloadEvent.user_name;
            const tier = Number(payloadEvent.tier) / 1000;
            alertQueue.enqueue({ alertTitle: `${userName} joined the Mages' Guild!`, alertMessage: tier > 1 ? `Tier ${tier} sub.` : "Welcome!", sound: "spell-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.gift) {
            const userName = getName(payloadEvent);
            const numGifts = payloadEvent.total;
            const tier = Number(payloadEvent.tier) / 1000;
            const tierText = tier > 1 ? `tier ${tier} ` : "";
            alertQueue.enqueue({ alertTitle: `${userName} gifted ${numGifts} ${tierText}subs!`, alertMessage: "Christmas came early!", sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.resub) {
            const userName = payloadEvent.user_name;
            const message = payloadEvent.message.text;
            const cumulativeMonths = Math.floor(payloadEvent.cumulative_months);
            alertQueue.enqueue({ alertTitle: `${userName} has been subbed for ${cumulativeMonths} months total!`, alertMessage: message, sound: "subscriber-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.chatMessage) {
            const userName = payloadEvent.chatter_user_name;
            const message = payloadEvent.message.text;
            handleSoundCommands(message, userName, soundCooldowns);
            // attention horse
            if (payloadEvent.channel_points_custom_reward_id === "66c634dd-ff8a-4193-9f03-16c0cb648c08") {
                alertQueue.enqueue({ alertTitle: `${userName} is an attention horse!`, alertMessage: message, sound: "horse-sound", image: "attention-horse" });
                startAlertAnims(alertQueue);
            }
        }
        else if (subType === subTypes.cheer) {
            let message = payloadEvent.message;
            const cheermoteData = cheermotes.data;
            for (let i = 0; i < cheermoteData.length; i++) {
                if (message.indexOf(cheermoteData[i].prefix) === -1)
                    continue;
                const markup = `<img src='${cheermoteData[i].tiers[0].images.light.animated["4"]}' />`;
                message = message.replaceAll(cheermoteData[i].prefix, markup);
            }

            const userName = getName(payloadEvent);
            const bits = Number(payloadEvent.bits);
            if (bits < 1000)
                alertQueue.enqueue({ alertTitle: `${userName} sent ${bits} bits!`, alertMessage: message, sound: "bits1-sound" });
            else
                alertQueue.enqueue({ alertTitle: `BIG CHEER! ${userName} sent ${bits} bits!!`, alertMessage: message, sound: "bits2-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.raid) {
            const userName = payloadEvent.from_broadcaster_user_name;
            const viewers = payloadEvent.viewers;
            alertQueue.enqueue({ alertTitle: `${userName} raided with ${viewers} viewers!`, alertMessage: "Welcome, raiders!", sound: "raid-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.pollBegin) {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            let choicesText = "";
            for (let i = 0; i < choices.length; i++) {
                choicesText += `* ${choices[i].title}<br />`;
            }

            alertQueue.enqueue({ alertTitle: `Poll started: ${voteQuestion}`, alertMessage: choicesText, sound: "vote-sound" });
            startAlertAnims(alertQueue);
        }
        else if (subType === subTypes.pollEnd && payloadEvent.status === "completed") {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            let choicesMarkup = "";
            let maxVotes = 0;
            let sortedChoices = choices.slice().sort((a, b) => {
                if (maxVotes === 0)
                    if (a.votes > b.votes)
                        maxVotes = a.votes;
                    else
                        maxVotes = b.votes;
                else if (a.votes > maxVotes)
                    maxVotes = a.votes;
                else if (b.votes > maxVotes)
                    maxVotes = b.votes;
                if (a.votes > b.votes)
                    return 1;
                if (a.votes < b.votes)
                    return -1;
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
    const subscription = {
        type: subType,
        version: "1",
        condition: {},
        transport: {
            method: "websocket",
            session_id: sessionId
        }
    };
    
    if (subType === subTypes.follow) {
        subscription.version = "2";
        subscription.condition.moderator_user_id = userId;
    }
    else if (subType === subTypes.chatMessage)
        subscription.condition.user_id = userId;
    if (subType === subTypes.raid)
        subscription.condition.to_broadcaster_user_id = userId;
    else
        subscription.condition.broadcaster_user_id = userId;

    const req = new XMLHttpRequest();
    req.open("POST", "https://api.twitch.tv/helix/eventsub/subscriptions", true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
    };
    
    req.send(JSON.stringify(subscription));
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
            let spamAlerts = [
                { alertTitle: `${userName} is on sound timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Enough!", sound: "enough-sound", image: "enough" },
                { alertTitle: `${userName} is on sound timeout for ${cooldown.time / 1000} seconds.`, alertMessage: "Shut up!", sound: "shutup-sound", image: "shutup" }
            ];

            alertQueue.enqueue(spamAlerts[Math.floor(Math.random() * 2)]);
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
    const stateEnum = {
        initialize: 0,
        fadeIn: 1,
        stay: 2,
        fadeOut: 3,
        end: 4
    };

    if (isAlertAnimRunning)
        return;
    isAlertAnimRunning = true;
    let timeLast = document.timeline.currentTime;
    let state = 0;
    let opacity = 0;
    let stayTime = 0;
    const alertElement = document.getElementById("alert-area");
    const fadeTimeLimit = 2000;
    const stayTimeLimit = 5000;
    function animStep(timeStamp) {
        const timeDelta = timeStamp - timeLast;
        timeLast = timeStamp;
        switch (state) {
            case stateEnum.initialize:
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
            case stateEnum.fadeIn:
                if (opacity < 1) {
                    alertElement.style.opacity = opacity;
                    opacity += timeDelta / fadeTimeLimit;
                }
                else {
                    alertElement.style.opacity = 1;
                    state++;
                }

                break;
            case stateEnum.stay:
                if (stayTime < stayTimeLimit) {
                    stayTime += timeDelta;
                }
                else {
                    stayTime = 0;
                    state++;
                }

                break;
            case stateEnum.fadeOut:
                if (opacity > 0) {
                    alertElement.style.opacity = opacity;
                    opacity -= timeDelta / fadeTimeLimit;
                }
                else {
                    alertElement.style.opacity = 0;
                    state++;
                }

                break;
            case stateEnum.end: // End
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
