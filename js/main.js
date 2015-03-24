/*global $, google, ajax_object, translate */
jQuery(function($) {

  /**
   * {} draw map global object
   */
  var drawManager;
  /**
   * {} Currect shape object
   */
  var currectShape;
  /**
   * poligon on write
   */
  var poligon;
  /**
   * poligonRemoved flag
   */
  var poligonRemoved;


  /**
   * Clear selection, Clear point data
   */
  function clearSelection() {
    if (currectShape) {
      currectShape.setEditable(false);
      currectShape = null;
      clearPointData();
      hidePanel();
    }
  }


  /**
   * Set Current shape object show panel, write point data
   * @param shape
   */
  function setSelection(shape) {
    clearSelection(shape);
    currectShape = shape;
    shape.setEditable(true);
    showPanel();
    setPointData(currectShape);
  }


  /**
   * Clear shape date from panel form
   */
  function clearPointData() {
    var obj = $('#object_form');
    obj.find('input[type="text"],textarea').each(function() {
      $(this).val('');
    });
  }

  /**
   * Set point Date information to form panel date
   * @param {object} p object google shape
   */
  function setPointData(p) {
    var points = getCoord(p);
    var info = p.get('info');
    var obj = $('#object_form');
    var emptyTime = '0000-00-00 00:00:00';
    var action = obj.find('input[name="action"]');
    var unlim = obj.find('input[name="unlim"]');
    obj.find('input[name="points"]').val(points);
    obj.find('input[name="id"]').val('');
    obj.find('input,textarea').each(function() {
      var name = $(this).attr('name');
      for (var t in info) {
        if (t == name) {
          if (name == 'start_time' || name == 'end_time') {
            if (info[name] === emptyTime) {
              $(this).val('');
            } else {
              $(this).val(convertDate(info[name]));
            }
          } else {
            $(this).val(info[name]);
          }
        }
      }
      //change action
      if (typeof info === 'undefined') {
        action.val('new_action');
      } else {
        action.val('edit_action');
      }

    });

    var block = $('.dateTimeWrapper-js');
    if (typeof info === 'undefined' ||
      (typeof info !== 'undefined' && info['start_time'] === emptyTime && info['end_time'] === emptyTime)) {
      unlim.val('1');
      unlim.attr('checked', true);
      block.hide();
    } else {
      unlim.val('0');
      unlim.attr('checked', false);
      block.show();
    }

  }


  /**
   * Convert mysql formate date to local format
   * 'yyyy-mm-dd hh:mm:ss' to 'dd.mm.yyyy hh:mm:ss'
   * @param date
   * @returns {string}
   */
  function convertDate(date) {
    if (typeof date === 'string') {
      return date.replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1');
    }
  }


  /**
   * Convert local format to mysql datetime format
   * 'dd.mm.yyyy hh:mm:ss' to 'yyyy-mm-dd hh:mm:ss'
   * @param date
   * @returns {string}
   */
  function convertDateMysqlFormat(date) {
    if (typeof date === 'string') {
      return date.replace(/^(\d{2}).(\d{2}).(\d{4})/, '$3-$2-$1') + ':00';
    }
  }


  /**
   * show panel information
   */
  function showPanel() {
    var panel = document.getElementById('panel');
    panel.style.display = 'block';
  }


  /**
   * hidden panel information
   */
  function hidePanel() {
    var panel = document.getElementById('panel');
    panel.style.display = 'none';
  }


  /**
   * delete Selected Shape on active map
   */
  function deleteSelectedShape() {
    if (currectShape) {
      currectShape.setMap(null);
      currectShape = null;
      drawManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      hidePanel();
    }
  }


  /**
   *
   * @param currectShape
   * @returns {Array}
   */
  function getCoord(currectShape) {
    var vertices = currectShape.getPath();
    var result = [];
    for (var i = 0; i < vertices.getLength(); i++) {
      var xy = vertices.getAt(i);
      var point = [xy.lat(), xy.lng()];
      result.push(point);
    }

    return result;
  }


  /**
   * init map
   */
  function initialize() {

    var map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true
    });

    var defaultGeo = new google.maps.LatLng(55.75222, 37.61556); //?

    // geolocation center
    if(typeof ajax_object !== 'undefined' && ajax_object.coord.length > 0){
      var coordConverted = convertCoord(ajax_object.coord);
      var coordAr = [];
      var coordSplit = coordConverted.split(',');
      for (var i = 0; i < coordSplit.length; i++) {
        var elem = coordSplit[i].split(' ');
        coordAr.push(new google.maps.LatLng(elem[0], elem[1]));
      }
      var centerPoligon  = new google.maps.Polygon({
        path: coordAr
      });
      map.setCenter(polygonCenter(centerPoligon));
    }
    else if (navigator.geolocation) {
      var showPosition = function(position) {
        map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude), 13);
      };
      navigator.geolocation.getCurrentPosition(showPosition, function() {
        map.setCenter(defaultGeo);
      });
    }
    else {
      // default city
      map.setCenter(defaultGeo);
    }

    var polyOptions = {
      strokeWeight: 0,
      fillOpacity: 0.45,
      editable: true
    };
    // method drawing
    // https://developers.google.com/maps/documentation/javascript/overlays?csw=1#drawing_tools
    drawManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      markerOptions: {
        draggable: true
      },
      polylineOptions: {
        editable: true
      },
      rectangleOptions: polyOptions,
      circleOptions: polyOptions,
      polygonOptions: polyOptions,
      map: map,
      drawingControlOptions: {
        // Editor panel to center
        position: google.maps.ControlPosition.TOP_CENTER,
        // types object on panel
        drawingModes: [
          //google.maps.drawing.OverlayType.CIRCLE,
          google.maps.drawing.OverlayType.POLYGON
          //google.maps.drawing.OverlayType.RECTANGLE
        ]
      }
    });

    // poligon draw complete
    google.maps.event.addListener(drawManager, 'overlaycomplete', function(e) {
      //showPanel();
      //check point limit
      var objLimit = e.overlay.getPath().getArray().length,
        tMessage = typeof translate !== 'undefined' ? translate.m_limit : 'Limit point on shape! Use less then ',
      message = tMessage + ajax_object.limit;

      if (objLimit > +ajax_object.limit) {
        alert(message);
        currectShape = e.overlay;
        deleteSelectedShape();
        return;
      }
      drawManager.setDrawingMode(null);
      var addShape = e.overlay;
      addShape.type = e.type;
      google.maps.event.addListener(addShape, 'click', function() {
        setSelection(addShape);
      });

      function pointUpdate(index) {
        var length = this.getArray().length;
        if (length > +ajax_object.limit) {
          alert(message);
          this.removeAt(index);
          return false;
        }
        setSelection(addShape);
      }

      google.maps.event.addListener(drawManager, 'polygoncomplete', function(e) {

        if (!poligonRemoved) {
          setSelection(addShape);
        } else {
          poligonRemoved = false;
        }
        google.maps.event.addListener(e.getPath(), 'set_at', pointUpdate);
        // change between point of poligon
        google.maps.event.addListener(e.getPath(), 'insert_at', pointUpdate);
        google.maps.event.addListener(e.getPath(), 'remove_at', function() {
          setSelection(addShape);
        });
      });
      poligon = e.overlay;
    });

    // Clear the current selection when the drawing mode is changed, or when the
    // map is clicked.
    google.maps.event.addListener(drawManager, 'drawingmode_changed', clearSelection);
    // click on map
    google.maps.event.addListener(map, 'click', clearSelection);
    // rightclick
    google.maps.event.addListener(map, 'rightclick', function(e) {
      poligon = e.overlay;
      drawManager.setDrawingMode(null);
      poligon.setMap(null);
      poligonRemoved = true;
      hidePanel();
      return false;
    });

    google.maps.event.addDomListener(document, 'keyup', function(e) {
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code === 27) {
        poligonRemoved = true;
        drawManager.setDrawingMode(null);
        poligon.setMap(null);
        hidePanel();
        return false;
      }
    });

    /**
     * get Center poligon
     * @param poly
     * @returns {google.maps.LatLng}
     */
    function polygonCenter(poly) {
      var lowx,
        highx,
        lowy,
        highy,
        lats = [],
        lngs = [],
        vertices = poly.getPath();

      for(var i=0; i<vertices.length; i++) {
        lngs.push(vertices.getAt(i).lng());
        lats.push(vertices.getAt(i).lat());
      }

      lats.sort();
      lngs.sort();
      lowx = lats[0];
      highx = lats[vertices.length - 1];
      lowy = lngs[0];
      highy = lngs[vertices.length - 1];
      center_x = lowx + ((highx-lowx) / 2);
      center_y = lowy + ((highy - lowy) / 2);
      return (new google.maps.LatLng(center_x, center_y));
    }

    /* Load poligons from user save data*/
    var newPolygons = [];
    var polygons = [];
    var infoData = [];
    for (var inc = 0, ii = user_points.length; inc < ii; inc++) {
      var newCoords = [];
      var point = convertCoord(user_points[inc].points);

      infoData[inc] = user_points[inc];
      delete user_points[inc].points;

      var objects = point.split(',');
      for (var i = 0; i < objects.length; i++) {
        var coord = objects[i].split(' ');
        newCoords.push(new google.maps.LatLng(coord[0], coord[1]));
      }

      /**
       * Random color
       * @returns {string}
       */
      function getRandomColor() {
        function c() {
          return Math.floor(Math.random() * 256).toString(16)
        }

        return "#" + c() + c() + c();
      }

      newPolygons[inc] = new google.maps.Polygon({
        path: newCoords,
        strokeWeight: 0,
        //fillColor: getRandomColor(),
        fillOpacity: 0.45
      });

      newPolygons[inc].set('info', infoData[inc]);
      newPolygons[inc].setMap(map);
      polygons.push(newPolygons[inc]);
      addNewPolys(newPolygons[inc]);
    }

    /**
     * convert coordinates WKT to pair lat, lon
     * @param pointString
     * @returns {*}
     */
    function convertCoord(pointString) {
      var point = pointString.match(/^POLYGON\(\((.*?)\)\)$/);
      return point[1];
    }

    /**
     * add new polygo on map event on click
     * @param newPoly
     */
    function addNewPolys(newPoly) {

      google.maps.event.addListener(newPoly, 'click', function() {

        var loadpointsLimit = newPoly.getPath().getArray().length,
          tMessage = typeof translate !== 'undefined' ? translate.m_limit : 'Limit point on shape! Use less then ',
          message = tMessage + ajax_object.limit;

        function pointUpdate(index) {
          var length = this.getArray().length;
          if (loadpointsLimit < +ajax_object.limit && length > +ajax_object.limit) {
            alert(message);
            currectShape = addShape;
            this.removeAt(index);
            return false;
          }
          setSelection(newPoly);
        }

        google.maps.event.addListener(newPoly.getPath(), 'set_at', pointUpdate);
        // change between point of poligon
        google.maps.event.addListener(newPoly.getPath(), 'insert_at', pointUpdate);
        google.maps.event.addListener(newPoly.getPath(), 'remove_at', function() {
          setSelection(newPoly);
        });
        setSelection(newPoly);
      });
    }

  }

  google.maps.event.addDomListener(window, 'load', initialize);

  var lang = ajax_object.lang;
  //datetime picker
  $(function() {
    $('#date_timepicker_start').datetimepicker({
      format: 'd.m.Y H:i',
      lang: lang ? lang : 'en',
      onShow: function() {
        var end = $('#date_timepicker_end');
        this.setOptions({
          maxDate: end.val() ? end.val() : false
        })
      },
      timepicker: true
    });
    $('#date_timepicker_end').datetimepicker({
      format: 'd.m.Y H:i',
      lang: lang ? lang : 'en',
      onShow: function() {
        var start = $('#date_timepicker_start');
        this.setOptions({
          minDate: start.val() ? start.val() : false
        })
      },
      timepicker: true
    });
  });


  /**
   * success event function manipulation
   * @param response
   * @param data URI string data send form
   */
  function responseData(response, data) {
    var message = '';
    if (response.state == 'success' && !response.error.length > 0) {
      hidePanel();
      switch (response.action) {
        case 'delete_action' :
          message = typeof translate !== 'undefined' ? translate.m_deleted : 'Deleted.';
          deleteSelectedShape();
          break;
        case 'edit_action' :
        case 'new_action' :
          message = typeof translate !== 'undefined' ? translate.m_save : 'Saved.';
          var infoData = deserialize(data);
          console.log(infoData);
          if (infoData.start_time) infoData.start_time = convertDateMysqlFormat(infoData.start_time);
          if (infoData.end_time) infoData.end_time = convertDateMysqlFormat(infoData.end_time);
          if (infoData.action == 'new_action') {
            infoData.id = response.data;
          }
          currectShape.set('info', infoData);
          break;
      }

      // clear form data point
      $('form').find('input[type="text"],textarea').val('');
    } else if (response.state == 'error' && response.error.length > 0) {
      showMessage(response, response.error[0]);
    }
    showMessage(response, message);
  }

  /**
   * Show message handler
   * @param response
   * @param message
   */
  function showMessage(response, message) {
    var infoBlock = $('.info-block');

    if (!response || response === '0') {
      var tMessage = typeof translate !== 'undefined' ? translate.m_error : 'Server error.';
      infoBlock.html(tMessage);
      infoBlock.css("visibility", "visible");
      if (!infoBlock.hasClass('error')) {
        infoBlock.addClass('error').removeClass('success');
      }
      setTimeout(function() {
        infoBlock.css("visibility", "hidden");
      }, 3000);
      return;
    }

    if (response.state === 'error') {
      infoBlock.html(response.error);
      infoBlock.css("visibility", "visible");
      if (!infoBlock.hasClass('error')) {
        infoBlock.addClass('error').removeClass('success');
      }
    } else if (response.state === 'success') {
      infoBlock.html(message);
      infoBlock.css("visibility", "visible");
      if (!infoBlock.hasClass('success')) {
        infoBlock.addClass('success').removeClass('error');
      }
    }
    setTimeout(function() {
      infoBlock.css("visibility", "hidden");
    }, 3000);
  }

  /**
   * URI to js object
   * @param queryString
   * @returns {{}}
   */
  function deserialize(queryString) {
    var obj = {};
    var pairs = queryString.split('&');
    for (var i in pairs) {
      if (pairs.hasOwnProperty(i)) {
        var split = pairs[i].split('=');
        var value = split[1];
        obj[decodeURIComponent(split[0])] = decodeURIComponent(value.replace(/\+/g, " "));
      }
    }
    return obj;
  }

  var failMessage = typeof translate !== 'undefined' ? translate.m_fail_error : 'Error save data on server. Try again leter.';

  // ajax save or change
  $('#save-button').click(function() {
    var form = $('#object_form');
    var data = form.serialize();
    $.post(ajax_object.ajax_url, data, function(response) {
      responseData(response, data);
    }).error(function() {
      alert(failMessage);
    });
  });


  // ajax remove
  $('#delete-button').click(function() {
    var form = $('#object_form');
    // check if element can id
    if (!form.find('input[name="id"]').val()) {
      deleteSelectedShape();
      return;
    }
    // set form delete action
    form.find('input[name="action"]').val('delete_action');
    $.post(ajax_object.ajax_url, form.serialize(), function(response) {
      responseData(response);
    }).error(function() {
      alert(failMessage);
    });
  });


  // toogle unlim
  $('input[name="unlim"]').change(function() {
    var block = $('.dateTimeWrapper-js');
    if (!this.checked) {
      block.fadeIn('fast');
      $(this).val('0');
    }
    else {
      block.fadeOut('fast');
      $(this).val('1');
      // clean inputs
      $('#date_timepicker_end').val('');
      $('#date_timepicker_start').val('');
    }
  });

  //delete element from table
  $('.wp-list-table').find('a.remove').click(function(e) {
    e.preventDefault();
    var cMessage = typeof translate !== 'undefined' ? translate : 'Your have delete?';
    if (confirm(cMessage)) {
      var id = $(this).attr('data-id');
      var data = {
        id: id,
        action: 'delete_action',
        token: ajax_object.nonce,
        user_id: ajax_object.user_id,
        type_object: 'poligon'
      };
      $.post(ajax_object.ajax_url, data, function(response) {
        if (response.state == 'success' && !response.error.length > 0) {
          var tMessage = typeof translate !== 'undefined' ? translate.m_row_delete : 'Row deleted!';
          alert(tMessage);
          location.reload()
        }
      }).error(function() {
        alert(failMessage);
      });
    }
  });


});