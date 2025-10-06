// Butterfly Chart Implementation
// This will show squirrel activity by fur color and time of day

const ButterflyChartModule = (function() {

    // Color scale for different activities
    const colorScale = d3.scaleOrdinal()
        .domain(['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78']);

    const allActivities = ['Running', 'Climbing', 'Chasing', 'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 'Indifferent', 'Runs from'];

    let lastContainerSelector = null;
    let fixedMax = null;


    function createButterflyChart(data, containerSelector) {
        console.log("Butterfly Chart - Data received:", data.length, "records");

        lastContainerSelector = containerSelector;

        const container = d3.select(containerSelector);

        if (container.empty()) {
            console.warn("Container not found:", containerSelector);
            return;
        }

        container.selectAll("*").remove();
        container.style("position", "relative"); // tooltip positioning relative to container
    

        const width  = container.node().offsetWidth  || window.innerWidth;
        const height = container.node().offsetHeight || 500;

        const margin = { top: 20, right: 140, bottom: 50, left: 140 };
        const chartWidth  = width  - margin.left - margin.right;
        const chartHeight = height - margin.top  - margin.bottom;

        const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

        // Tooltip
        const tooltip = container.append("div")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

        // Apply non-behavior filters (fur color, age, dogs) like line chart
        const filteredData = applyNonBehaviorFilters(data);
        const highlightedActivities = getHighlightedActivities();

        // Prepare AM/PM counts by activity
        const processed = processAMPMByActivity(filteredData, allActivities);

        if (processed.length === 0) {
            console.log("Butterfly chart: no data to display");
            return;
        }

        // Scales
        const yScale = d3.scaleBand()
            .domain(allActivities)
            .range([0, chartHeight])
            .paddingInner(0.25)
            .paddingOuter(0.15);
        
        // keep a fixed max for symmetry if set, otherwise compute from current data
        if (fixedMax === null) {
            if (window.squirrelData && Array.isArray(window.squirrelData)) {
                const fullCounts = processAMPMByActivity(window.squirrelData, allActivities);
                fixedMax = d3.max(fullCounts, d => Math.max(d.am, d.pm)) || 1;
            } else {
                // fallback: use the current processed if full data is not available
                fixedMax = d3.max(processed, d => Math.max(d.am, d.pm)) || 1;
            }
        }
        const maxVal = fixedMax;   

        //const maxVal = d3.max(processed, d => Math.max(d.am, d.pm)) || 1;

        // Use negative domain for AM (left) and positive for PM (right)
        const xScale = d3.scaleLinear()
            .domain([-maxVal, maxVal])
            .range([0, chartWidth]);

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Central zero axis
        const zeroX = xScale(0);
        chart.append("line")
        .attr("x1", zeroX).attr("x2", zeroX)
        .attr("y1", 0).attr("y2", chartHeight)
        .attr("stroke", "#333")
        .attr("stroke-width", 1);

        // Bottom axis with symmetric ticks
        chart.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => Math.abs(d)));

        // Axis labels
        chart.append("text")
        .attr("x", zeroX - 100)
        .attr("y", chartHeight + 35)
        .attr("text-anchor", "end")
        .attr("fill", "black")
        .text("AM");

        chart.append("text")
        .attr("x", zeroX + 100)
        .attr("y", chartHeight + 35)
        .attr("text-anchor", "start")
        .attr("fill", "black")
        .text("PM");

        // Activity labels (y-axis)
        const yAxis = d3.axisLeft(yScale).tickSize(0);
        chart.append("g")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px");

        // Bars group
        const barsGroup = chart.append("g");

        const hasAnyFilters = highlightedActivities.length < allActivities.length;

        // Draw bars per activity: left (AM, negative), right (PM, positive)
        processed.forEach(row => {
        const y = yScale(row.activity);
        const barHeight = Math.max(8, yScale.bandwidth() / 2.2); // visually balanced

        const isHighlighted = highlightedActivities.includes(row.activity);
        const baseOpacity = hasAnyFilters ? (isHighlighted ? 0.95 : 0.12) : 0.85;

        // Left bar (AM): from 0 to -am
        const amX0 = xScale(0);
        const amX1 = xScale(-row.am);
        const amWidth = Math.abs(amX1 - amX0);

        barsGroup.append("rect")
            .attr("x", Math.min(amX0, amX1))
            .attr("y", y + (yScale.bandwidth() - barHeight)/2)
            .attr("width", amWidth)
            .attr("height", barHeight)
            .attr("fill", colorScale(row.activity))
            .style("opacity", baseOpacity)
            .on("mouseover", (event) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${row.activity}</strong><br/>AM: ${row.am}`);
            })
            .on("mousemove", (event) => positionTooltip(event, container, tooltip))
            .on("mouseleave", () => tooltip.style("opacity", 0));

        // Right bar (PM): from 0 to +pm
        const pmX0 = xScale(0);
        const pmX1 = xScale(row.pm);
        const pmWidth = Math.abs(pmX1 - pmX0);

        barsGroup.append("rect")
            .attr("x", Math.min(pmX0, pmX1))
            .attr("y", y + (yScale.bandwidth() - barHeight)/2)
            .attr("width", pmWidth)
            .attr("height", barHeight)
            .attr("fill", colorScale(row.activity))
            .style("opacity", baseOpacity)
            .on("mouseover", (event) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${row.activity}</strong><br/>PM: ${row.pm}`);
            })
            .on("mousemove", (event) => positionTooltip(event, container, tooltip))
            .on("mouseleave", () => tooltip.style("opacity", 0));

        });

        // Legend (click to toggle behavior filter via FilterModule)
        const legend = chart.append("g").attr("transform", `translate(${chartWidth + 20}, 10)`);
        allActivities.forEach((activity, i) => {
        const isHighlighted = highlightedActivities.includes(activity);
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`)
            .style("cursor", "pointer")
            .on("click", () => {
            if (typeof FilterModule !== 'undefined' && FilterModule.toggleBehavior) {
                FilterModule.toggleBehavior(activity);
            }
            });

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", colorScale(activity))
            .style("opacity", hasAnyFilters ? (isHighlighted ? 1 : 0.12) : 1);

        row.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "12px")
            .style("opacity", hasAnyFilters ? (isHighlighted ? 1 : 0.25) : 1)
            .text(activity);
        });

        console.log("Butterfly chart created successfully");

    }

    // ---- helpers ----

    function updateButterflyChart(data) {
        if (lastContainerSelector) {
            createButterflyChart(data, lastContainerSelector);
        }
    }

    // Utility: tooltip positioning
    function positionTooltip(event, containerSel, tooltipSel) {
      const [mx, my] = d3.pointer(event, containerSel.node());
      tooltipSel
        .style("left", `${mx + 12}px`)
        .style("top", `${my + 12}px`);
    }

    function processAMPMByActivity(data, allActivities) {
        const counts = {};
        allActivities.forEach(a => counts[a] = { activity: a, am: 0, pm: 0 });

        data.forEach(r => {
            const shift = String(r['Shift']).trim().toUpperCase(); // "AM" or "PM"

            allActivities.forEach(a => {
            if (r[a] === true || r[a] === 1) {  // check if the activity is active
                if (shift === 'AM') counts[a].am++;
                else if (shift === 'PM') counts[a].pm++;
            }
            });
        });

        return Object.values(counts);
    }

    function getHighlightedActivities() {
        if (typeof FilterModule !== 'undefined') {
        const behaviorFilters = (FilterModule.getCurrentFilters().behaviors || []);
        if (behaviorFilters.length === 0) return allActivities.slice();
        return behaviorFilters
            .map(f => f.split(':')[0])
            .filter(a => allActivities.includes(a));
        }
        return allActivities.slice();
    }

  function applyNonBehaviorFilters(data) {
    if (typeof FilterModule === 'undefined') return data;
    const current = FilterModule.getCurrentFilters();
    let filtered = data.slice();

    if (current.colors?.length) {
      filtered = filtered.filter(r => current.colors.some(color => {
        const fur = r['Primary Fur Color']?.toLowerCase();
        return (color === 'gray' && fur === 'gray') ||
               (color === 'cinnamon' && fur === 'cinnamon') ||
               (color === 'black' && fur === 'black');
      }));
    }
    if (current.age?.length) {
      filtered = filtered.filter(r => current.age.some(f => {
        const [col, val] = f.split(':');
        return r[col] === val;
      }));
    }
    if (current.dogs) {
      filtered = filtered.filter(r => r['Dogs'] > 0);
    }
    return filtered;
  }

  return { createButterflyChart, updateButterflyChart };


})();

window.ButterflyChartModule = ButterflyChartModule;