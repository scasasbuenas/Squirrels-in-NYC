// Line Chart Module for Squirrel Activity vs Temperature - Production Version
const LineChartModule = (function() {
    
    // Color scale for different activities
    const colorScale = d3.scaleOrdinal()
        .domain(['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78']);

    // Store last used container selector for updates
    let lastContainerSelector = null;
    
    function createLineChart(originalData, containerSelector) {
        console.log("Creating line chart with complete dataset:", originalData.length, "records");
        
        lastContainerSelector = containerSelector;
        const container = d3.select(containerSelector);

        if (container.empty()) {
            console.warn("Container not found:", containerSelector);
            return;
        }

        const width = container.node().offsetWidth || window.innerWidth;
        const height = container.node().offsetHeight || window.innerHeight;

        // Define margins
        const margin = { top: 20, right: 150, bottom: 50, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Clear any existing chart
        container.selectAll("*").remove();

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Get which activities should be highlighted (behavior filters only)
        const highlightedActivities = getHighlightedActivities();
        console.log("Activities to highlight:", highlightedActivities);
        
        // Apply non-behavior filters (color, dog, age) to the data
        const filteredData = applyNonBehaviorFilters(originalData);
        console.log("Data after non-behavior filtering:", filteredData.length, "records");
        
        // Always process with all activities for consistent scaling
        const allActivities = ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'];
        const processedData = processDataForChart(filteredData, allActivities);
        
        if (processedData.length === 0) {
            container.append("div")
                .style("text-align", "center")
                .style("padding", "50px")
                .text("No data available");
            return;
        }
        
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Create scales - always use all activities for consistent scaling
        const xScale = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d.temperature))
            .range([0, chartWidth]);
        
        const maxActivityValue = d3.max(processedData, d => {
            const allValues = Object.values(d.activities);
            return allValues.length > 0 ? d3.max(allValues) : 0;
        });
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(1, maxActivityValue || 1)])
            .range([chartHeight, 0]);
        
        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.temperature))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);
        
        // Add axes
        chart.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", chartWidth / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Temperature (°F)");
        
        chart.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -chartHeight / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Activity Count (Frequency)");
        
        // Draw lines for ALL activities with filtered dataset
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
            
            // Draw the line
            activityGroup.append("path")
                .datum(lineData)
                .attr("fill", "none")
                .attr("stroke", colorScale(activity))
                .attr("stroke-width", 2)
                .attr("d", line)
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.9 : 0.1) : 0.8);
            
            // Add dots for data points
            activityGroup.selectAll(`.dot-${activity}`)
                .data(lineData)
                .enter().append("circle")
                .attr("class", `dot-${activity}`)
                .attr("cx", d => xScale(d.temperature))
                .attr("cy", d => yScale(d.value))
                .attr("r", 3)
                .attr("fill", colorScale(activity))
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.8 : 0.1) : 0.7);
        });
        
        // Add legend
        const legend = chart.append("g")
            .attr("transform", `translate(${chartWidth + 10}, 20)`);
        
        allActivities.forEach((activity, i) => {
            const isHighlighted = highlightedActivities.includes(activity);
            const hasAnyFilters = highlightedActivities.length < allActivities.length;
            
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(activity))
                .style("opacity", hasAnyFilters ? (isHighlighted ? 1.0 : 0.1) : 1.0);
            
            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-size", "12px")
                .style("opacity", hasAnyFilters ? (isHighlighted ? 1.0 : 0.1) : 1.0)
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
            const weather = record['Weather'];
            if (weather !== null && weather !== undefined && !isNaN(weather)) {
                const temp = Math.round(weather);
                
                if (!temperatureGroups[temp]) {
                    temperatureGroups[temp] = {
                        temperature: temp,
                        activities: {}
                    };
                    
                    // Initialize all activities to 0
                    allActivities.forEach(activity => {
                        temperatureGroups[temp].activities[activity] = 0;
                    });
                }
                
                // Count activities for this temperature
                allActivities.forEach(activity => {
                    if (record[activity] === true || record[activity] === 1) {
                        temperatureGroups[temp].activities[activity]++;
                    }
                });
                
                validRecords++;
            }
        });
        
        // Convert to array and sort by temperature
        const result = Object.values(temperatureGroups).sort((a, b) => a.temperature - b.temperature);
        
        console.log(`Processed ${validRecords} valid weather records into ${result.length} temperature points`);
        console.log("Temperature range:", result.length > 0 ? `${result[0].temperature}°F to ${result[result.length-1].temperature}°F` : "No data");
        
        return result;
    }
    
    function getHighlightedActivities() {
        // Only use behavior filters for highlighting, ignore color/dog/age filters
        if (typeof FilterModule !== 'undefined') {
            const currentFilters = FilterModule.getCurrentFilters();
            const behaviorFilters = currentFilters.behaviors || [];
            
            if (behaviorFilters.length === 0) {
                // No behavior filters = show all activities normally
                return ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'];
            } else {
                // Extract activity names from behavior filters
                const highlighted = behaviorFilters
                    .map(filter => filter.split(':')[0])
                    .filter(activity => ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'].includes(activity));
                
                return highlighted;
            }
        }
        
        return ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'];
    }
    
    function applyNonBehaviorFilters(data) {
        // Apply color, dog, and age filters to the data (not behavior filters)
        if (typeof FilterModule === 'undefined') {
            return data;
        }
        
        const currentFilters = FilterModule.getCurrentFilters();
        let filtered = data.slice(); // Create a copy
        
        // Apply color filters (OR logic for colors)
        if (currentFilters.colors && currentFilters.colors.length > 0) {
            filtered = filtered.filter(record => {
                const furColor = record['Primary Fur Color'];
                if (!furColor) return false;
                
                return Array.from(currentFilters.colors).some(color => {
                    switch(color) {
                        case 'gray': return furColor.toLowerCase() === 'gray';
                        case 'cinnamon': return furColor.toLowerCase() === 'cinnamon';
                        case 'black': return furColor.toLowerCase() === 'black';
                        default: return false;
                    }
                });
            });
        }
        
        // Apply age filters (OR logic for age values)
        if (currentFilters.age && currentFilters.age.length > 0) {
            filtered = filtered.filter(record => {
                return Array.from(currentFilters.age).some(filterKey => {
                    const [column, value] = filterKey.split(':');
                    return record[column] === value;
                });
            });
        }
        
        // Apply dog filter
        if (currentFilters.dogs) {
            filtered = filtered.filter(record => {
                return record['Dogs'] && record['Dogs'] > 0;
            });
        }
        
        console.log(`Line chart data: ${filtered.length} records (from ${data.length} original) after color/dog/age filtering`);
        return filtered;
    }
    
    function updateLineChart(originalData) {
        console.log("Updating line chart with complete dataset:", originalData.length, "records");
        if (lastContainerSelector) {
            createLineChart(originalData, lastContainerSelector);
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
