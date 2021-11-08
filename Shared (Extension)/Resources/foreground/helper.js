// choose option set based on url.
function getOptionSet() {
  return new Promise((resolve, reject) => {
    if (window.location.hostname === 'www.youtube.com') {
      resolve(youTubeOptions);
    } else if (window.location.hostname === 'www.ted.com') {
      resolve(tedOptions);
    } else if (window.location.hostname === 'www.nytimes.com') {
      resolve(NYTOptions);
    } else if (frameUrl !== null && new URL(frameUrl).hostname === 'www.youtube.com') {
      youTubeOptions.getEmbedLink = function () {
        return frameUrl;
      };
      delete youTubeOptions.alternative;
      resolve(youTubeOptions);
    } else if (window.location.hostname === 'www.washingtonpost.com') {
      resolve(WaPoOptions);
    } else if (window.location.hostname === 'www.wsj.com') {
      resolve(WSJOptions);
    } else if (window.location.hostname === 'vimeo.com') {
      resolve(vimeoOptions);
    } else if (frameUrl !== null && new URL(frameUrl).hostname === 'player.vimeo.com') {
      resolve(vimeoCrossOriginOptions)
    } else if (crossOrigin) {
      resolve(defaultCrossOriginOptions)
    } else {
      resolve(defaultOptions);
    }
  })
}

function colorCue(transcriptData, transcript, query) {
  const [text, startTime, index] = transcriptData.currentlyPlayingPhraseProperties(query);
  const currentlyEmphasizedCue = transcript.querySelector('.currentPhrase');

  if (transcriptData.blurbType === blurbTypes.CONTINUOUS) {
    if (text && (!currentlyEmphasizedCue || text !== currentlyEmphasizedCue.innerText)) {
      // replace the dark blue emphasis with a light blue watched indicator. TODO: extract this process to a helper function.
      currentlyEmphasizedCue?.classList.add('watched');
      currentlyEmphasizedCue?.classList.remove('currentPhrase');

      let lineBreaklessText = removeLineBreaks(text);

      // search the remaning unwrapped text to try to find "text" and wrap it. TODO: extract to helper.
      let childNodes = Array.from(transcript.childNodes);
      for (const node of childNodes) {
        if (node.textContent.includes(lineBreaklessText)) {
          let newNode = stringToHTML(node.textContent.replace(lineBreaklessText, `<div class='currentPhrase TRcue'>${lineBreaklessText} </div>`));
          node.replaceWith(newNode);
          newNode.outerHTML = newNode.innerHTML; // newNode is actually the body of a document frag, so we have to unwrap the <body> tag.
          break;
        }
      }
    }
  } else {
    // either blurb type is track or divided. In any case, assume as little as possible. Only go off of text.
    let currentIndex = Array.from(transcript.querySelectorAll('div')).findIndex(isEmphasized); // TODO: make more specif .TRcue.
    if (index !== currentIndex) {
      currentlyEmphasizedCue?.classList.remove('currentPhrase');
      currentlyEmphasizedCue?.classList.add('watched');
      transcript.querySelectorAll('div')[index]?.classList.add('currentPhrase');
    }
  }
}

function insertVideoIntoReader(options, video, videoContainer) {
  return new Promise((resolve, reject) => {
    switch (options.videoSource) {
      case videoSources.MOVE_FROM_PAGE: {
        const parent = video.parentNode;
        const placeholder = document.createElement('tr-placeholder');
        parent.insertBefore(placeholder, video);
        videoContainer.appendChild(video);
        
        if (!video.controls) {
          video.controls = true
          video.classList.add("tr-added-player-controls")
        }
        
        const inserted = {
          video,
          placeholder,
        };
        resolve(inserted);
        break;
      }
      case videoSources.EMBED_VIDEO: {
        let embeddedFrame = createEmbeddedFrame(options.getEmbedLink);
        embeddedFrame.allow = 'fullscreen';
        videoContainer.appendChild(embeddedFrame);
        embeddedFrame.addEventListener('load', () => {
          var inserted;
          // same origin case:
          if (new URL(options.getEmbedLink()).hostname === window.location.hostname) {
            const video = embeddedFrame.contentDocument.querySelector('video');
            inserted = {
              video,
              container,
              type: 'same-origin',
            };
          }
          // cross origin case:
          else {
            embeddedFrame.contentWindow.postMessage('embeddedByTR', '*');

            inserted = {
              conteiner: embeddedFrame,
              type: 'cross-origin',
            };
          }

          resolve(inserted);
        }, true);
        break;
      }
      case videoSources.COPY_VIDEO: {
        const videoCopy = video.cloneNode(true);
        videoCopy.id = 'tr-copied';
        videoCopy.style.width = '100%';
        videoCopy.controls = true;
        videoContainer.appendChild(videoCopy);

        const inserted = {
          original_video: video,
          video: videoCopy,
        };
        resolve(inserted);
        break;
      }
      default:
        reject(new Error("Video source must be of type 'embed', 'move', or 'copy'"));
    }
  });
}

// present confirm dialogs and run one of 3 functions.
function presentConfirmDialogs(func1, func2, func3) {
  if (confirm("This video's cues are being lazy loaded. Would you like to scrub them?")) {
    if (confirm('Click okay if you want to scrub at the outset, or cancel to do it in realtime.')) {
      func1();
    } else {
      func2();
    }
  } else {
    func3();
  }
}

function getPortConnection(msg) {
  return new Promise((resolve, reject) => {
    window.addEventListener("message", function(e) {
      if (e.data == msg) {
        resolve(e.ports[0])
      }
    })
  })
}

var stringToHTML = function (str) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(str, 'text/html');
  return doc.body;
};

function removeLineBreaks(string) {
    if (typeof string !== "string") {
        throw "Attempted to remove line breaks from a non-string."
    } else {
     return string.replace(/(\r\n|\n|\r)/gm, " ")
    }
}

const isEmphasized = (element) => {
    return Array.from(element?.classList).includes("currentPhrase")
}

function createReader() {
    reader = document.createElement("transcript-reader");
    document.body.appendChild(reader);

    // set color-theme (to adjust the window toolbar color)
    metaLight = document.createElement("meta")
    metaLight.name = "theme-color"
    metaLight.classList.add("tr-theme-color")
    metaLight.content = "rgb(230,230,230)"
    metaLight.media = "(prefers-color-scheme: light)"
    document.head.prepend(metaLight)
    
    metaDark = document.createElement("meta")
    metaDark.name = "theme-color"
    metaDark.classList.add("tr-theme-color")
    metaDark.content = "rgb(0,0,0)"
    metaDark.media = "(prefers-color-scheme: dark)"
    document.head.prepend(metaDark)
    
    metaScale = document.createElement("meta");
    metaScale.name = "viewport";
    metaScale.content = "width=device-width, initial-scale=1";
    metaScale.id = "metaScale"
    document.head.prepend(metaScale)
    /* TODO: remove this at the end. */
    
    // stop click and keypress events from working while reader is active. This is useful for sites like youtube that wanna play in the bg when (space) or go fullscreen when (f).
    /* window.onkeydown = function(e) {if (document.querySelector("transcript-reader")) {return false} }
    window.onclick = function(e) {if (document.querySelector("transcript-reader")) {return false} } */

    container = reader.shadowRoot.querySelector("#tr-article-container")
    transcript = reader.shadowRoot.querySelector("#transcript")
    background = reader.shadowRoot.querySelector("#background");
    videoContainer = reader.shadowRoot.querySelector("#tr-video-container");
    
    return [reader, container, transcript, background, videoContainer]
}

function createEmbeddedFrame(getEmbedLinkFunction) {
    embeddedFrame = document.createElement("iframe")
    embeddedFrame.src = getEmbedLinkFunction();
    embeddedFrame.style = "border: none;";
    return embeddedFrame
}

function getRelevantVideo(srcUrl) {
    if (srcUrl) {
        return document.querySelector(`video[src='${srcUrl}']`)
    } else if (document.querySelectorAll("video").length == 1) {
        return document.querySelector("video")
    } else {
        largestVideoInViewport = getLargest(Array.from(document.querySelectorAll("video")).filter(elem => isInViewport(elem)))
        if (largestVideoInViewport) {
            return largestVideoInViewport
        }
        largestVideoInViewportHorizontally = getLargest(Array.from(document.querySelectorAll("video")).filter(elem => isInViewportHorizontally(elem)))
        if (largestVideoInViewportHorizontally) {
            return largestVideoInViewportHorizontally
        }
        largestPlayingVideo = getLargest(Array.from(document.querySelectorAll("video")).filter(elem => !elem.paused))
        if (largestPlayingVideo) {
            return largestPlayingVideo
        }
        
        // hail mary case:
        if (document.querySelector("video")) {
            return document.querySelector("video")
        }
        
        // total failure. Unable to find any videos.
        alert("Transcript Reader could not find a video on this page. This may be because the video is contained in an iframe. If this was the case, no need to mark an error.")
        return null
    }
}

function teardown(options, inserted, reader) {
  html.classList.remove("tr-enabled");
  document.querySelectorAll(".tr-theme-color").forEach(metaTag => metaTag.remove())
  document.querySelector("#metaScale").remove()
  Array.from(document.querySelectorAll(".tr-added-player-controls")).forEach(video => {video.removeAttribute("controls"); video.classList.remove("tr-added-player-controls")})
  document.querySelectorAll(".tr-theme-color").forEach(metaTag => metaTag.remove())
  background.classList.add('disappearing');
  
  switch (options.videoSource) {
    case videoSources.MOVE_FROM_PAGE: {
      const { placeholder } = inserted;
      const video = inserted.video;
      placeholder.parentElement.replaceChild(video, placeholder);
    }
    case videoSources.COPY_VIDEO:
    case videoSources.EMBED_VIDEO:
    break;
  }
  
  setTimeout(() => { reader.remove(); }, 400); // 400 refers to the length (in ms) of the 'disappearing' css animation.
}
