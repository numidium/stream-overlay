export default class SoundSequencer {
    isReady;
    fileNames;
    path;
    extension;
    wordIndex;
    currentSound;
    static startDelay = 1000;
    constructor(soundSet, extension) {
        this.isReady = false;
        fetch(`./${soundSet}.json`)
            .then((response) => response.json())
            .then((json) => { this.fileNames = json; this.isReady = true; });
        this.path = `./sounds/${soundSet}/`;
        this.extension = extension;
        this.wordIndex = 0;
    }

    startSpeaking(text) {
        if (!this.isReady)
            return;
        const tokens = text.toLowerCase().split(/\s+/);
        const wordSounds = [];
        for (let i = 0; i < tokens.length; i++) {
            if (this.fileNames.indexOf(tokens[i]) === -1)
                continue;
            const audio = new Audio(`${this.path}${tokens[i]}.${this.extension}`);
            audio.volume = 0.2;
            wordSounds.push(audio);
        }

        if (wordSounds.length === 0)
            return;
        const self = this;
        setTimeout(() => {
            for (let i = 0; i < wordSounds.length - 1; i++) {
                wordSounds[i].addEventListener("ended", function (e) {
                    self.currentSound = wordSounds[i + 1];
                    self.currentSound.play();
                }, { once: true });
            }

            wordSounds[0].play();
        }, SoundSequencer.startDelay);
    }

    onVoiceStop(self, e) {
        if (!self.currentSound)
            return;
        self.currentSound.pause();
    }

    onChatMessage(self, e) {}
}