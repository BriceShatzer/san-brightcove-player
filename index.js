const Button = videojs.getComponent('Button');

class SkipBackButton extends Button {
    constructor(player, options = {}) {
      super(player, options);

      const controlText = this.createControlTextEl(this.el());
      this.controlText('Skip backwards', controlText);

      this.backward = options.backward || 10;
    }
    
    handleClick() {
      let player = this.player();

      if(player) {
        if( player.currentTime() - this.backward > 0) {
          player.currentTime( player.currentTime() - this.backward );
        } else {
          player.currentTime(0);
        }
      }
    }

    createEl() {
      return videojs.dom.createEl('button', {
        className: 'vjs-back-control vjs-control vjs-button',
        type: 'button',
        title: `Go back a few seconds`
      });
    }
}

class CcButton extends Button {
    constructor(player, options = {}) {
      super(player, options);

      const controlText = this.createControlTextEl(this.el());
      this.controlText('Toggle captions', controlText);
    }
    
    handleClick() {
      let player = this.player();

      if(player) {
        player.trigger('captions');
      }
    }

    createEl() {
      return videojs.dom.createEl('button', {
        className: 'vjs-cc-control vjs-control vjs-button',
        type: 'button',
        title: `Toggle captions`
      });
    }
}

class ShareButton extends Button {
    constructor(player, options = {}) {
      super(player, options);

      const controlText = this.createControlTextEl(this.el());
      this.controlText('Share', controlText);
    }
    
    handleClick() {
      let player = this.player();

      if(player) {
        player.trigger('share');
      }
    }

    createEl() {
      return videojs.dom.createEl('button', {
        className: 'vjs-san-share-control vjs-control vjs-button',
        type: 'button',
        title: `Share`
      });
    }
}

videojs.registerPlugin('playerUI', function() {
    videojs.registerComponent('SkipBackButton', SkipBackButton);
    videojs.registerComponent('CcButton', CcButton);
    videojs.registerComponent('ShareButton', ShareButton);

    const playerEl = document.getElementsByClassName('video-js')[0];
    playerEl.setAttribute('id', 'san-player');

    const playSVG = 'https://cdn.saim.io/assets/player/play-icon.svg';
    const pauseSVG = 'https://cdn.saim.io/assets/player/pause-icon.svg';
    const backSVG = 'https://cdn.saim.io/assets/player/back-icon.svg';
    const unmutedSVG = 'https://cdn.saim.io/assets/player/audio-icon.svg';
    const mutedSVG = 'https://cdn.saim.io/assets/player/mute-icon.svg';
    const shareSVG = 'https://cdn.saim.io/assets/player/share-icon.svg';
    const ccSVG = 'https://cdn.saim.io/assets/player/cc-icon.svg';
    const ccOnSVG = 'https://cdn.saim.io/assets/player/cc-icon-on.svg';
    const fsSVG = 'https://cdn.saim.io/assets/player/fs-icon.svg';

    const playBtn = document.getElementsByClassName('vjs-play-control')[0];
    const controlBar = document.getElementsByClassName('vjs-play-progress')[0];
    const audioBtn = document.getElementsByClassName('vjs-mute-control')[0];
    const fsBtn = document.getElementsByClassName('vjs-fullscreen-control')[0];

    const progressHandle = document.createElement('span');
    const progressCircle = document.createElement('span');

    const playIcon = document.createElement('img');
    const backIcon = document.createElement('img');
    const audioIcon = document.createElement('img');
    const muteIcon = document.createElement('img');
    const shareIcon = document.createElement('img');
    const ccIcon = document.createElement('img');
    const fsIcon = document.createElement('img');

    playIcon.setAttribute('src', playSVG);
    backIcon.setAttribute('src', backSVG);
    audioIcon.setAttribute('src', unmutedSVG);
    muteIcon.setAttribute('src', mutedSVG);
    shareIcon.setAttribute('src', shareSVG);
    ccIcon.setAttribute('src', ccSVG);
    fsIcon.setAttribute('src', fsSVG);

    progressHandle.setAttribute('class', 'handle');
    progressCircle.setAttribute('class', 'circle');

    if(progressHandle && progressCircle) {
        progressHandle.appendChild(progressCircle);
    }
    if(controlBar && progressHandle) {
        controlBar.appendChild(progressHandle);
    }
    if(playBtn && playIcon) {
        playBtn.appendChild(playIcon);
    }
    if(audioBtn && audioIcon) {
        audioBtn.appendChild(audioIcon);
    }
    if(fsBtn && fsIcon) {
        fsBtn.appendChild(fsIcon);
    }

    videojs('san-player').on('ready', function() {
        const player = this;
        player.relatedVideoPlugin();

        player.getChild('controlBar').addChild('SkipBackButton', {}, 1);
        player.getChild('controlBar').addChild('ShareButton', {}, 13);
        player.getChild('controlBar').addChild('CcButton', {}, 14);
        player.getChild('controlBar').removeChild('SubsCapsButton');
        player.getChild('controlBar').removeChild('ChaptersButton');
        player.getChild('controlBar').removeChild('DescriptionsButton');
        player.getChild('controlBar').removeChild('PictureInPictureToggle');

        var backButton = player.controlBar.getChild('SkipBackButton');
        backButton.el().append(backIcon);

        const ccButton = player.controlBar.getChild('CcButton');
        ccButton.el().append(ccIcon);

        const shareButton = player.controlBar.getChild('ShareButton');
        shareButton.el().append(shareIcon);

        player.on("pause", function() {
          playIcon.setAttribute('src', playSVG);
        });
        
        player.on("play", function() {
          playIcon.setAttribute('src', pauseSVG);
        });

        player.on("volumechange", function() {
        if(player.muted() || player.volume() === 0) {
          audioIcon.setAttribute('src', mutedSVG);
        } else {
          audioIcon.setAttribute('src', unmutedSVG);
        }
        });

        player.on("captions", function() {
          const tracks = player.textTracks();
          for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (track.label === 'en-US') {
              if (track.mode !== 'showing') {
                track.mode = 'showing';
                ccIcon.setAttribute('src', ccOnSVG);
              } else {
                track.mode = 'disabled';
                ccIcon.setAttribute('src', ccSVG);
              }
            }
          }
        });

        player.on("share", function() {
          player.socialOverlay.show();
          const labelEl = document.getElementsByClassName('vjs-social-label-text')[0];
          labelEl.innerHTML = 'URL <a id="copy-share-link" href="#copy-share-link">COPY</a>';
          document.getElementById("copy-share-link").onclick = function () {
            var shareLinkEl = document.getElementsByClassName('vjs-social-direct-link')[0];
            var input = shareLinkEl.getElementsByTagName('input')[0];
            var text = input.value;
            input.focus();
            input.select();
            try {
              navigator.clipboard.writeText(text).then(function () {
                console.log('Share link copied to clipboard');
              });
            } catch (err) {
              console.log('Error writing content to clipboard', err);
            }
          };
        });

        if(player.muted()) {
          audioIcon.setAttribute('src', mutedSVG);
        } else {
          audioIcon.setAttribute('src', unmutedSVG);
        }
    });

    videojs.getPlayer('san-player').on('loadedmetadata', function() {
        const player = this;
    });
});