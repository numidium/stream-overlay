const AlertRenderer = require('./alertrenderer.js');
const { StatusCodes } = require('http-status-codes');
const SpecViz = require('./specviz.js');
const OverlaySongPlayer = require('./songplayer.js');

class EventDispatcher {
    subscriptions;
    constructor() {
        this.subscriptions = {};
    }

    subscribe(eventType, obj, handler) {
        if (this.subscriptions[eventType] == null)
            this.subscriptions[eventType] = [];
        const index = this.subscriptions[eventType].length;
        this.subscriptions[eventType][index] = { target: obj, method: handler };
    }

    dispatch(eventType, event) {
        const eventSubscriptions = this.subscriptions[eventType];
        if (eventSubscriptions == null)
            return;
        for (let i = 0; i < eventSubscriptions.length; i++) {
            eventSubscriptions[i].method(eventSubscriptions[i].target, event);
        }
    }
}

class CommandHandler {
    commandLibrary;

    constructor() {
        this.commandLibrary = {};
    }

    registerCommand(commandText, handler) {
        this.commandLibrary[commandText.toUpperCase()] = handler;
    }

    handleChatCommand(userId, text) {
        if (!text.startsWith("!"))
            return;
        const commandKey = text.split(" ")[0].split("!")[1].toUpperCase().replace(/\s/g, "").replace(/[^\x00-\x7F]/g, "");
        if (this.commandLibrary[commandKey] == null)
            return;
        if (userId !== streamerUserId) {
            document.getElementById("dennis").cloneNode().play();
            return;
        }

        const params = text.split(" ").filter(token => token !== "").slice(1);
        this.commandLibrary[commandKey](...params);
    }

    onChatMessage(self, e) {
        self.handleChatCommand(e.chatter_user_id, e.message.text);
    }
}

const audioElements = document.querySelectorAll("audio[command]");
const soundCommands = new Array(audioElements.length);
for (let i = 0; i < audioElements.length; i++) {
    soundCommands[i] = audioElements[i].getAttribute("command");
}

const streamerUserId = "66293282"; // numidium3rd
const token = (new URLSearchParams(document.location.hash.substring(1))).get("access_token");

const queueSize = 15;
const alertRenderer = new AlertRenderer(soundCommands, queueSize);

let cheermotes;
(function requestCheermotes() {
    const req = new XMLHttpRequest();
    req.open("GET", `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${streamerUserId}`, true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status >= StatusCodes.OK && req.status < StatusCodes.BAD_REQUEST) {
            cheermotes = JSON.parse(req.response);
            alertRenderer.cheermoteData = cheermotes;
        }
    };

    req.send();
})();

const overlayAudioContext = new AudioContext();
const canvas = document.getElementById("spectrum-surface");
const drawContext = canvas.getContext("2d");
const overlaySongElement = document.getElementById("song-player-audio");
const songAudioSource = overlayAudioContext.createMediaElementSource(overlaySongElement);
songAudioSource.connect(overlayAudioContext.destination);
const audioVisualizer = new SpecViz(overlayAudioContext, drawContext, 2);
audioVisualizer.connectAudioSource(songAudioSource);
const overlaySongPlayer = new OverlaySongPlayer(overlayAudioContext);

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

const commandHandler = new CommandHandler();
commandHandler.registerCommand("brb", (song) => {
    const brbText = document.getElementById("brb-text");
    if (brbText.style.display !== "block")
        brbText.style.display = "block";
    else
        brbText.style.display = "";
    if (song.toUpperCase() === "SILENT")
        return;
    audioVisualizer.toggleHidden();
    const songElement = document.getElementById("song-player-audio");
    const brbSongs = ["22", "23", "03 Raptor Rap"];
    let songIndex = parseInt(song);
    if (isNaN(songIndex) || songIndex >= brbSongs.length) {
        songIndex = Math.floor(Math.random() * brbSongs.length);
    }

    songElement.src = `./songs/${brbSongs[songIndex]}.mp3`;
    songElement.load();
    if (!overlaySongPlayer.isPlaying)
        overlaySongPlayer.playSong(songElement);
    else
        overlaySongPlayer.stopSong();

    function drawVisualizer(timeStamp) {
        if (!overlaySongPlayer.isPlaying)
            return;
        audioVisualizer.draw();
        requestAnimationFrame(drawVisualizer);
    }

    requestAnimationFrame(drawVisualizer);
});

commandHandler.registerCommand("volume", (percentage) => {
    const songElement = document.getElementById("song-player-audio");
    const value = parseInt(percentage);
    if (isNaN(value))
        return;
    songElement.volume = value / 100;
});

const eventDispatcher = new EventDispatcher();
eventDispatcher.subscribe(subTypes.follow, alertRenderer, alertRenderer.onNewFollower);
eventDispatcher.subscribe(subTypes.subscribe, alertRenderer, alertRenderer.onNewSubscriber);
eventDispatcher.subscribe(subTypes.gift, alertRenderer, alertRenderer.onSubGift);
eventDispatcher.subscribe(subTypes.resub, alertRenderer, alertRenderer.onResub);
eventDispatcher.subscribe(subTypes.chatMessage, alertRenderer, alertRenderer.onChatMessage);
eventDispatcher.subscribe(subTypes.cheer, alertRenderer, alertRenderer.onCheer);
eventDispatcher.subscribe(subTypes.raid, alertRenderer, alertRenderer.onRaid);
eventDispatcher.subscribe(subTypes.pollBegin, alertRenderer, alertRenderer.onPollBegin);
eventDispatcher.subscribe(subTypes.pollEnd, alertRenderer, alertRenderer.onPollEnd);

eventDispatcher.subscribe(subTypes.chatMessage, commandHandler, commandHandler.onChatMessage);

let sessionId = null;
function subscribeToTwitchEvent(subType) {
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
        subscription.condition.moderator_user_id = streamerUserId;
    }
    else if (subType === subTypes.chatMessage)
        subscription.condition.user_id = streamerUserId;
    if (subType === subTypes.raid)
        subscription.condition.to_broadcaster_user_id = streamerUserId;
    else
        subscription.condition.broadcaster_user_id = streamerUserId;

    const req = new XMLHttpRequest();
    req.open("POST", "https://api.twitch.tv/helix/eventsub/subscriptions", true);
    req.setRequestHeader("Client-ID", "dlch9ljsk7ibtvesc4par0knq9gfwz");
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
    };
    
    req.send(JSON.stringify(subscription));
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
    const messageType = data.metadata.message_type;
    if (messageType === "session_welcome") {
        sessionId = data.payload.session.id;
        subscribeToTwitchEvent(subTypes.chatMessage);
        subscribeToTwitchEvent(subTypes.follow);
        subscribeToTwitchEvent(subTypes.subscribe);
        subscribeToTwitchEvent(subTypes.gift);
        subscribeToTwitchEvent(subTypes.resub);
        subscribeToTwitchEvent(subTypes.cheer);
        subscribeToTwitchEvent(subTypes.raid);
        subscribeToTwitchEvent(subTypes.pollBegin);
        subscribeToTwitchEvent(subTypes.pollEnd);
    }
    else if (messageType === "notification") {
        const subType = JSON.parse(e.data).payload.subscription.type;
        const payloadEvent = data.payload.event;
        switch (subType) {
            case subTypes.follow:
            case subTypes.subscribe:
            case subTypes.gift:
            case subTypes.resub:
            case subTypes.chatMessage:
            case subTypes.cheer:
            case subTypes.raid:
            case subTypes.pollBegin:
            case subTypes.pollEnd:
                eventDispatcher.dispatch(subType, payloadEvent);
            default:
                break;
        }
    }

    //console.log(data);
    return false; // don't close connection
};

eventSocket.onclose = (e) => {
    console.log("Socket closed.");
}
