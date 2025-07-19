const AlertRenderer = require('./alertrenderer.js')
const { StatusCodes } = require('http-status-codes');

const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const userId = "66293282"; // numidium3rd
const token = (new URLSearchParams(document.location.hash.substring(1))).get("access_token");
let cheermotes;
(function requestCheermotes() {
    const req = new XMLHttpRequest();
    req.open("GET", `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${userId}`, true);
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

const queueSize = 15;
const alertRenderer = new AlertRenderer(soundCommands, queueSize);
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

function getName(event) {
    return event.is_anonymous ? "Anonymous" : event.user_name;
}

const eventSocket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
eventSocket.onopen = () => {
    console.log("Socket connected.");
    return false;
};

eventSocket.onerror = (error) => {
    console.log(`Socket error: ${error}`);
};

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
            alertRenderer.enqueueNewFollower(payloadEvent.user_name);
        }
        else if (subType === subTypes.subscribe) {
            alertRenderer.enqueueNewSubscriber(payloadEvent.user_name, Number(payloadEvent.tier) / 1000);
        }
        else if (subType === subTypes.gift) {
            const userName = getName(payloadEvent);
            const numGifts = payloadEvent.total;
            const tier = Number(payloadEvent.tier) / 1000;
            const tierText = tier > 1 ? `tier ${tier} ` : "";
            alertRenderer.enqueueSubGift(userName, numGifts, tierText);
        }
        else if (subType === subTypes.resub) {
            const message = payloadEvent.message.text;
            const cumulativeMonths = Math.floor(payloadEvent.cumulative_months);
            alertRenderer.enqueueResubMessage(payloadEvent.user_name, cumulativeMonths, message)
        }
        else if (subType === subTypes.chatMessage) {
            const userName = payloadEvent.chatter_user_name;
            const message = payloadEvent.message.text;
            const rewardId = payloadEvent.channel_points_custom_reward_id;
            alertRenderer.enqueueChatMessage(message, userName, rewardId);
        }
        else if (subType === subTypes.cheer) {
            let message = payloadEvent.message;
            const cheermoteData = cheermotes.data;
            const userName = getName(payloadEvent);
            const bits = Number(payloadEvent.bits);
            alertRenderer.enqueueCheer(message, cheermoteData, userName, bits);
        }
        else if (subType === subTypes.raid) {
            const userName = payloadEvent.from_broadcaster_user_name;
            const viewers = payloadEvent.viewers;
            alertRenderer.enqueueRaid(userName, viewers);
        }
        else if (subType === subTypes.pollBegin) {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            alertRenderer.enqueuePollStart(voteQuestion, choices);
        }
        else if (subType === subTypes.pollEnd && payloadEvent.status === "completed") {
            const voteQuestion = payloadEvent.title;
            const choices = payloadEvent.choices;
            alertRenderer.enqueuePollEnd(voteQuestion, choices);
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
