// Line Chart Module for Squirrel Activity vs Temperature
const LineChartModule = (function() {
    
    let chart = null;
    let container = null;
    
    // Chart dimensions and margins
    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Color scale for different activities
    const colorScale = d3.scaleOrdinal()
        .domain(['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2']);
    
    function createLineChart(originalData, containerSelector) {
        console.log("Creating line chart with complete dataset:", originalData.length, "records");
        
        container = d3.select(containerSelector);
        
        // Clear any existing chart
        container.selectAll("*").remove();
        
        // Get which activities should be highlighted (but don't filter data)
        const highlightedActivities = getHighlightedActivities();
        console.log("Activities to highlight:", highlightedActivities);
        
        // Always process the COMPLETE original dataset - no filtering!
        const allActivities = ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas'];
        const processedData = processDataForChart(originalData, allActivities);
        
        if (processedData.length === 0) {
            container.append("div")
                .style("text-align", "center")
                .style("padding", "50px")
                .text("No data available");
            return;
        }
        
        // Create SVG
        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
        
        chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Create scales - always use all activities for consistent scaling
        const xScale = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d.temperature))
            .range([0, width]);
        
        const maxActivityValue = d3.max(processedData, d => {
            // Use all activities for consistent Y-axis scaling
            const allValues = Object.values(d.activities);
            return allValues.length > 0 ? d3.max(allValues) : 0;
        });
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(1, maxActivityValue || 1)]) // Ensure minimum domain of 1
            .range([height, 0]);
        
        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.temperature))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);
        
        // Add axes
        chart.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Temperature (°F)");
        
        chart.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Activity Count");
        
        // Draw lines for ALL activities with complete dataset
        allActivities.forEach((activity, activityIndex) => {
            const lineData = processedData.map(d => ({
                temperature: d.temperature,
                value: d.activities[activity] || 0
            }));
            
            // Determine if this activity should be highlighted
            const isHighlighted = highlightedActivities.includes(activity);
            const hasAnyFilters = highlightedActivities.length < allActivities.length;
            
            console.log(`Drawing line for ${activity}: highlighted=${isHighlighted}`);
            
            // Create a group for this activity
            const activityGroup = chart.append("g")
                .attr("class", `activity-group-${activity}`);
            
            // Draw the line - highlight if selected, dim if not (when filters are active)
            activityGroup.append("path")
                .datum(lineData)
                .attr("fill", "none")
                .attr("stroke", colorScale(activity))
                .attr("stroke-width", 2)
                .attr("d", line)
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.9 : 0.2) : 0.8);
            
            // Add dots for data points
            activityGroup.selectAll(`.dot-${activity}`)
                .data(lineData)
                .enter().append("circle")
                .attr("class", `dot-${activity}`)
                .attr("cx", d => xScale(d.temperature))
                .attr("cy", d => yScale(d.value))
                .attr("r", 3)
                .attr("fill", colorScale(activity))
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.8 : 0.15) : 0.7);
        });
        
        // Add legend - always show all activities but dim non-active ones
        const legend = chart.append("g")
            .attr("transform", `translate(${width + 10}, 20)`);
        
        allActivities.forEach((activity, i) => {
            // Determine if this activity should be highlighted in legend
            const isHighlighted = highlightedActivities.includes(activity);
            const hasAnyFilters = highlightedActivities.length < allActivities.length;
            
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(activity))
                .style("opacity", hasAnyFilters ? (isHighlighted ? 1.0 : 0.3) : 1.0);
            
            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-size", "12px")
                .style("opacity", hasAnyFilters ? (isHighlighted ? 1.0 : 0.4) : 1.0)
                .style("font-weight", isHighlighted ? "bold" : "normal")
                .text(activity);
        });
        
        console.log("Line chart created successfully");
    }
    
    function processDataForChart(data, allActivities) {
        console.log("Processing data for chart...", data.length, "records");
        
        // Group data by temperature (rounded to nearest degree)
        const temperatureGroups = {};
        let validRecords = 0;
        
        data.forEach(record => {
            if (record.Weather && record.Weather !== null) {
                validRecords++;
                const temp = Math.round(record.Weather);
                
                if (!temperatureGroups[temp]) {
                    temperatureGroups[temp] = {
                        temperature: temp,
                        activities: {}
                    };
                    // Initialize ALL activities
                    allActivities.forEach(activity => {
                        temperatureGroups[temp].activities[activity] = 0;
                    });
                }
                
                // Count ALL activities at this temperature
                allActivities.forEach(activity => {
                    if (record[activity] === true) {
                        temperatureGroups[temp].activities[activity]++;
                    }
                });
            }
        });
        
        // Convert to array and sort by temperature
        const result = Object.values(temperatureGroups).sort((a, b) => a.temperature - b.temperature);
        
        console.log(`Processed ${validRecords} valid weather records into ${result.length} temperature points`);
        console.log("Temperature range:", result.length > 0 ? `${result[0].temperature}°F to ${result[result.length-1].temperature}°F` : "No data");
        
        return result;
    }
    
    function getHighlightedActivities() {
        // Simple logic: only highlight based on behavior filters
        // Ignore color and dog filters for line chart highlighting
        if (typeof FilterModule !== 'undefined') {
            const currentFilters = FilterModule.getCurrentFilters();
            const behaviorFilters = currentFilters.behaviors || [];
            
            if (behaviorFilters.length === 0) {
                // No behavior filters = show all activities normally
                return ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas'];
            } else {
                // Extract activity names from behavior filters
                const highlighted = behaviorFilters
                    .map(filter => filter.split(':')[0])
                    .filter(activity => ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas'].includes(activity));
                
                return highlighted;
            }
        }
        
        return ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas'];
    }
    
    function updateLineChart(originalData) {
        console.log("Updating line chart with complete dataset:", originalData.length, "records");
        if (container) {
            const containerElement = container.node();
            createLineChart(originalData, containerElement);
        } else {
            console.warn("Line chart container not found for update");
        }
    }
    
    return {
        createLineChart,
        updateLineChart
    };
})();

// Make available globally
window.LineChartModule = LineChartModule;