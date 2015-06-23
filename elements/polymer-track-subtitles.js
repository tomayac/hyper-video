'use strict';

Polymer({
  is: 'polymer-track-subtitles',

  properties: {
    src: {
      type: String
    },
    displaySubtitlesGroup: {
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
    var search = that.$.search;
    var cuesContainer = that.$.cuesContainer;
    var cuesElements = [];

    document.addEventListener('hypervideo-loaded-metadata', function(e) {
      console.log('Received event (document): hypervideo-loaded-metadata');
      var data = e.detail;
      container.style.top = 'calc(' + data.height + 'px + .5em)';
    });


    document.addEventListener('cues-read', function(e) {
      console.log('Received event (document): cuesread');
      if (that.width) {
        container.style.width = that.width + 'px';
        search.style.width = 'calc(' + that.width + 'px - 1em)';
      } else {
        container.style.width = '50%';
        search.style.width = '50%';
      }
      if (that.height) {
        container.style.height = that.height + 'px';
      }
      var data = e.detail;
      if (that.displaySubtitlesGroup && data.kind === 'subtitles') {
        createSubtitlesGroup(data.cueData);
      }
    });

    var createSubtitlesGroup = function(cues) {
      // Full-text search
      container.style.display = 'block';
      var doSearch = function() {
        var query = search.value;
        var regExp;
        try {
          regExp = new RegExp(query, 'gi');
          var divs = cuesContainer.querySelectorAll('div');
          for (var i = 0, lenI = divs.length; i < lenI; i++) {
            var div = divs[i];
            div.style.backgroundColor = 'transparent';
            regExp.lastIndex = 0;
            var matches = div.textContent.match(regExp);
            if (matches && query.length) {
              matches.forEach(function(match) {
                div.style.backgroundColor = 'yellow';
              });
            }
          }
        } catch(e) {
          console.log('Invalid search term: ' + e);
        }
      };
      search.addEventListener('keyup', doSearch, false);
      search.addEventListener('change', doSearch, false);
      search.addEventListener('search', doSearch, false);
      // Attach cues
      var tempDiv = document.createElement('div');
      cues.forEach(function(cue) {
        var div = document.createElement('div');
        div.dataset.start = cue.start;
        div.dataset.end = cue.end;
        tempDiv.innerHTML = cue.text;
        var speaker = cue.text.replace(/^<v\s+(\w+(?:\s+\w+)?)>\s+(.+?)$/g,
            '<strong>$1:</strong> $2');
        div.innerHTML = speaker;
        cuesContainer.appendChild(div);
        cuesElements.push(div);
      });
    };

    cuesContainer.addEventListener('click', function(e) {
      console.log('Received event (cuesContainer): click');
      var current = e.target;
      if (current === cuesContainer) {
        return;
      }
      while (current.nodeName !== 'DIV') {
        current = current.parentNode;
      }
      // console.log('Fired event: current-time-update');
      that.fire(
        'current-time-update',
        {
          currentTime: current.dataset.start
        }
      );
    }, false);

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
          kind: 'subtitles'
        }
      );
    }, 250);
  }
});