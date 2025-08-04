module.exports = class SoundSequencer {
    isReady;
    fileNames;
    path;
    extension;
    currentWords;
    currentWord;
    wordIndex;
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
        this.currentWords = [];
        for (let i = 0; i < tokens.length; i++) {
            if (this.fileNames.indexOf(tokens[i]) === -1)
                continue;
            const audio = new Audio(`${this.path}${tokens[i]}.${this.extension}`);
            audio.volume = 0.3;
            this.currentWords.push(audio);
        }

        this.wordIndex = 0;
        const sayCurrentWord = () => {
            if (this.currentWord != null) {
                this.currentWord.removeEventListener("ended", sayCurrentWord);
                this.currentWord.removeEventListener("error", sayCurrentWord);
            }

            if (this.wordIndex >= this.currentWords.length)
                return;
            this.currentWord = this.currentWords[this.wordIndex++];
            this.currentWord.play();
            this.currentWord.addEventListener("ended", sayCurrentWord);
            this.currentWord.addEventListener("error", sayCurrentWord);    
        }

        sayCurrentWord();
    }

    onChatMessage(self, e) {}
}