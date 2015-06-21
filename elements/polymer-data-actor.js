'use strict';

Polymer({
  is: 'polymer-data-actor',

  properties: {
    start: {
      type: Number
    },
    end: {
      type: Number
    },
    name: {
      type: String
    },
    xywh: {
      type: String
    },
    url: {
      type: String
    }
  },

  created: function() {
  },

  ready: function() {
    var that = this;
    var container = that.$.container;
    if (that.url && that.name) {
      container.innerHTML = '<a target="_blank" href="' + that.url + '">' +
          that.name + '</a>';
    } else if (that.name) {
      container.innerHTML = that.name;
    } else if (that.url) {
      container.innerHTML = that.url;
    }

    document.addEventListener('hypervideo-loaded-metadata', function(e) {
      console.log('Received event (document): hypervideo-loaded-metadata');
      var data = e.detail;
      if (that.xywh && /\d+,\d+,\d+,\d+/.test(that.xywh)) {
        var components = that.xywh.split(',');
        var xywh = document.createElement('div');
        container.appendChild(xywh);
        xywh.classList.add('xywh');
        var offsetLeft = data.actorsOffset.left;
        var offsetTop = data.actorsOffset.top;
        xywh.style.left = (components[0] - offsetLeft) + 'px';
        xywh.style.top = (components[1] - offsetTop) + 'px';
        xywh.style.width = components[2] + 'px';
        xywh.style.height = components[3] + 'px';
      }
    });

    // @todo: this should be handled by the parent
    document.addEventListener('hypervideo-time-update', function(e) {
      // console.log('Received event (document): hypervideo-time-update');
      that.currentTime = e.detail.currentTime;
      if ((that.start <= that.currentTime) &&
          (that.currentTime < that.end)) {
        that.style.display = 'block';
      } else {
        that.style.display = 'none';
      }
    });
  }
});