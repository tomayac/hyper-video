'use strict';

Polymer({
  is: 'visualization-toc',

  properties: {
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
    var cuesElements = [];
    var container = that.$.container;
    // listen for events

    document.addEventListener('hypervideo-loaded-metadata', function(e) {
      console.log('Received event (document): hypervideo-loaded-metadata');
      var data = e.detail;
      container.style.top = 'calc(' + data.height + 'px + .5em)';
    });

    document.addEventListener('web-components-toc', function(e) {
      console.log('Received event (document): web-components-toc');
      if (that.width) {
        container.style.width = that.width + 'px';
      } else {
        container.style.width = '50%';
      }
      if (that.height) {
        container.style.height = that.height + 'px';
      }
      var fragment = document.createDocumentFragment();
      var ol = document.createElement('ol');
      fragment.appendChild(ol);
      e.detail.webComponentsToC.forEach(function(elem) {
        var li = document.createElement('li');
        cuesElements.push(li);
        li.textContent = elem.nodeName.toLowerCase();
        if (elem.getAttribute('start')) {
          li.dataset.start = elem.getAttribute('start');
          li.dataset.end = elem.getAttribute('end');
          var span = document.createElement('span');
          span.dataset.start = elem.getAttribute('start');
          span.dataset.end = elem.getAttribute('end');
          span.innerHTML = ' (' + elem.getAttribute('start') + '&ndash;' +
                elem.getAttribute('end') + ')';
          li.appendChild(span);
        }
        ol.appendChild(li);
      });
      container.appendChild(fragment);
      console.log('Fired event: web-components-parsed');
      that.fire(
        'web-components-parsed',
        {
          webComponents: fragment
        }
      );
    });

    container.addEventListener('click', function(e) {
      console.log('Received event (container): click');
      var current = e.target;
      if (current === container) {
        return;
      }
      while (current.nodeName !== 'SPAN') {
        current = current.parentNode;
        if (current === container) {
          return;
        }
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

    // notify listeners about your existance
    setTimeout(function() {
      console.log('Fired event: web-components-toc-ready');
      that.fire('web-components-toc-ready');
    }, 250);
  }
});