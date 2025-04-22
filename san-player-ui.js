const COUNTDOWN_DEFAULT = 6;
const Plugin = videojs.getPlugin('plugin');
const Component = videojs.getComponent('Component');

const dom = videojs.dom || videojs;

class RelatedVideoPlugin extends Plugin {
  constructor(player, options) {
    const defaultOptions = { countdown: COUNTDOWN_DEFAULT };
    super(player, { ...defaultOptions, ...options });

    this.countdown = options.countdown;
    this.countdownRemaining = options.countdown ?? COUNTDOWN_DEFAULT;
    this.nextVideo = null;

    player.on('ended', (e) => {
      console.log('ended', e);
      this.showRelatedVideoCard();
    });

    player.on('loadedmetadata', async (e) => {
      const { sa_category: contentType, wp_post_id: postID } = player.mediainfo.customFields;
      let wpAPIUrl = null;

      if (window.location.hostname.includes('vipdev')) {
        wpAPIUrl = '//' + window.location.hostname + '/wp-json/wp/v2/sa_core_content';
      } else {
        switch (window.location.hostname) {
          case "straightarrownews-develop.go-vip.net":
          case "straightarrownews-preprod.go-vip.net":
          case "san.com":
          case "preview-players.brightcove.net":
              wpAPIUrl = '//' + window.location.hostname + '/wp-json/wp/v2/sa_core_content/';
              break;
          default:
              wpAPIUrl = 'https://san.com/wp-json/wp/v2/sa_core_content/';
        }
      }

      if(wpAPIUrl) {
        try {
          const request = await fetch(`${wpAPIUrl}${postID}`);
          if (!request.ok) throw new Error(`Network response was not ok: ${request.statusText}`);
          const json = await request.json();
          if (json.related_posts?.length > 0) {
            this.nextVideo = json.related_posts[0];
          } else {
            console.warn('No related videos found.');
          }
        } catch (error) {
          console.error("Failed to fetch related videos:", error);
        }
      }
    });
  }

  getRelatedVideo() {
    return this.nextVideo || {};
  }

  resetCountdown() {
    this.countdownRemaining = this.options?.countdown || COUNTDOWN_DEFAULT;
    if(this.countdown) {
      clearInterval(this.countdown);
      this.countdown = null;
    }
  }

  startCountdown() {
    this.resetCountdown();
    this.countdown = setInterval(() => {
      this.countdownRemaining--;
      this.updateCountdownDisplay();
      if (this.countdownRemaining <= 0) {
        this.loadNextVideo();
        this.resetCountdown();
      }
    }, 1000);
  }

  showRelatedVideoCard() {
    if(this.nextVideo) {
      const overlayHTML = dom.createEl('div', {
        className: 'vjs-related-container',
        style: 'flex: 1; background-color: rgba(10, 10, 10, 0.7); width: 100%; height: 100%; position: absolute; top: 0; align-content: center;',
        id: 'next-video-container',
        innerHTML: `
          <div style="margin: 0 auto; max-width: 40em;">
              <h2 style="font-size: 2em; margin: 0; padding-bottom: 0.5em; font-weight: bold;">Up next in <span id="timer">6</span></h2>
              <img id="next-video" src="${this.nextVideo.thumbnail_url.split('?')[0] + '?w=800'}" style="width: 100%; cursor: pointer;" />
              <p style="font-size: 1.2em;">${this.nextVideo.title}</p>
          </div>
        `,
      });
      document.getElementById("san-player").appendChild(overlayHTML);
      this.player.getChild('controlBar').hide();
      if(!this.countdown) {
        let thisRef = this;
        this.startCountdown();
        const nextVideoElement = document.getElementById('next-video');
        const clickHandler = (e) => {
          if(e.target && e.target.id === 'next-video') {
            this.resetCountdown();
            this.loadNextVideo();
            overlayHTML.remove();
            nextVideoElement.removeEventListener('click', clickHandler);
          }
        };
        document.getElementById("san-player").addEventListener('click', clickHandler);

        player.on('dispose', () => {
          nextVideoElement.removeEventListener('click', clickHandler);
        })
      }
    }
  }

  updateCountdownDisplay() {
    document.getElementById("timer").textContent = this.countdownRemaining;
  }

  async loadNextVideo() {
    const { video_id } = this.nextVideo;
    try {
      document.getElementById("next-video-container").remove();
      const video = await this.player.catalog.getVideo(video_id);
      this.player.catalog.load(video);
      await this.player.play();
      this.resetCountdown();
      this.player.getChild('controlBar').show();
    } catch (error) {
      console.error("Error loading video:", error);
    }
  }

  show() {
    super.show();
  }

  hide() {
    super.hide();
  }
}

videojs.registerPlugin('relatedVideoPlugin', RelatedVideoPlugin);

const Button = videojs.getComponent('Button');

class CustomButton extends Button {
  constructor(player, options = {}) {
    const defaultOptions = { controlText: 'Button', title: 'Button', className: '' };
    super(player, { ...defaultOptions, ...options });
    this.controlText(options.controlText, this.createControlTextEl(this.el()));
    this.el().classList.add(options.className);
    this.el().setAttribute('title', options.title);
  }
}

function createPlayerButton(player, options = {}) {
  const { controlText, title, className } = { ...options };
  return new CustomButton(player, {
    controlText: controlText || 'Button',
    title: title || 'Button',
    className: className || '',
  });
}

class SkipBackButton extends CustomButton {
  constructor(player, options = {}) {
    options = {
      controlText: 'Skip backwards',
      title: 'Skip backwards',
    }
    super(player, options);

    this.backward = 10;
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
      title: `Go back a few seconds`,
      'aria-label': `Go back a few seconds`
    });
  }
}

class CcButton extends CustomButton {
  constructor(player, options = {}) {
    options = {
      controlText: 'Toggle captions',
      title: 'Toggle captions',
    }
    super(player, options);
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

class ShareButton extends CustomButton {
  constructor(player, options = {}) {
    options = {
      controlText: 'Share',
      title: 'Share',
    }
    super(player, options);
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

videojs.registerComponent('SkipBackButton', SkipBackButton);
videojs.registerComponent('CcButton', CcButton);
videojs.registerComponent('ShareButton', ShareButton);

function setIcon(element, iconSrc) {
  element.setAttribute('src', iconSrc);
}

function setIconBasedOnState(element, stateKey, isActive) {
  const iconSrc = isActive ? icons[stateKey].active : icons[stateKey].inactive;
  setIcon(element, iconSrc);
}

function handleIconChange(event, icon, iconMappings) {
  if (event) {
    const { state, muted } = iconMappings;
    setIcon(icon, state[event] || muted[event]);
  }
}

function addControlButton(player, buttonName, icon) {
  const button = player.getChild('controlBar').getChild(buttonName);
  button.el().append(icon);
}

function getButtonIcon(name) {

}

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

const icons = {
  play: { active: playSVG, inactive: pauseSVG },
  mute: { active: mutedSVG, inactive: unmutedSVG },
  cc: { active: ccOnSVG, inactive: ccSVG },
  share: { active: shareSVG, inactive: shareSVG },
  fs: { active: fsSVG, inactive: fsSVG },
  back: { active: backSVG, inactive: backSVG },
}

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

progressHandle.appendChild(progressCircle);
controlBar.appendChild(progressHandle);

playBtn.appendChild(playIcon);
audioBtn.appendChild(audioIcon);
fsBtn.appendChild(fsIcon);

videojs('san-player').on('ready', function() {
  const player = this;
  const relatedPlugin = new player.relatedVideoPlugin();
  const playButton = player.controlBar.getChild('playToggle');
  const audioButton = player.controlBar.getChild('volumePanel');

  const buttons = [
    { name: 'SkipBackButton', order: 1 },
    { name: 'ShareButton', order: 13 },
    { name: 'CcButton', order: 14 },
  ];

  const disabledButtons = [
    'SubCapsButton',
    'ChaptersButton',
    'DescriptionsButton',
    'PictureInPictureToggle'
  ];

  buttons.forEach(({ name, order }) => {
    player.getChild('controlBar').addChild(name, {}, order);
    const icon = getButtonIcon(name);
    addControlButton(player, name, icon);
  });

  disabledButtons.forEach((name) => {
    player.getChild('controlBar').removeChild(name);
  });

  const backButton = player.controlBar.getChild('SkipBackButton');
  backButton.el().append(backIcon);

  const ccButton = player.controlBar.getChild('CcButton');
  ccButton.el().append(ccIcon);

  const shareButton = player.controlBar.getChild('ShareButton');
  shareButton.el().append(shareIcon);

  player.on("pause", () => setIconBasedOnState(playIcon, 'play', true));
  player.on("play", () => setIconBasedOnState(playIcon, 'play', false));
  player.on("volumechange", () => setIconBasedOnState(audioIcon, 'mute', player.muted()));

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
        }
        catch (err) {
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