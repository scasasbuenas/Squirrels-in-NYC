// Map Implementation using MapLibre GL JS with rotation
// This will show the Central Park map with squirrel locations, rotated 90 degrees

let myMap;

function createMap(data, container) {
    console.log("Map - Data received:", data.length, "records");
    
    // Clear existing content - CSS will handle background image removal
    const containerElement = d3.select(container);
    containerElement.html("");
    
    // Create the map div - CSS will handle sizing and positioning
    containerElement
        .append("div")
        .attr("id", "squirrel-map");

    // Initialize MapLibre GL JS map
    myMap = new maplibregl.Map({
        container: 'squirrel-map',
        style: 'https://api.maptiler.com/maps/openstreetmap/style.json?key=SETKEYBEFORERUNNING',
        center: [-73.9654, 40.78281],
        zoom: 14.4,
        bearing: 119,
        pitch: 0,
        preserveDrawingBuffer: false,
        antialias: false,
        fadeDuration: 0
    });

    // Wait for map to load before adding markers (Non-negotiable)
    myMap.on('load', () => {
        updateMapMarkers(data);
    });
}

function updateMap(data) {
    console.log("Updating Map with", data.length, "records");
    
    if (myMap && myMap.loaded()) {
        updateMapMarkers(data);
    }
}

function updateMapMarkers(data) {
    console.log("Processing", data.length, "squirrel records for map markers");
    
    let validMarkers = 0;
    let invalidCoords = 0;
    const features = [];
    
    // Show all squirrels (This is just a message that can be seen in console - part of my debuging)
    console.log(`Using all ${data.length} markers`);
    
    // Process data into GeoJSON features for efficient rendering (THIS IS THE PART THAT MAKES IT WORK FAST)
    data.forEach((squirrel, index) => {
        // Fix coordinate format - We had to remove extra periods that act as thousands separators
        let xStr = String(squirrel.X).replace(/\./g, '');
        let yStr = String(squirrel.Y).replace(/\./g, '');
        
        // EXPLANATION:
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
        
        if (index < 5) {
            console.log(`Squirrel ${index}: Original X="${squirrel.X}", Y="${squirrel.Y}" -> Parsed X=${x}, Y=${y}`);
        }
        
        if (!isNaN(x) && !isNaN(y) && x >= -74.1 && x <= -73.9 && y >= 40.7 && y <= 40.9) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [x, y]
                },
                properties: {
                    id: squirrel['Unique Squirrel ID'] || `squirrel-${index}`,
                    date: squirrel.Date,
                    age: squirrel.Age || 'Unknown',
                    furColor: squirrel['Primary Fur Color'] || 'Unknown',
                    activity: getActivityDescription(squirrel),
                    hectare: squirrel.Hectare,
                    shift: squirrel.Shift,
                    activityColor: getColorByActivity(squirrel),
                    // Activity flags for filtering
                    running: squirrel.Running === true || squirrel.Running === 'true' || squirrel.Running === 'TRUE',
                    chasing: squirrel.Chasing === true || squirrel.Chasing === 'true' || squirrel.Chasing === 'TRUE',
                    climbing: squirrel.Climbing === true || squirrel.Climbing === 'true' || squirrel.Climbing === 'TRUE',
                    eating: squirrel.Eating === true || squirrel.Eating === 'true' || squirrel.Eating === 'TRUE',
                    foraging: squirrel.Foraging === true || squirrel.Foraging === 'true' || squirrel.Foraging === 'TRUE'
                }
            });
            validMarkers++;
        } else {
            invalidCoords++;
            if (index < 10) {
                console.warn(`Invalid coordinates for squirrel ${index}: X=${x}, Y=${y}`);
            }
        }
    });
    
    // Create GeoJSON data source
    const geojsonData = {
        type: 'FeatureCollection',
        features: features
    };
    
    // Remove existing source and layer if they exist
    if (myMap.getSource('squirrels')) {
        myMap.removeLayer('squirrel-points');
        myMap.removeSource('squirrels');
    }
    
    // Add the data source
    myMap.addSource('squirrels', {
        type: 'geojson',
        data: geojsonData
    });
    
    // Add the layer with coloring based on activity
    myMap.addLayer({
        id: 'squirrel-points',
        type: 'circle',
        source: 'squirrels',
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 2,    // At zoom 14, radius is 2px
                16, 4,    // At zoom 16, radius is 4px
                18, 8    // At zoom 18, radius is 8px
            ],
            'circle-color': [
                'case',
                ['get', 'running'], '#ff4d4d',  
                ['get', 'chasing'], '#ff9900',   
                ['get', 'climbing'], '#33cc33', 
                ['get', 'eating'], '#3399ff',   
                ['get', 'foraging'], '#9966ff', 
                '#999999'  // Default gray
            ],
            'circle-stroke-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0.5,    // At zoom 14, stroke width is 0.5px
                16, 1,  // At zoom 16, stroke width is 1px
                18, 1.5     // At zoom 18, stroke width is 1.5px
            ],
            'circle-stroke-color': '#000000'
        }
    });
    
    // Add click event for popups
    myMap.on('click', 'squirrel-points', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        
        const popupContent = `
            <div style="font-size: 12px;">
                <b>Squirrel ID:</b> ${props.id}<br>
                <b>Date:</b> ${props.date}<br>
                <b>Age:</b> ${props.age}<br>
                <b>Primary Fur Color:</b> ${props.furColor}<br>
                <b>Activity:</b> ${props.activity}<br>
                <b>Hectare:</b> ${props.hectare}<br>
                <b>Shift:</b> ${props.shift}
            </div>
        `;
        
        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(myMap);
    });
    
    // Change the cursor to a pointer when the mouse is over the layer
    myMap.on('mouseenter', 'squirrel-points', () => {
        myMap.getCanvas().style.cursor = 'pointer';
    });
    
    // Change it back to a pointer when it leaves
    myMap.on('mouseleave', 'squirrel-points', () => {
        myMap.getCanvas().style.cursor = '';
    });
    
    console.log(`Map markers summary: ${validMarkers} valid markers added as efficient vector layer, ${invalidCoords} invalid coordinates skipped`);
}

// Helper function to determine marker color based on squirrel activity
// DONT REMOVE THE HELPER FUNCTIONS: They seem like repeated code but what they are used for data preparation.
function getColorByActivity(squirrel) {
    // Handle both boolean and string boolean values
    const isRunning = squirrel.Running === true || squirrel.Running === 'true' || squirrel.Running === 'TRUE';
    const isChasing = squirrel.Chasing === true || squirrel.Chasing === 'true' || squirrel.Chasing === 'TRUE';
    const isClimbing = squirrel.Climbing === true || squirrel.Climbing === 'true' || squirrel.Climbing === 'TRUE';
    const isEating = squirrel.Eating === true || squirrel.Eating === 'true' || squirrel.Eating === 'TRUE';
    const isForaging = squirrel.Foraging === true || squirrel.Foraging === 'true' || squirrel.Foraging === 'TRUE';
    
    if (isRunning) return "#ff4d4d";  
    if (isChasing) return "#ff9900";     
    if (isClimbing) return "#33cc33";   
    if (isEating) return "#3399ff";    
    if (isForaging) return "#9966ff";    
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