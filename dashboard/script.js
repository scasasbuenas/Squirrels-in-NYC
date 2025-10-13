// Global variables
let squirrelData = [];
let filteredData = [];

function init() {

    // Debugging Log
    console.log("Init function called");

    // Add event listener for the butterfly scale toggle
    const toggle = document.getElementById("butterfly-scale-toggle");  
    if (toggle) {
        toggle.checked = true;   
        // Initialize the chart accordingly
        ButterflyChartModule.toggleScale(false); 
        toggle.addEventListener("change", (e) => {
            const isPerColor = e.target.checked;
            ButterflyChartModule.toggleScale(!isPerColor);
        });
        console.log("Toggle event listener added");
    } else {
        console.warn("Toggle element not found in DOM");
    }
    
    // Load the cleaned merged squirrel data first
    fetch("./data/squirrel_data.json")
        .then(response => response.text())
        .then(text => {
            // Clean the JSON by replacing NaN with null
            const cleanedText = text.replace(/:\s*NaN/g, ': null');
            return JSON.parse(cleanedText);
        })
        .then(function(data) {
            console.log("Data loaded:", data.length, "records");
            
            // Store the data globally
            squirrelData = data;
            filteredData = data;
            
            // Now initialize filters after data is loaded
            console.log("FilterModule is available:", typeof FilterModule);

            if (typeof FilterModule === 'undefined') {
                console.error("FilterModule is not defined. Make sure filters.js is loaded.");
                return;
            }

            try {
                FilterModule.initializeFilters(onFiltersChanged);
                console.log("Filter init completed successfully");
            } catch (error) {
                console.error("Error initializing filters:", error);
            }
        
            // Create visualizations
            LineChartModule.createLineChart(squirrelData, ".LineChart");
            ButterflyChartModule.createButterflyChart(squirrelData, ".ButterflyChart");
        })
        .catch(function(error) {
            console.error("Error loading data:", error);
        });
    fetch("./data/squirrels.geojson")
        .then(res => res.text())
        .then(text => {
            // Replace NaN or Infinity (any standalone) with null
            const cleanedText = text.replace(/\b(NaN|Infinity|-Infinity)\b/g, 'null');
            return JSON.parse(cleanedText);
        })
        .then(geojsonData => {
            MapModule.createMap(geojsonData, ".Map"); // initialize map
        })
        .catch(err => console.error("Error loading GeoJSON:", err));

}

function onFiltersChanged() {
    // Apply filters to the original data
    filteredData = FilterModule.applyFilters(squirrelData);
    
    console.log(`Filters changed: ${filteredData.length} records out of ${squirrelData.length} total`);
    console.log('Current filters:', FilterModule.getCurrentFilters());
    
    // Update all visualizations with the filtered data
    updateVisualizations();
}

function updateVisualizations() {
    console.log("Updating visualizations with", filteredData.length, "records");
    
    // Update line chart (it handles its own filtering logic)
    LineChartModule.updateLineChart(squirrelData);
    
    // Update other visualizations with filtered data
    ButterflyChartModule.updateButterflyChart(squirrelData);
}

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init);


