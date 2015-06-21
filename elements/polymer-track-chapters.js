'use strict';

Polymer({
  is: 'polymer-track-chapters',

  properties: {
    src: {
      type: String
    },
    displayChaptersThumbnails: {
      type: Boolean
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    }
  },

  created: function() {
  },

  ready: function() {
    var that = this;
    var container = that.$.container;
    var hyperVideoLoadedMetadata = false;
    var cuesElements = [];
    var cueData;
    var cuesRead = false;
    that.displayChaptersThumbnails = true;

    document.addEventListener('hypervideo-loaded-metadata', function() {
      console.log('Received event (document): hypervideo-loaded-metadata');
      if (that.width) {
        container.style.width = that.width + 'px';
      } else {
        container.style.width = '50%';
      }
      if (that.height) {
        container.style.height = that.height + 'px';
      }
      hyperVideoLoadedMetadata = true;
      if ((that.displayChaptersThumbnails) &&
          (hyperVideoLoadedMetadata) &&
          (cuesRead)) {
        displayChaptersThumbnails(cueData);
      }
    });

    document.addEventListener('cuesread', function(e) {
      console.log('Received event (document): cuesread');
      cuesRead = true;
      var data = e.detail;
      if (data.kind !== 'chapters') {
        return;
      }
      cueData = data.cueData;
      if ((that.displayChaptersThumbnails) &&
          (hyperVideoLoadedMetadata) &&
          (cuesRead)) {
        displayChaptersThumbnails(cueData);
      }
    });

    var displayChaptersThumbnails = function(cues) {
      console.log('Fired event: request-still-frames');
      that.fire(
        'request-still-frames',
        {
          cues: cues
        }
      );
    };

    document.addEventListener('receive-still-frame', function(e) {
      console.log('Received event (document): receive-still-frame');
      var data = e.detail;
      var img = data.img;
      var text = data.text;
      var start = data.start;
      var end = data.end;
      var li = document.createElement('li');
      cuesElements.push(li);
      li.dataset.start = start;
      li.dataset.end = end;
      var figure = document.createElement('figure');
      li.appendChild(figure);
      figure.appendChild(img);
      var figcaption = document.createElement('figcaption');
      figcaption.textContent = text;
      figure.appendChild(figcaption);
      container.appendChild(li);
    });

    container.addEventListener('click', function(e) {
      console.log('Received event (container): click');
      var current = e.target;
      if (current === container) {
        return;
      }
      while (current.nodeName !== 'LI') {
        current = current.parentNode;
      }
      // console.log('Fired event: current-time-update');
      that.fire(
        'current-time-update',
        {
          currentTime: current.dataset.start
        }
      );
    });

    document.addEventListener('hypervideo-time-update', function(e) {
      // console.log('Received event (document): hypervideo-time-update');
      var currentTime = e.detail.currentTime;
      for (var i = 0, lenI = cuesElements.length; i < lenI; i++) {
        var cue = cuesElements[i];
        var start = cue.dataset.start;
        var end = cue.dataset.end;
        if (start <= currentTime && currentTime < end) {
          cue.classList.add('current');
        } else {
          cue.classList.remove('current');
        }
      }
    }, false);

    setTimeout(function() {
      console.log('Fired event: track-ready');
      that.fire(
        'track-ready',
        {
          src: that.src,
          kind: 'chapters'
        }
      );
    }, 250);
  }
});