// Line Chart Module for Squirrel Activity vs Temperature - Production Version
const LineChartModule = (function() {

    // Color scale for different activities
    const colorScale = d3.scaleOrdinal()
        .domain(['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78']);

    let lastContainerSelector = null;
    let xDomainGlobal = null;
    let yDomainGlobal = null;
    let currentXDomain = null;
    let currentYDomain = null; // <-- NEW: To store Y-axis zoom state

    function createLineChart(originalData, containerSelector) {
        lastContainerSelector = containerSelector;
        const container = d3.select(containerSelector);

        if (container.empty()) {
            console.warn("Container not found:", containerSelector);
            return;
        }

        container.selectAll("*").remove();
        container.style("position", "relative");

        const width = container.node().offsetWidth || window.innerWidth;
        const height = container.node().offsetHeight || 500;

        const margin = { top: 20, right: 100, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const tooltip = container.append("div")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid black")
            .style("padding", "5px 10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        const highlightedActivities = getHighlightedActivities();
        const filteredData = applyNonBehaviorFilters(originalData);

        const allActivities = [
            'Running', 'Climbing', 'Chasing', 'Eating', 'Foraging',
            'Kuks', 'Quaas', 'Tail flags', 'Tail twitches',
            'Approaches', 'Indifferent', 'Runs from'
        ];

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

        // --- FIXED SCALE DOMAINS ---
        if (!xDomainGlobal) {
            const allTemps = originalData
                .map(d => Math.round(d['Weather']))
                .filter(v => !isNaN(v));
            xDomainGlobal = d3.extent(allTemps);
        }

        if (!yDomainGlobal) {
            const allProcessed = processDataForChart(originalData, allActivities);
            const maxActivityValueGlobal = d3.max(allProcessed, d =>
                d3.max(Object.values(d.activities))
            );
            yDomainGlobal = [0, Math.max(1, maxActivityValueGlobal || 1)];
        }

        // Define scales
        const xScale = d3.scaleLinear()
            .domain(currentXDomain || xDomainGlobal)
            .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
            .domain(currentYDomain || yDomainGlobal) // <-- MODIFIED: Use currentYDomain
            .range([chartHeight, 0]);

        // === clip path ===
        const clip = chart.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("x", 0)
            .attr("y", 0);

        // === brush ===
        const brush = d3.brushX()
            .extent([[0, 0], [chartWidth, chartHeight]])
            .on("end", updateChart);

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.temperature))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // X-axis
        const xAxis = chart.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale));

        // Store scale for persistence
        xAxis.node().__scale__ = xScale;

        xAxis.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Temperature (°F)");

        // Y-axis
        const yAxis = chart.append("g") // <-- MODIFIED: gave it a variable
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));
        
        yAxis.node().__scale__ = yScale; // <-- NEW: Store scale

        yAxis.append("text") // <-- MODIFIED: Appended to yAxis
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -chartHeight / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Activity Count (Frequency)");

        // Main group with clipping
        const lineGroup = chart.append("g")
            .attr("clip-path", "url(#clip)");

        // append brush inside clipped area
        lineGroup.append("g")
            .attr("class", "brush")
            .call(brush);

        // Draw lines & dots
        allActivities.forEach(activity => {
            const lineData = processedData.map(d => ({
                temperature: d.temperature,
                value: d.activities[activity] || 0
            }));

            const isHighlighted = highlightedActivities.includes(activity);
            const hasAnyFilters = highlightedActivities.length < allActivities.length;

            const activityGroup = lineGroup.append("g").attr("class", `activity-group-${activity}`);

            // Line
            activityGroup.append("path")
                .datum(lineData)
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", colorScale(activity))
                .attr("stroke-width", 0.5)
                .attr("d", line)
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.9 : 0.1) : 0.8);

            // Dots
            activityGroup.selectAll(`.dot-${activity}`)
                .data(lineData)
                .enter().append("circle")
                .attr("class", `dot-${activity}`)
                .attr("cx", d => xScale(d.temperature))
                .attr("cy", d => yScale(d.value))
                .attr("r", 2)
                .attr("fill", colorScale(activity))
                .style("opacity", hasAnyFilters ? (isHighlighted ? 0.8 : 0.1) : 0.7)
                .on("mouseover", function(event, d) {
                    tooltip
                        .style("opacity", 1)
                        .html(`${activity}: ${d.value}<br/>Temperature: ${d.temperature}°F`);

                })
                .on("mousemove", function(event) {
                    const bounds = container.node().getBoundingClientRect();
                    tooltip
                        .style("left", (event.clientX - bounds.left + 10) + "px")
                        .style("top", (event.clientY - bounds.top - 20) + "px");
                })
                .on("mouseleave", function() {
                    tooltip.style("opacity", 0);
                });
        });

        // Legend (unchanged)
        const legend = chart.append("g").attr("transform", `translate(${chartWidth + 10}, 20)`);
        allActivities.forEach((activity, i) => {
            const isHighlighted = highlightedActivities.includes(activity);
            const hasAnyFilters = highlightedActivities.length < allActivities.length;

            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`)
                .style("cursor", "pointer")
                .on("click", () => {
                    FilterModule.toggleBehavior(activity);
                });

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

        // X-Axis Brush / Zoom handler
        function updateChart(event) {
            const extent = event && event.selection;
            if (!extent) return;

            const newDomain = [xScale.invert(extent[0]), xScale.invert(extent[1])];
            xScale.domain(newDomain);
            currentXDomain = newDomain;

            // update stored domain
            chart.select(".x-axis").node().__scale__ = xScale;

            lineGroup.select(".brush").call(brush.move, null);

            chart.select(".x-axis")
                .transition().duration(700)
                .call(d3.axisBottom(xScale));

            lineGroup.selectAll(".line")
                .transition().duration(700)
                .attr("d", d => line(d));

            lineGroup.selectAll("circle")
                .transition().duration(700)
                .attr("cx", d => xScale(d.temperature))
                .attr("cy", d => yScale(d.value));
        }

        // --- NEW: Y-Axis Zoom Handler (Mouse Wheel) ---
        function handleYZoom(event) {
            event.preventDefault(); // Stop page scrolling
            event.stopPropagation();

            const zoomFactor = 1.1;
            const [y0, y1] = yScale.domain(); // y0 is always 0
            let newY1;

            if (event.deltaY < 0) {
                // Zooming In (scroll up)
                newY1 = y1 / zoomFactor;
            } else {
                // Zooming Out (scroll down)
                newY1 = y1 * zoomFactor;
            }

            // Clamp zoom level:
            // Don't zoom in past 1
            // Don't zoom out past the global max
            newY1 = Math.max(1, Math.min(yDomainGlobal[1], newY1));
            
            if (newY1 === y1) return; // No change

            currentYDomain = [y0, newY1]; // Store the new zoom level
            yScale.domain(currentYDomain);
            
            // Store the new scale
            chart.select(".y-axis").node().__scale__ = yScale;

            // Update Y-axis with a quick transition
            chart.select(".y-axis")
                .transition().duration(100)
                .call(d3.axisLeft(yScale));

            // Update lines
            lineGroup.selectAll(".line")
                .transition().duration(100)
                .attr("d", d => line(d));

            // Update dots
            lineGroup.selectAll("circle")
                .transition().duration(100)
                .attr("cx", d => xScale(d.temperature)) // x remains the same
                .attr("cy", d => yScale(d.value));
    }

        // --- NEW: Attach wheel event listener ---
        chart.on("wheel.zoom", handleYZoom);


        // --- MODIFIED: Double-click resets BOTH axes ---
        chart.on("dblclick", function() {
            // Reset X-Axis
            currentXDomain = null;
            xScale.domain(xDomainGlobal);
            chart.select(".x-axis").node().__scale__ = xScale;

            chart.select(".x-axis")
                .transition().duration(700)
                .call(d3.axisBottom(xScale));

            // Reset Y-Axis (NEW)
            currentYDomain = null;
            yScale.domain(yDomainGlobal);
            chart.select(".y-axis").node().__scale__ = yScale;

            chart.select(".y-axis")
                .transition().duration(700)
                .call(d3.axisLeft(yScale));

            // Update visuals
            lineGroup.selectAll(".line")
                .transition().duration(700)
                .attr("d", d => line(d));

            lineGroup.selectAll("circle")
                .transition().duration(700)
                .attr("cx", d => xScale(d.temperature))
                .attr("cy", d => yScale(d.value));

            // Clear X-brush selection
            lineGroup.select(".brush").call(brush.move, null);
        });

        console.log("Line chart created successfully");
    }

    // --- Data Processing ---
    function processDataForChart(data, allActivities) {
        const temperatureGroups = {};
        data.forEach(record => {
            const weather = record['Weather'];
            if (weather != null && !isNaN(weather)) {
                const temp = Math.round(weather);
                if (!temperatureGroups[temp]) {
                    temperatureGroups[temp] = { temperature: temp, activities: {} };
                    allActivities.forEach(a => temperatureGroups[temp].activities[a] = 0);
                }
                allActivities.forEach(a => {
                    if (record[a] === true || record[a] === 1) temperatureGroups[temp].activities[a]++;
                });
            }
        });
        return Object.values(temperatureGroups).sort((a, b) => a.temperature - b.temperature);
    }

    // --- Highlight Filters ---
    function getHighlightedActivities() {
        if (typeof FilterModule !== 'undefined') {
            const behaviorFilters = (FilterModule.getCurrentFilters().behaviors || []);
            if (behaviorFilters.length === 0) return ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'];
            return behaviorFilters.map(f => f.split(':')[0])
                .filter(a => ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'].includes(a));
        }
        return ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'];
    }

    // --- Non-behavior Filters ---
    function applyNonBehaviorFilters(data) {
        if (typeof FilterModule === 'undefined') return data;
        const currentFilters = FilterModule.getCurrentFilters();
        let filtered = data.slice();

        if (currentFilters.colors?.length) {
            filtered = filtered.filter(r => currentFilters.colors.some(color => {
                const fur = r['Primary Fur Color']?.toLowerCase();
                return (color === 'gray' && fur === 'gray') ||
                       (color === 'cinnamon' && fur === 'cinnamon') ||
                       (color === 'black' && fur === 'black');
            }));
        }

        if (currentFilters.age?.length) {
            filtered = filtered.filter(r => currentFilters.age.some(f => {
                const [col, val] = f.split(':');
                return r[col] === val;
            }));
        }

        if (currentFilters.dogs) filtered = filtered.filter(r => r['Dogs'] > 0);

        return filtered;
    }

    function updateLineChart(originalData) {
        //if (lastContainerSelector) createLineChart(originalData, lastContainerSelector);
        if (!lastContainerSelector) return;
        const data = Array.isArray(originalData) ? originalData : [];
        d3.select(lastContainerSelector).selectAll("*").remove();
        createLineChart(data.length ? data : [] /* fall back to empty array */ , lastContainerSelector);
        
    }

    return { createLineChart, updateLineChart };

})();

window.LineChartModule = LineChartModule;
