# example-of-my-work

Mock-up component similar to one I created for my company.  
 
It is googleMap component for Vix-like site builder. 
Users can include as many of map components as they like which created some interesting situations: 
- googleMap API script will not be included on index.html if at least one of the components isn't mounted 
- script starts loading(only once) as soon as first component is mounted, but I couldn't be certain if script would execute before or after last of the map components are mounted and I preferred not to use Redux for triggering map initializations since I wanted to speedup loading time of the site. Solution was to store init functions into array for components that mounted before script was loaded, and pass that array into script callback.
 
Dragging markers over map causes form in the parent component to be updated with exact address of marker position, also data given by back-end didn't provide me with any location id,locations may have same titles, addresses and coordinates between themselves.  
So I got array of locations with nothing to distinct them save for position, which I had to pair-up with markers. If a marker is dragged application must search for the location that doesn't have corresponding marker in order to update locations address and whereabouts.  
 
All in all very small component, stateless and redux-dumb, but interesting for execution. 

