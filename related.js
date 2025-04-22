const COUNTDOWN_DEFAULT = 6;
    const Plugin = videojs.getPlugin('plugin');
    const Component = videojs.getComponent('Component');

    const dom = videojs.dom || videojs;

    class HTMLOverlay extends Component {
      constructor(player, options) {
        super(player, options);

        if(options.html) {
          this.html = options.html;
        }
      }

      createEl() {
        const container = dom.createEl('div', {
          className: `
            san-vjs-overlay
          `
        });
      }
    }

    videojs.registerComponent('HTMLOverlay', HTMLOverlay);

    class RelatedVideoPlugin extends Plugin {
      constructor(player, options) {
        super(player, options);

        this.countdown = null;
        this.nextVideo = null;
        this.countdownRemaining = COUNTDOWN_DEFAULT;

        player.on('ended', () => {
            this.showRelatedVideoOverlay();
        });
        player.on('loadedmetadata', () => {
            this.handleMetadataLoaded();
        });
      }

      // Get correct wordpress URL based on which URL it's accessed from
      getAPIUrl() {
        const hostname = window.location.hostname;
        let contentType = 'sa_core_content';

        if (this.player.mediainfo?.customFields) {
            contentType = this.player.mediainfo.customFields?.sa_category || 'sa_core_content';
        }
        
        const apiMap = {
          "straightarrownews-develop.go-vip.net": `//${hostname}/wp-json/wp/v2/${contentType}/`,
          "straightarrownews-preprod.go-vip.net": `//${hostname}/wp-json/wp/v2/${contentType}/`,
          "san.com": `//${hostname}/wp-json/wp/v2/${contentType}/`,
          "preview-players.brightcove.net": `//${hostname}/wp-json/wp/v2/${contentType}/`
        };

        if (hostname.includes('vipdev')) {
            return `//${hostname}/wp-json/wp/v2/${contentType}`;
        }

        return apiMap[hostname] || `https://san.com/wp-json/wp/v2/${contentType}/`;
      }

      // Return the related posts from the WP API
      async fetchRelatedPosts(postID) {
        const wpAPIUrl = this.getAPIUrl();

        if (!wpAPIUrl) {
            console.warn('No valid API URL found.');
            return null;
        }

        try {
            const response = await fetch(`${wpAPIUrl}${postID}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch related posts: ${response.statusText}`);
            }

            const json = await response.json();
            console.log(json.related_posts);
            console.log(json);
            return json.related_posts ? json.related_posts[0] : null;
        } catch (error) {
            console.error("Error fetching related posts:", error);
            return null;
        }
      }

      // Set the next video for the player to access
      // only fires after the player has loaded in
      // the proper metadata
      async handleMetadataLoaded(e) {
        const { customFields } = this.player.mediainfo || {};

        if (customFields && customFields.wp_post_id) {
            const { wp_post_id: postID } = customFields;
            this.nextVideo = await this.fetchRelatedPosts(postID);

            if (!this.nextVideo) {
                console.warn('No related video found.');
            }
        } else {
            console.warn('No custom fields or post ID found.');
        }
      }

      // Create the overlay HTML for related videos
      // in the future use a custom videojs component
      // for this
      createOverlay() {
        const overlay = document.createElement('div');
        overlay.classList.add('vjs-related-container');
        overlay.style = "flex: 1; background-color: rgba(10, 10, 10, 0.7); width: 100%; height: 100%; position: absolute; top: 0; align-content: center;";
        overlay.id = "next-video-container";
      
        const overlayContent = `
          <div class="vjs-related-content" style="margin: 0 auto; max-width: 40em;">
            <h2 style="font-size: 2em; margin: 0; padding-bottom: 0.5em; font-weight: bold;">Up next in <span id="timer" style="font-weight: bold;">6</span></h2>
            <img id="next-video" src="${this.getThumbnailUrl()}" alt="Next video thumbnail" style="width: 100%; cursor: pointer;" />
            <p style="font-size: 1.3em;">${this.nextVideo.title}</p>
          </div>
        `;
      
        overlay.innerHTML = overlayContent;
        return overlay;
      }

      getThumbnailUrl() {
        const baseUrl = this.nextVideo.thumbnail_url.split('?')[0];
        return `${baseUrl}?w=800`;
      }

      startCountdown() {
        this.clearCountdown();
        this.countdown = setInterval(() => this.countdownFn(), 1000);
      }

      // Reset countdown back to default value
      // and clear it's interval handle
      clearCountdown() {
        this.countdownRemaining = COUNTDOWN_DEFAULT;
        if(this.countdown) {
          clearInterval(this.countdown);
          this.countdown = null;
        }
      }

      // Countdown the timer and update the
      // text. When timer reaches 0 it will
      // play the video from this.nextVideo
      countdownFn() {
        this.countdownRemaining--;

        const timerElement = document.getElementById('timer');
        const nextVideoContainer = document.getElementById('next-video-container');

        if (!timerElement || !nextVideoContainer) {
            console.error('Timer or next video container element not found.');
            this.clearCountdown();
            return;
        }

        timerElement.textContent = this.countdownRemaining;

        if (this.countdownRemaining <= 0) {
            this.gotoNextVideo(nextVideoContainer);
        }
      }

      // load and play the next video
      gotoNextVideo(overlayElement) {
        this.clearCountdown();
        this.loadNextVideo();
        overlayElement.remove();
        this.player.getChild('controlBar').show();
      }

      // Loads next video into the player
      // and then plays the video.
      loadNextVideo() {
        const { video_id } = this.nextVideo;
      
        this.player.catalog.getVideo(video_id, (err, video) => {
          if (err) {
            console.error('Error loading next video:', err);
            return;
          }
      
          this.player.catalog.load(video);
          this.player.play();
        });
      }

      showRelatedVideoOverlay() {
        if (!this.nextVideo) {
          console.warn('No related video available.');
          return;
        }

        const overlayHTML = this.createOverlay();
        const playerContainer = document.getElementById("san-player");

        if (!playerContainer) {
          console.error('Player container not found.');
          return;
        }

        playerContainer.appendChild(overlayHTML);

        this.player.getChild('controlBar').hide();

        if (!this.countdown) {
            this.startCountdown();
            const nextVideoElement = document.getElementById('next-video');

            if (nextVideoElement) {
                nextVideoElement.addEventListener('click', () => this.gotoNextVideo(overlayHTML));
            } else {
                console.error('Next video element not found.');
            }
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