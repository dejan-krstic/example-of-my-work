import React, { Component } from 'react';
import AppLoader from '../shared-components/app-loader/app-loader.js';
import { store, service, getDeviceClass, getStyle, element, elementid, editor } from './aps-element.js';

export default class APPLocationMap extends Component {

  constructor(props) {
    super(props);

    this.markers = [];

    if (window.__googleMapsLoaded) {
      return;
    }
    window.__initGoogleMapsCallbacks = window.__initGoogleMapsCallbacks || [];          // Pushing dataChanged functions from all app-locationmap components 
    window.__initGoogleMapsCallbacks.push(() => this.dataChanged(this.props.data));    // into array that will be executed once google maps script is loaded
    if (window.__initGoogleMaps) {
      return;
    }
    window.__initGoogleMaps = () => {
      window.__googleMapsLoaded = true;                  // once script is loaded window.__googleMapsLoaded ensures that dataChanged 
      window.__initGoogleMapsCallbacks.map(f => f());   // will no longer be pushed into array but executed in getDerivedStateFromProps
      delete window.__initGoogleMapsCallbacks;
      delete window.__initGoogleMaps;
    };
    const script = document.createElement('script');
    script.setAttribute('src', 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDcaJ-OujSU1yurhcgo5aeI0dx-5SUkkTo&callback=__initGoogleMaps');
    document.body.appendChild(script);
  }

  static getDerivedStateFromProps(nextProps) {
      const { data, device, classes } = nextProps;  
      this.dataChanged(data);
      this.deviceClassesChanged(device, classes);
  }

  markerChanged(marker) {
    if (this._setElementDataHandle) {
      clearTimeout(this._setElementDataHandle);
    }
    this._setElementDataHandle = setTimeout(() => this.setElementData(marker), 0, marker);
  }

  setElementData(marker) {
    if (!this.props.data || !this.props.data.locations || !this.props.data.locations.length || !marker) {
      return;
    }
    const locations = [...this.props.data.locations]
      , latitude = marker.getPosition().lat()
      , longitude = marker.getPosition().lng()
      , index = locations.findIndex(location => !this.markers.find(marker =>     // finding the location which marker has been moved 
        location.latitude - marker.getPosition().lat() < 0.0001 && location.longitude - marker.getPosition().lng() < 0.001));   // back-end didn't provide with any location id
      if (index === -1 || (locations[index].latitude === latitude && locations[index].longitude === longitude)) {
      return;
    }
    locations[index] = {
      ...locations[index],
      latitude,
      longitude
    };
    this.geocodeMarkerPosition(latitude, longitude);
    store.dispatch({
      type: 'PUSH_UNDO',
      data: {
        elementid: element.elementid,
        data: element.data
      }
    });
    store.dispatch({
      type: 'SET_ELEMENT',
      data: {...element, { data: {...this.props.data, { locations } } } }
    });
    service('data.updateElement', { 
      elementid: elementid,
      data: this.props.data
    });
  }

  geocodeMarkerPosition(lat, lng) {
    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder;
    }
    const location = {}
    this.geocoder.geocode({
      latLng: { lat, lng }
    }, (response, status) => {
      if (response && status === 'OK') {
        var street_number = (response[0].address_components.find(e => e.types.includes('street_number')) || {}).short_name;
        var address = ((response[0].address_components.find(e => e.types.includes('route') || response[0].address_components.find(e => e.types.includes('neighborhood')) || {}).long_name || '') + (street_number ? ', ' + street_number : '');
        location.address =  address || null;
        location.locality = response[0].address_components.find(e => e.types.includes('locality') || response[0].address_components.find(e => e.types.includes('administrative_area_level_3')) || {}).long_name || null;
        location.administrativeArea =  response[0].address_components.find(e => e.types.includes('administrative_area_level_2')) || {}).short_name || null;
        location.country = response[0].address_components.find(e => e.types.includes('country')) || {}).short_name || null;
        location.postalCode = response[0].address_components.find(e => e.types.includes('postal_code')) || {}).short_name || null;
        
        store.dispatch({
          type: 'SET_LOCATION',
          location
        });
      } else if (status === 'ZERO_RESULTS') {
        store.dispatch('ALERT_MESSAGE', {
          type: 'error',
          text: localize('cannot_determine_address')
        });
      }
    });
  }

  deviceClassesChanged(device, classes) {
    this.setAttribute('class', ['col-md-12', getDeviceClass(classes, device, 'width')].join(' '));
    if (this.googleMap) {
      google.maps.event.trigger(this.googleMap, 'resize');
    }
  }

  getLabel(name) {
    return name.charAt(0).toUpperCase();
  }

  isDragable(location) {
    return !editor ? false : !location || !location.locationid ? true : false;
  }

  dataChanged(data) {
    if (!data || !data.locations || !window.__googleMapsLoaded) {
      return;
    }
    if (!this.googleMap) {
      this.googleMap = new google.maps.Map(this.$.googleMap);
    }
    if (data.locations.length !== this.markers.length) {
      this.markers.map(marker => marker.setMap(null));
      this.markers = [];
      data.locations.map(location => {
        let newMarker = new google.maps.Marker({
          icon: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi.png',  // Safary v11 has bug  with importing dynamic icons 
          map: this.googleMap,
          draggable: this.isDragable(location),
          position: { lat: location.latitude, lng: location.longitude },
          label: this.getLabel(location.locationName),
          animation: google.maps.Animation.DROP,
          title: location.locationName
        })
        if (newMarker.draggable) {
          newMarker.addListener('mouseup', () => this.markerChanged(newMarker));
        }
        this.markers.push(newMarker);
      })
    }
    var bounds = new google.maps.LatLngBounds();
    if (this.markers.length > 1) {
      this.markers.map(marker => bounds.extend(marker.getPosition()));
      this.googleMap.fitBounds(bounds);
    } else if (this.markers.length) {
      this.googleMap.setCenter(this.markers[0].getPosition());
      this.googleMap.setZoom(data.zoom);
    } else {
      this.googleMap.setCenter({
        lat: 45.46,
        lng: 9.19
      });
      this.googleMap.setZoom(data.zoom);
    }
  }

  render() {
      if (this.props.loaded) {
        return <AppLoader alt="Loading location map" active=""></AppLoader>
      } 
      return <div className={getDeviceClass(this.props.classes, this.props.device, 'margin', 'top-margin', 'bottom-margin', 'left-margin', 'right-margin', 'padding', 'top-padding', 'bottom-padding', 'left-padding', 'right-padding')} style={getStyle(styles, 'background')}>
              <div id="googleMap"></div>
            </div>
  }

}
