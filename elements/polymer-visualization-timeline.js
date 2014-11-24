'use strict';

Polymer('polymer-visualization-timeline', {
  overlays: '',
  actors: '',
  chapters: '',
  videoHeight: 0,
  videoWidth: 0,
  duration: 0,
  currentTime: 0,
  created: function() {
  },
  ready: function() {
    var container = this.$.container;
    var settings = this.$.settings;
    var zoom = this.$.zoom;
    var timeline = this.$.timeline;
    var wrapper = this.$.wrapper;
    var that = this;
    var maxLevel = -1;
    var lastInserted = { start: -1, end: -1 };
    var kinds = {};
    var legend = {};
    var eventsReceived = {};
    var annotationsQueue = [];
    var annotationsElements = [];
    var fontSize = parseInt(getComputedStyle(container).fontSize
        .replace('px', ''), 10);
    var settingsWidth = 200;
    var settingsHeight = 150;
    var scalingFactor;

    zoom.addEventListener('input', function() {
      console.log('Received event (zoom): input');
      container.style.fontSize = this.value + 'px';
    });

    var addTimeMarkers = function() {
      var timeMarker = document.createElement('div');
      timeMarker.style.display = 'none';
      timeMarker.classList.add('timeMarker');
      if (that.orientation === 'landscape') {
        timeMarker.style.width = '1px';
        timeMarker.style.height = '100%';
      } else {
        timeMarker.style.width = '100%';
        timeMarker.style.height = '1px';
      }
      container.appendChild(timeMarker);
      var currentTimeMarkerPosition = {
        x: timeMarker.style.marginLeft || '0em',
        y: timeMarker.style.marginTop || '0em'
      };

      var playHead = document.createElement('div');
      playHead.classList.add('playHead');
      if (that.orientation === 'landscape') {
        playHead.style.width = '1px';
        playHead.style.height = '100%';
      } else {
        playHead.style.width = '100%';
        playHead.style.height = '1px';
      }
      container.appendChild(playHead);

      container.addEventListener('mouseenter', function() {
        console.log('Received event (container): mouseenter');
        timeMarker.style.display = 'block';
        currentTimeMarkerPosition = {
          x: timeMarker.style.marginLeft || '0em',
          y: timeMarker.style.marginTop || '0em'
        };
        fontSize = parseInt(getComputedStyle(container).fontSize
            .replace('px', ''), 10);
      }, false);

      container.addEventListener('mouseleave', function() {
        console.log('Received event (container): mouseleave');
        timeMarker.style.display = 'none';
        timeMarker.style.marginLeft = currentTimeMarkerPosition.x;
        timeMarker.style.marginTop = currentTimeMarkerPosition.y;
      }, false);

      container.addEventListener('mousemove', function(e) {
        console.log('Received event (container): mousemove');
        var current = e.target;
        while (current !== container) {
          current = current.parentNode;
        }
        var offsetLeft = 0;
        var offsetTop = 0;
        if (current.offsetParent) {
          do {
            offsetLeft += current.offsetLeft - current.scrollLeft;
            offsetTop += current.offsetTop - current.scrollTop;
          } while (current = current.offsetParent); // offsets up to the root
        }
        if (that.orientation === 'landscape') {
          var xEm = (e.clientX - offsetLeft + timeline.scrollLeft) / fontSize;
          timeMarker.style.marginLeft = xEm + 'em';
        } else {
          var yEm = (e.clientY - offsetTop + timeline.scrollTop) / fontSize;
          timeMarker.style.marginTop = yEm + 'em';
        }
        currentTimeMarkerPosition = {
          x: timeMarker.style.marginLeft || '0em',
          y: timeMarker.style.marginTop || '0em'
        };
      }, false);

      container.addEventListener('click', function(e) {
        console.log('Received event (container): click');
        var current = e.target;
        var currentTime;
        while ((current !== container) &&
               (current.classList) &&
               (!current.classList.contains('annotations')) &&
               (!current.classList.contains('actors')) &&
               (!current.classList.contains('overlays')) &&
               (!current.classList.contains('chapters'))) {
          current = current.parentNode;
        }
        if (current.dataset && current.dataset.start) {
          // navigate to the start time of the active annotation
          currentTime = current.dataset.start;
        } else {
          // navigate to the exact position of the time marker
          if (that.orientation === 'landscape') {
            currentTime = timeMarker.style.marginLeft.replace('em', '');
          } else {
            currentTime = timeMarker.style.marginTop.replace('em', '');
          }
          currentTime /= scalingFactor;
        }
        // console.log('Fired event: currenttimeupdate');
        return that.fire(
          'currenttimeupdate',
          {
            currentTime: currentTime
          }
        );
      }, false);

      document.addEventListener('hypervideotimeupdate', function(e) {
        // console.log('Received event (document): hypervideotimeupdate');
        var currentTime = e.detail.currentTime * scalingFactor;

        if (that.orientation === 'landscape') {
          playHead.style.marginLeft = currentTime + 'em';
        } else {
          playHead.style.marginTop = currentTime + 'em';
        }
        for (var i = 0, lenI = annotationsElements.length; i < lenI; i++) {
          if ((annotationsElements[i].dataset.start <= currentTime) &&
              (currentTime < annotationsElements[i].dataset.end)) {
            annotationsElements[i].classList.add('current');
          } else {
            annotationsElements[i].classList.remove('current');
          }
        }
      });
    };

    settings.addEventListener('click', function(e) {
      console.log('Received event (settings): click');
      var current = e.target;
      if (current.nodeName.toLowerCase() === 'label') {
        current = current.previousSibling;
      }
      var annotationType = current.dataset.annotationType;
      var display = current.checked ? 'block' : 'none';
      var markers = container.querySelectorAll('.' + annotationType);
      for (var i = 0, lenI = markers.length; i < lenI; i++) {
        var marker = markers[i];
        marker.style.display = display;
      }
    });

    document.addEventListener('hypervideoloadedmetadata', function(e) {
      console.log('Received event (document): hypervideoloadedmetadata');
      var data = e.detail;
      that.duration = data.duration;
      that.videoHeight = data.height;
      that.videoWidth = data.width;
      var maxWidth;
      if (that.width) {
        maxWidth = that.width - settingsWidth;
      } else {
        maxWidth = 2 * that.videoWidth;
      }
      var maxHeight;
      if (that.height) {
        maxHeight = that.height - settingsHeight;
      } else {
        maxHeight = 2 * that.videoHeight;
      }

      fontSize = parseInt(getComputedStyle(container)
          .fontSize.replace('px', ''), 10);
      if (that.orientation === 'landscape') {
        scalingFactor = maxWidth / (that.duration * fontSize);

        timeline.style.overflowX = 'auto';
        timeline.style.overflowY = 'auto';
        timeline.style.cssFloat = 'left';
        timeline.style.height = that.height ?
            that.height + 'px' : that.videoHeight + 'px';
        timeline.style.width = (that.duration * scalingFactor) + 'em';

        container.style.height = that.height ?
            that.height + 'px' : that.videoHeight + 'px';
        container.style.width = (that.duration * scalingFactor) + 'em';
        container.style.backgroundImage = 'linear-gradient(' +
            '90deg,' +
            'transparent ' + (fontSize - 1) + 'px,' +
            '#eee ' + (fontSize - 1) + 'px,' +
            '#eee ' + fontSize + 'px,' +
            'transparent ' + fontSize + 'px)';
        container.style.backgroundSize = '1em 100%';

        settings.style.height = timeline.style.height;
        settings.style.width = settingsWidth + 'px';
        settings.style.marginLeft = container.style.width;
        settings.style.borderLeft = 'none';

        wrapper.style.width = 'calc(' + timeline.style.width + ' + ' +
            settings.offsetWidth + 'px)';
      } else {
        scalingFactor = maxHeight / (that.duration * fontSize);
        timeline.style.width = that.width ?
            that.width + 'px' : that.videoWidth + 'px';
        timeline.style.height = (that.duration * scalingFactor) + 'em';
        timeline.style.overflowY = 'auto';
        timeline.style.overflowX = 'auto';

        container.style.width = that.width ?
            that.width + 'px' : that.videoWidth + 'px';
        container.style.height = (that.duration * scalingFactor) + 'em';
        container.style.backgroundImage = 'linear-gradient(' +
            '0deg,' +
            'transparent ' + (fontSize - 1) + 'px,' +
            '#eee ' + (fontSize - 1) + 'px,' +
            '#eee ' + fontSize + 'px,' +
            'transparent ' + fontSize + 'px)';
        container.style.backgroundSize = '100% 1em';

        settings.style.width = timeline.style.width;
        settings.style.height = settingsHeight + 'px';
        settings.style.borderTop = 'none';

        wrapper.style.width = timeline.style.width;
      }
      annotationsQueue.forEach(function(annotationsBundle) {
        addAnnotations(annotationsBundle);
      });
    });

    document.addEventListener('cuesread', function(e) {
      console.log('Received event (document): cuesread');
      var data = e.detail;
      if (data.kind === 'chapters') {
        annotationsQueue.push(data.cueData);
      }
    }, false);

    document.addEventListener('dataannotations', function(e) {
      console.log('Received event (document): dataannotations');
      if (eventsReceived.dataannotations) {
        return;
      }
      eventsReceived.dataannotations = true;
      annotationsQueue.push(e.detail.dataAnnotations);
    }, false);

    var addAnnotations = function(annotations) {
      var lastType = '';
      annotations.sort(function(a, b) {
        return b.type - a.type;
      });
      var level = ++maxLevel;
      annotations.forEach(function(annotation) {
        var annotationMarker = document.createElement('div');
        annotationsElements.push(annotationMarker);
        container.appendChild(annotationMarker);
        var start = annotation.start;
        var end = annotation.end;
        var div = document.createElement('div');
        div.classList.add('markerContents');
        kinds[annotation.type] = true;
        div.innerHTML += annotation.type + ' ' + start + '&ndash;' + end;
        annotationMarker.dataset.start = start;
        annotationMarker.dataset.end = end;
        annotationMarker.appendChild(div);
        annotationMarker.classList.add('marker');
        annotationMarker.classList.add(annotation.type);
        annotationMarker.classList.add(annotation.type + '-' + start + '-' +
            end);
        if (lastType && annotation.type !== lastType) {
          level++;
          maxLevel = level;
        }
        lastType = annotation.type;
        if ((start >= lastInserted.start) &&
            (start < lastInserted.end)) {
          level++;
          maxLevel = level;
        }
        if (that.orientation === 'landscape') {
          annotationMarker.style.marginLeft = (scalingFactor * start) + 'em';
          annotationMarker.style.width = (scalingFactor * (end - start)) + 'em';
          annotationMarker.style.height = (12 * 1.1) + 'px';
          // '1.1em';
          annotationMarker.style.marginTop = (level * 12 * 1.2) + 'px';
          // (level * 1.2) + 'em';
        } else {
          div.classList.add('rotated');
          annotationMarker.style.marginTop = (scalingFactor * start) + 'em';
          annotationMarker.style.height = (scalingFactor * (end - start)) +
              'em';
          annotationMarker.style.width = (12 * 1.1) + 'px';
          // '1.1em';
          annotationMarker.style.marginLeft = (level * 12 * 1.2) + 'px';
          // (level * 1.2) + 'em';
        }
        lastInserted = {
          start: start,
          end: end
        };
      });
      Object.keys(kinds).forEach(function(kind) {
        if (!legend[kind]) {
          legend[kind] = true;
          var checkbox = document.createElement('input');
          checkbox.checked = true;
          checkbox.type = 'checkbox';
          checkbox.id = 'checkbox-' + Math.random();
          checkbox.dataset.annotationType = kind;
          var label = document.createElement('label');
          label.classList.add(kind);
          label.setAttribute('for', checkbox.id);
          label.textContent = kind;
          var settingsContainer = document.createElement('div');
          settingsContainer.appendChild(checkbox);
          settingsContainer.appendChild(label);
          settings.appendChild(settingsContainer);
        }
      });
    };

    setTimeout(function() {
      console.log('Fired event: timelineready');
      that.fire('timelineready');
      addTimeMarkers();
    }, 250);
  }
});