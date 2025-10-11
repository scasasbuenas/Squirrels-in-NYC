// Map Implementation  
// This will show the Central Park map with squirrel locations

let myMap, markersLayer;

function createMap(data, container) {
    console.log("Map - Data received:", data.length, "records");
    
    // Clear existing content - CSS will handle background image removal
    const containerElement = d3.select(container);
    containerElement.html("");
    
    // Create the map div - CSS will handle sizing and positioning
    containerElement
        .append("div")
        .attr("id", "squirrel-map");

    // More precise Central Park boundaries for perfect rectangular fit
    const southWest = L.latLng(40.764, -73.9812); // SW corner (adjusted for better fit)
    const northEast = L.latLng(40.8007, -73.9492); // NE corner (adjusted for better fit)
    const bounds = L.latLngBounds(southWest, northEast);
    
    // Wait a brief moment for the DOM to update, then initialize the map
    setTimeout(() => {
        // Initialize the map with Central Park perfectly fitted
        myMap = L.map('squirrel-map', {
            maxBounds: bounds,          // Restrict panning to Central Park only
            maxBoundsViscosity: 1.0,    // How "solid" the bounds are (1.0 = cannot leave bounds)
            minZoom: 14,                // Prevent zooming out beyond Central Park view
            maxZoom: 19,                // Allow detailed zoom in
            zoomControl: true,          // Keep zoom controls
            scrollWheelZoom: true,      // Allow mouse wheel zoom
            doubleClickZoom: true,      // Allow double-click zoom
            touchZoom: true,           // Allow touch rotate on mobile
            crs: L.CRS.EPSG3857         // Use standard web mercator projection
        });
        
        // Fit the map exactly to Central Park boundaries with perfect rectangular fit
        myMap.fitBounds(bounds, {
            padding: [0, 0],            // No padding for exact fit
            maxZoom: 15.5               // Optimal zoom level to show just Central Park
        });
        
        // Add map tiles - trying different providers for better rectangular fit
        // Option 1: Satellite imagery (often better aligned)
        // L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        //     attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        //     minZoom: 14,
        //     maxZoom: 19
        // }).addTo(myMap);
        
        // Option 2: CartoDB Positron (clean, minimal style)
        // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        //     minZoom: 14,
        //     maxZoom: 19
        // }).addTo(myMap);
        
        // Option 3: OpenStreetMap (original)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: 14,
            maxZoom: 19,
        }).addTo(myMap);
        
        // Option 4: Stamen Terrain (topographic style)
        // L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
        //     attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        //     minZoom: 14,
        //     maxZoom: 19
        // }).addTo(myMap);
        
        // Initialize a layer group for markers
        markersLayer = L.layerGroup().addTo(myMap);
        
        // Update the map with the provided data (which now includes coordinates from JSON)
        updateMapMarkers(data);
        
        // Force map to resize to fit container and maintain bounds
        myMap.invalidateSize();
        
        // Ensure perfect rectangular fit after everything loads
        setTimeout(() => {
            myMap.fitBounds(bounds, { 
                padding: [0, 0],
                maxZoom: 15.5
            });
        }, 150);
        
    }, 100);
}

function updateMap(data) {
    console.log("Updating Map with", data.length, "records");
    
    if (myMap && markersLayer) {
        // Update the map markers with the filtered data
        updateMapMarkers(data);
    }
}

function updateMapMarkers(data) {
    // Clear existing markers
    if (markersLayer) {
        markersLayer.clearLayers();
    }
    
    console.log("Processing", data.length, "squirrel records for map markers");
    
    let validMarkers = 0;
    let invalidCoords = 0;
    
    // Add markers for squirrel locations
    data.forEach((squirrel, index) => {
        // Fix coordinate format - remove extra periods that act as thousands separators
        let xStr = String(squirrel.X).replace(/\./g, '');
        let yStr = String(squirrel.Y).replace(/\./g, '');
        
        // Insert decimal point at the correct position for longitude (X) and latitude (Y)
        // Longitude: -739674285955293 -> -73.9674285955293
        // Latitude: 407829723919744 -> 40.7829723919744
        if (xStr.startsWith('-') && xStr.length > 3) {
            xStr = xStr.substring(0, 3) + '.' + xStr.substring(3);
        }
        if (yStr.length > 2) {
            yStr = yStr.substring(0, 2) + '.' + yStr.substring(2);
        }
        
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        
        // Debug first few coordinates
        if (index < 5) {
            console.log(`Squirrel ${index}: Original X="${squirrel.X}", Y="${squirrel.Y}" -> Parsed X=${x}, Y=${y}`);
        }
        
        if (!isNaN(x) && !isNaN(y) && x >= -74.1 && x <= -73.9 && y >= 40.7 && y <= 40.9) {
            // Create a marker with a popup
            const marker = L.circleMarker([y, x], {
                radius: 4,
                fillColor: getColorByActivity(squirrel),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            // Add a popup with information
            marker.bindPopup(`
                <b>Squirrel ID:</b> ${squirrel['Unique Squirrel ID'] || 'N/A'}<br>
                <b>Date:</b> ${squirrel.Date}<br>
                <b>Age:</b> ${squirrel.Age || 'Unknown'}<br>
                <b>Primary Fur Color:</b> ${squirrel['Primary Fur Color'] || 'Unknown'}<br>
                <b>Activity:</b> ${getActivityDescription(squirrel)}<br>
                <b>Hectare:</b> ${squirrel.Hectare}<br>
                <b>Shift:</b> ${squirrel.Shift}<br>
                <b>Coordinates:</b> ${y.toFixed(6)}, ${x.toFixed(6)}
            `);
            
            markersLayer.addLayer(marker);
            validMarkers++;
        } else {
            invalidCoords++;
            if (index < 10) {
                console.warn(`Invalid coordinates for squirrel ${index}: X=${x}, Y=${y}`);
            }
        }
    });
    
    console.log(`Map markers summary: ${validMarkers} valid markers added, ${invalidCoords} invalid coordinates skipped`);
}

// Helper function to determine marker color based on squirrel activity
function getColorByActivity(squirrel) {
    // Handle both boolean and string boolean values
    const isRunning = squirrel.Running === true || squirrel.Running === 'true' || squirrel.Running === 'TRUE';
    const isChasing = squirrel.Chasing === true || squirrel.Chasing === 'true' || squirrel.Chasing === 'TRUE';
    const isClimbing = squirrel.Climbing === true || squirrel.Climbing === 'true' || squirrel.Climbing === 'TRUE';
    const isEating = squirrel.Eating === true || squirrel.Eating === 'true' || squirrel.Eating === 'TRUE';
    const isForaging = squirrel.Foraging === true || squirrel.Foraging === 'true' || squirrel.Foraging === 'TRUE';
    
    if (isRunning) return "#ff4d4d";     // Red
    if (isChasing) return "#ff9900";     // Orange
    if (isClimbing) return "#33cc33";    // Green
    if (isEating) return "#3399ff";      // Blue
    if (isForaging) return "#9966ff";    // Purple
    return "#999999";  // Default gray
}

// Helper function to get activity description
function getActivityDescription(squirrel) {
    const activities = [];
    
    // Handle both boolean and string boolean values
    if (squirrel.Running === true || squirrel.Running === 'true' || squirrel.Running === 'TRUE') 
        activities.push("Running");
    if (squirrel.Chasing === true || squirrel.Chasing === 'true' || squirrel.Chasing === 'TRUE') 
        activities.push("Chasing");
    if (squirrel.Climbing === true || squirrel.Climbing === 'true' || squirrel.Climbing === 'TRUE') 
        activities.push("Climbing");
    if (squirrel.Eating === true || squirrel.Eating === 'true' || squirrel.Eating === 'TRUE') 
        activities.push("Eating");
    if (squirrel.Foraging === true || squirrel.Foraging === 'true' || squirrel.Foraging === 'TRUE') 
        activities.push("Foraging");
    
    return activities.length > 0 ? activities.join(", ") : "None recorded";
}