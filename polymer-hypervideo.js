'use strict';

/* global queryRegExSelector, queryRegExSelectorAll, getYouTubeHtml5VideoUrl */
Polymer('polymer-hypervideo', {
  publish: {
    currentTime: 0,
    duration: null,
    actorsOffset: {}
  },
  created: function() {
  },
  ready: function() {
    var that = this;
    var spinner;
    var video = that.$.hypervideo;
    var container = that.$.container;

    var onMutation = function(observer, mutations) {
      var nodes = [];
      var chapters = [];
      for (var i = 0, lenI = mutations.length; i < lenI; i++) {
        var mutation = mutations[i];
        if (mutation.addedNodes) {
          for (var j = 0, lenJ = mutation.addedNodes.length; j < lenJ; j++) {
            if (/^polymer-data-/gi.test(mutation.addedNodes[j].nodeName)) {
              nodes.push(mutation.addedNodes[j]);
            }
          }
        }
      }
      if (nodes.length) {
        positionDataAnnotations(nodes);
        updateTimelineAnnotations(nodes);
      }
      that.onMutation(that, onMutation);
    };

    that.onMutation(that, onMutation);

    var CORS_PROXY = document.location.origin + '/cors/';
    document.addEventListener('trackready', function(e) {
      console.log('Received event (document): trackready');
      var data = e.detail;
      var track = document.createElement('track');
      var cuesRead = false;
      track.addEventListener('load', function(e) {
        if (!cuesRead) {
          console.log('Received event (track): load');
          cuesRead = true;
          return readCues(e.target.track.cues, data.kind);
        }
      }, false);
      track.addEventListener('cuechange', function() {
        console.log('Fired event: hypervideocuechange');
        that.fire(
          'hypervideocuechange',
          {
            activeCues: track.track.activeCues
          }
        );
      });
      var trackLoadedInterval = setInterval(function() {
        if (track.readyState >= 2) {
          clearInterval(trackLoadedInterval);
          if (!cuesRead) {
            console.log('Received event (track): readyState');
            cuesRead = true;
            return readCues(track.track.cues, data.kind);
          }
        }
      }, 100);
      track.src = data.src;
      track.default = true;
      track.kind = data.kind;
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        track.srclang = 'en';
        track.track.mode = 'showing';
      } else if (track.kind === 'chapters') {
        var canvas = document.createElement('canvas');
        canvas.width = video.width;
        canvas.height = video.height;
        var ctx = canvas.getContext('2d');
        that.ctx = ctx;
        that.canvas = canvas;
      }
      video.appendChild(track);
    }, false);

    document.addEventListener('webcomponentstocready', function() {
      console.log('Received event (document): webcomponentstocready');
      // get all child <polymer-*> child nodes
      var webComponents = queryRegExSelectorAll(that, /^polymer-/gi);
      console.log('Fired event: webcomponentstoc');
      that.fire(
        'webcomponentstoc',
        {
          webComponentsToC: webComponents
        }
      );
    }, false);

    var updateTimelineAnnotations = function(opt_nodes) {
      // get all child <polymer-data-*> child nodes
      var dataAnnotations =
          opt_nodes || queryRegExSelectorAll(that, /^polymer-data-/gi);
      var annotations = [];
      dataAnnotations.forEach(function(annotation) {
        var type;
        if (/actor/gi.test(annotation.nodeName)) {
          type = 'actors';
        } else if (/overlay/gi.test(annotation.nodeName)) {
          type = 'overlays';
        } else {
          type = 'annotations';
        }
        annotations.push({
          start: parseInt(annotation.getAttribute('start'), 10),
          end: parseInt(annotation.getAttribute('end'), 10),
          type: type
        });
      });
      console.log('Fired event: dataannotations');
      that.fire(
        'dataannotations',
        {
          dataAnnotations: annotations
        }
      );

    };

    document.addEventListener('timelineready', function() {
      console.log('Received event (document): timelineready');
      updateTimelineAnnotations();
    }, false);

    // listen for events coming from the timeline component
    document.addEventListener('currenttimeupdate', function(e) {
      // console.log('Received event (document): currenttimeupdate');
      var data = e.detail;
      video.currentTime = data.currentTime;
      video.play();
    }, false);

    document.addEventListener('requeststillframes', function(e) {
      console.log('Received event (document): requeststillframes');
      spinner = showSpinner();
      var cues = e.detail.cues;
      if (!cues) {
        return;
      }
      var functions = [];
      cues.forEach(function(cue) {
        var start = cue.start;
        if (start > video.duration) {
          return;
        }
        functions.push({
          cue: cue,
          func: function() {
            video.currentTime = start;
          }
        });
      });
      var getNextStillFrame = function() {
        console.log('Received event (video): seeked');
        that.ctx.drawImage(video, 0, 0, video.clientWidth,
            video.clientHeight);
        var img = document.createElement('img');
        img.setAttribute('class', 'hypervideo');
        var url = that.canvas.toDataURL();
        img.src = url;
        var cue = functions[processedStillFrames].cue;
        console.log('Fired event: receivestillframe');
        that.fire(
          'receivestillframe',
          {
            img: img,
            text: cue.text,
            start: cue.start,
            end: cue.end
          }
        );
        processedStillFrames++;
        if (functions[processedStillFrames]) {
          return functions[processedStillFrames].func();
        } else {
          video.removeEventListener('seeked', getNextStillFrame);
          video.currentTime = 0;
          that.fire('allstillframesreceived');
          spinner.remove();
        }
      };
      var processedStillFrames = 0;
      video.addEventListener('seeked', getNextStillFrame);
      functions[processedStillFrames].func();
    });

    var initializeVideo = function() {
      // either add sources for regular video
      if (that.src) {
        that.src.split(/\s/g).forEach(function(src) {
          var source = document.createElement('source');
          source.src = src;
          video.appendChild(source);
        });
      // or add sources for YouTube video
      } else if (that.youtubevideoid) {
        getYouTubeHtml5VideoUrl(that.youtubevideoid,
            function(err, videoSources) {
          if (err) {
            return;
          }
          for (var videoSource in videoSources) {
            videoSource = videoSources[videoSource];
            var source = document.createElement('source');
            source.src = CORS_PROXY +
                encodeURIComponent(videoSource.original_url);
            source.type = videoSource.type.replace(/\+/g, ' ')
                .replace(/"/g, '\"');
            video.appendChild(source);
          }
        });
      }
      // determine video dimensions
      if (that.width) {
        that.width = parseInt(that.width, 10);
      } else {
        that.width = 400;
      }
      video.width = that.width;
      if (that.height) {
        that.height = parseInt(that.height, 10);
      } else {
        that.height = 225;
      }
      video.height = that.height;
      // add poster
      if (that.poster) {
        video.poster = that.poster;
      }
      // mute video
      if (that.muted !== null && that.muted !== 'false') {
        video.muted = true;
      }
    };

    var showSpinner = function() {
      // show spinner while the hypervideo gets prepared
      var splashDiv = document.createElement('div');
      splashDiv.classList.add('spinner');
      var splashSpinner = document.createElement('div');
      splashSpinner.classList.add('progress');
      splashDiv.appendChild(splashSpinner);
      splashDiv.style.width = video.width + 'px';
      splashDiv.style.height = video.height + 'px';
      splashDiv.style.position = 'absolute';
      splashDiv.style.top = video.offsetTop + 'px';
      splashDiv.style.left = video.offsetLeft + 'px';
      splashSpinner.style.position = 'relative';
      splashSpinner.style.top = (video.offsetHeight / 2 - 60 / 2) + 'px';
      splashSpinner.style.left = (video.offsetWidth / 2 - 60 / 2) + 'px';
      var loadingDiv = document.createElement('div');
      loadingDiv.textContent = '*';
      splashSpinner.appendChild(loadingDiv);
      container.appendChild(splashDiv);
      return splashDiv;
    };

    var positionDataAnnotations = function(opt_nodes) {
      // positions data annotations on top of the video
      var polymerData =
          opt_nodes || queryRegExSelectorAll(that, /^polymer-data-/gi);
      polymerData.forEach(function(node) {
        node.style.position = 'absolute';
        node.style.top = (video.offsetTop + 0.66 * video.offsetHeight) +
            'px';
        node.style.left = (video.offsetLeft + (0.05 * that.width)) + 'px';
        node.style.width = (0.9 * that.width) + 'px';
        node.style.display = 'none';
      });
    };

    var readCues = function(cues, kind) {
      if (!cues) {
        return;
      }
      var cueData = [];
      for (var i = 0, lenI = cues.length; i < lenI; i++) {
        var cue = cues.item ? cues.item(i) : cues[i];
        cueData.push({
          start: parseInt(cue.startTime, 10),
          end: parseInt(cue.endTime, 10),
          text: cue.text,
          id: cue.id,
          type: kind
        });
      }
      console.log('Fired event: cuesread');
      that.fire(
        'cuesread',
        {
          cueData: cueData,
          kind: kind
        }
      );
    };

    video.addEventListener('loadedmetadata', function() {
      console.log('Received event (video): loadedmetadata');
      that.duration = video.duration;
      // adjust the timeline dimensions according to the video duration
      var polymerTimelines = that.querySelectorAll('polymer-timeline');
      for (var i = 0, lenI = polymerTimelines.length; i < lenI; i++) {
        polymerTimelines[i].style.left = (video.offsetLeft +
            (0.05 * that.width)) + 'px';
      }
      var polymerData = queryRegExSelector(that, /^polymer-data-/gi);
      console.log('Fired event: hypervideoloadedmetadata');
      that.fire(
        'hypervideoloadedmetadata',
        {
          duration: that.duration,
          height: that.height,
          width: that.width,
          actorsOffset: {
            left: polymerData ? polymerData.style.left.replace('px', '') : null,
            top: polymerData ? polymerData.style.top.replace('px', '') : null
          }
        }
      );

      // alternative views
      if (that.alternativeviews) {
        var videos = [video];
        var videoWidth = Math.floor(that.width / 5);
        var ratio = that.width / that.height;

        function showControls(e) {
          return e.target.setAttribute('controls', true);
        }

        var hideControls = function hideControls(e) {
          return e.target.removeAttribute('controls');
        };

        var playAll = function playAll() {
          for (var i = 0; i < videos.length; i++) {
            videos[i].play();
          }
        };

        var pauseAll = function pauseAll() {
          for (var i = 0; i < videos.length; i++) {
            videos[i].pause();
          }
        };

        var seekAll = function seekAll(e) {
          for (var i = 0; i < videos.length; i++) {
            var currentVideo = videos[i];
            if (currentVideo === e.target) {
              continue;
            }
            currentVideo.currentTime = e.target.currentTime;
          }
        };

        var transitionend = function transitioned(e) {
          for (var i = 0; i < videos.length; i++) {
            var currentVideo = videos[i];
            if (currentVideo.classList.contains('small')) {
              currentVideo.style.zIndex = 10000;
            } else {
              currentVideo.style.zIndex = 'auto';
            }
          }
        }

        var makeBig = function makeBig(e) {
          for (var i = 0, j = 0; i < videos.length; i++) {
            var currentVideo = videos[i];
            if (currentVideo === e.target) {
              currentVideo.classList.remove('small');
              currentVideo.classList.add('big');
              currentVideo.addEventListener('mouseover', showControls);
              currentVideo.addEventListener('mouseout', hideControls);
              currentVideo.addEventListener('seeked', seekAll);
              currentVideo.width = that.width;
              currentVideo.height = that.width / ratio;
              currentVideo.style.top = 0;
              currentVideo.style.left = 0;
              currentVideo.style.zIndex = 10000;
            } else {
              currentVideo.classList.remove('big');
              currentVideo.classList.add('small');
              currentVideo.removeEventListener('mouseover', showControls);
              currentVideo.removeEventListener('mouseout', hideControls);
              currentVideo.removeEventListener('seeked', seekAll);
              currentVideo.style.left = (j * videoWidth) + 'px';
              currentVideo.style.top =
                  (that.height - (videoWidth / ratio) - 50) + 'px';
              currentVideo.width = videoWidth;
              currentVideo.height = videoWidth / ratio;
              currentVideo.removeAttribute('controls');
              j++;
            }
          }
        };

        that.alternativeviews.split(/\s/).forEach(function(views) {
          views = JSON.parse(views);
          var content = container.querySelector('content');
          for (var videoSource in views) {
            if (video.currentSrc.indexOf(videoSource) === -1) {
              continue;
            }
            for (var id in views[videoSource]) {
              var alternativeView = views[videoSource][id];
              var viewVideo = document.createElement('video');
              var viewSource = document.createElement('source');
              viewSource.src = alternativeView.src;
              viewVideo.appendChild(viewSource);
              viewVideo.id = id;
              viewVideo.setAttribute('title', alternativeView.title);
              viewVideo.classList.add('hypervideo');
              video.parentNode.insertBefore(viewVideo, content);
              videos.push(viewVideo);
            }
          }
        });

        (function init() {
          for (var i = 0; i < videos.length; i++) {
            var currentVideo = videos[i];

            currentVideo.addEventListener('play', playAll);

            currentVideo.addEventListener('pause', pauseAll);

            currentVideo.addEventListener('click', makeBig);

            currentVideo.addEventListener('transitionend', transitionend);

            if (i === 0) {
              currentVideo.classList.add('big');
              currentVideo.addEventListener('mouseover', showControls);
              currentVideo.addEventListener('mouseout', hideControls);
              currentVideo.addEventListener('seeked', seekAll);
              currentVideo.width = that.width;
              currentVideo.muted = false;
            } else {
              currentVideo.classList.add('small');
              currentVideo.style.left = ((i - 1) * videoWidth) + 'px';
              currentVideo.style.top =
                  (that.height - (videoWidth / ratio) - 50) + 'px';
              currentVideo.width = videoWidth;
              currentVideo.muted = true;
            }
          }
        })();
      }

    }, false);

    // publish timeupdate events
    video.addEventListener('timeupdate', function() {
      // console.log('Received event (video): timeupdate');
      that.currentTime = video.currentTime;
      // console.log('Fired event: hypervideotimeupdate');
      that.fire(
        'hypervideotimeupdate',
        {
          currentTime: that.currentTime
        }
      );
    }, false);

    spinner = showSpinner();
    setTimeout(function() {
      initializeVideo();
      positionDataAnnotations();
      spinner.remove();
    }, 50);
  },
  pause: function() {
    return this.$.hypervideo.pause();
  },
  play: function() {
    return this.$.hypervideo.play();
  }
});