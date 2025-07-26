module.exports = class OverlaySongPlayer {
    audioContext;
    mediaElement;
    isPlaying;
    constructor(audioContext, mediaElement) {
        this.audioContext = audioContext;
        this.mediaElement = mediaElement;
    }

    playSong(mediaElement, loop = true) {
        if (this.mediaElement != null) {
            this.mediaElement.pause();
            this.mediaElement.currentTime = 0;
        }

        this.mediaElement = mediaElement;
        this.mediaElement.loop = loop;
        this.mediaElement.play();
        this.isPlaying = true;
    }

    stopSong() {
        if (this.mediaElement != null) {
            this.mediaElement.pause();
            this.mediaElement.currentTime = 0;
        }

        this.isPlaying = false;
    }
}