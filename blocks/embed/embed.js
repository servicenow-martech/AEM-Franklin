import { readBlockConfig } from '../../scripts/aem.js';
/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */

const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

const getDefaultEmbed = (url) => `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
    <iframe src="${url.href}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen=""
      scrolling="no" allow="encrypted-media" title="Content from ${url.hostname}" loading="lazy">
    </iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  const embedHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  const embedHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}"
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};

const embedTwitter = (url) => {
  const embedHTML = `<blockquote class="twitter-tweet"><a href="${url.href}"></a></blockquote>`;
  loadScript('https://platform.twitter.com/widgets.js');
  return embedHTML;
};

function videoEventTracking(myPlayer, videoTagId) {
  let eventName = 'video_started';
  let progress = [];

  myPlayer.on('timeupdate', (event) => {
    const videoPercentage = (myPlayer.currentTime() * 100) / myPlayer.duration();

    switch (true) {
      case videoPercentage === 100:
        eventName = 'video_completed';
        break;
      case videoPercentage > 90:
        eventName = 'video_reached_90_pct';
        break;
      case videoPercentage > 75:
        eventName = 'video_reached_75_pct';
        break;
      case videoPercentage > 50:
        eventName = 'video_reached_50_pct';
        break;
      case videoPercentage > 25:
        eventName = 'video_reached_25_pct';
        break;
      default:
        eventName = 'video_started';
    }

    if (!progress.includes(eventName)) {
      progress.push(eventName);

      const videoProgress = {
        name: eventName,
        digitalData: {
          videoTracking: {
            id: videoTagId,
            name: myPlayer.mediainfo.name,
          },
        },
        event,
      };

      if (eventName === 'video_completed') {
        progress = [];
      }

      window.appEventData = window.appEventData || [];

      window.appEventData.push(videoProgress);
    }
  });
}

function videoTracking(block) {
  const newPlayerId = block.querySelector('video').getAttribute('id');

  // eslint-disable-next-line func-names
  window.videojs(newPlayerId).ready(function () {
    const myPlayer = this;
    const videoID = document.getElementById(newPlayerId).getAttribute('data-video-id');
    myPlayer.on('loadedmetadata', () => {
      videoEventTracking(myPlayer, videoID);
    });
  });
}

const embedBrightcove = (videoid, account, player) => {
  const embedHTML = `
   <div class="brightcove-video-wrapper">
   <video-js
   data-video-id="${videoid}"
   data-account="${account}"
   data-player="${player}"
   data-embed="default"
   data-application-id=""
   class="video-js video-target"
   controls>
   </video-js>
   </div>
  `;
  return embedHTML;
};

const loadEmbed = (block, link, blockConfig, autoplay) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }

  const EMBEDS_CONFIG = [
    {
      match: ['youtube', 'youtu.be'],
      embed: embedYoutube,
    },
    {
      match: ['vimeo'],
      embed: embedVimeo,
    },
    {
      match: ['twitter'],
      embed: embedTwitter,
    },
  ];

  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));
  const url = link ? new URL(link) : '';

  if (config) {
    block.innerHTML = config.embed(url, autoplay);
    block.classList = `block embed embed-${config.match[0]}`;
  } else if (block.classList.contains('brightcove')) {
    const { videoid } = blockConfig;
    if (!videoid) {
      // eslint-disable-next-line no-console
      console.error('Brightcove video id is not provided');
      return;
    }
    const account = blockConfig.account || '5703385908001';
    const player = blockConfig.player || 'default';
    block.innerHTML = embedBrightcove(videoid, account, player);
    const script = document.createElement('script');

    block.querySelector('div').append(script);
    script.onload = () => {
      videoTracking(block);
    };

    script.setAttribute('src', `https://players.brightcove.net/${account}/${player}_default/index.min.js`);
    block.classList = 'block embed embed-brightcove';
  } else {
    block.innerHTML = getDefaultEmbed(url);
    block.classList = 'block embed';
  }
  block.classList.add('embed-is-loaded');
};

export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a') ? block.querySelector('a').href : '';
  const blockConfig = readBlockConfig(block);
  block.textContent = '';

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    wrapper.innerHTML = '<div class="embed-placeholder-play"><button title="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, blockConfig, true);
    });
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link, blockConfig);
      }
    });
    observer.observe(block);
  }
}
