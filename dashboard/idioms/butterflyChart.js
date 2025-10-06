const ButterflyChartModule = (function() {

    const allActivities = ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'];

    const colorScale = d3.scaleOrdinal()
        .domain(allActivities)
        .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78']);

    const furColors = ["Gray","Cinnamon","Black"];

    let lastContainerSelector = null;
    let originalProcessedByFur = null; // Absolute counts for scale
    let fixedMax = 1; // Absolute max

    function createButterflyChart(data, containerSelector) {
    lastContainerSelector = containerSelector;
    const container = d3.select(containerSelector);
    if (container.empty()) return console.warn("Container not found:", containerSelector);

    container.selectAll("*").remove();
    container.style("position", "relative");

    // Compute absolute counts once for X scale
    if (!originalProcessedByFur) {
        originalProcessedByFur = computeOriginalProcessed(data);
        fixedMax = d3.max(Object.values(originalProcessedByFur).flat(), d => Math.max(d.am, d.pm)) || 1;
    }

    // Apply filters
    const filteredData = applyNonBehaviorFilters(data);
    const highlightedActivities = getHighlightedActivities();

    const filteredDataByFur = {};
    furColors.forEach(fur => {
        const furData = filteredData.filter(r => (r["Primary Fur Color"]||"").trim().toLowerCase() === fur.toLowerCase());
        filteredDataByFur[fur] = processAMPMByActivity(furData, allActivities);
    });

    // Tooltip
    const tooltip = container.append("div")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const width = container.node().offsetWidth || 900;
    const height = container.node().offsetHeight || 500;

    const legendWidth = 150;          // Reserve this width for the legend
    const chartWidthAvailable = width - legendWidth;
    const sectionWidth = chartWidthAvailable / furColors.length;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Draw each fur section
    furColors.forEach((fur, i) => {
        const original = originalProcessedByFur[fur];
        const filteredProcessed = filteredDataByFur[fur];
        if (!original) return;

        const group = svg.append("g")
            .attr("transform", `translate(${i*sectionWidth},0)`);

        drawSingleButterflySection(group, original, filteredProcessed, sectionWidth, height, fur, highlightedActivities, tooltip);
    });

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${chartWidthAvailable + 10}, 20)`);

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
}


    function drawSingleButterflySection(svgGroup, originalProcessed, filteredProcessed, totalWidth, totalHeight, furColor, highlightedActivities, tooltip) {
        const margin = { top: 30, right: 20, bottom: 40, left: 20 };
        const chartWidth = totalWidth - margin.left - margin.right;
        const chartHeight = totalHeight - margin.top - margin.bottom;

        const chart = svgGroup.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Title
        svgGroup.append("text")
            .attr("x", totalWidth / 2)
            .attr("y", margin.top / 1.5)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`${furColor} Squirrels`);

        // Scales
        const yScale = d3.scaleBand()
            .domain(allActivities)
            .range([0, chartHeight])
            .paddingInner(0.25)
            .paddingOuter(0.15);

        const xScale = d3.scaleLinear()
            .domain([-fixedMax, fixedMax]) // absolute scale
            .range([0, chartWidth]);

        const zeroX = xScale(0);

        // Center line
        chart.append("line")
            .attr("x1", zeroX)
            .attr("x2", zeroX)
            .attr("y1", 0)
            .attr("y2", chartHeight)
            .attr("stroke", "#333");

        const hasAnyBehaviorFilters = highlightedActivities.length < allActivities.length;
        const barHeight = Math.max(10, yScale.bandwidth()/1.6);

        // Bars
        originalProcessed.forEach((row, idx) => {
            const y = yScale(row.activity);

            // Behavior filter affects only opacity
            const isHighlighted = highlightedActivities.includes(row.activity);
            const baseOpacity = hasAnyBehaviorFilters ? (isHighlighted ? 0.95 : 0.1) : 0.85;

            // Bar lengths come from filtered counts (dog/age filters)
            const filteredRow = filteredProcessed ? filteredProcessed[idx] : { am: 0, pm: 0 };

            // AM bar
            chart.append("rect")
                .attr("x", Math.min(zeroX, xScale(-filteredRow.am)))
                .attr("y", y)
                .attr("width", Math.abs(xScale(0) - xScale(-filteredRow.am)))
                .attr("height", barHeight)
                .attr("fill", colorScale(row.activity))
                .style("opacity", baseOpacity)
                .on("mouseover", e => tooltip.style("opacity",1)
                    .html(`<strong>${row.activity}</strong><br/>AM: ${filteredRow.am}`))
                .on("mousemove", e => positionTooltip(e, svgGroup.node().parentNode, tooltip))
                .on("mouseleave", () => tooltip.style("opacity",0));

            // PM bar
            chart.append("rect")
                .attr("x", Math.min(zeroX, xScale(filteredRow.pm)))
                .attr("y", y)
                .attr("width", Math.abs(xScale(0) - xScale(filteredRow.pm)))
                .attr("height", barHeight)
                .attr("fill", colorScale(row.activity))
                .style("opacity", baseOpacity)
                .on("mouseover", e => tooltip.style("opacity",1)
                    .html(`<strong>${row.activity}</strong><br/>PM: ${filteredRow.pm}`))
                .on("mousemove", e => positionTooltip(e, svgGroup.node().parentNode, tooltip))
                .on("mouseleave", () => tooltip.style("opacity",0));
        });

        // AM/PM labels
        chart.append("text")
            .attr("x", zeroX - 40)
            .attr("y", chartHeight + 25)
            .attr("text-anchor", "end")
            .attr("fill", "black")
            .text("AM");

        chart.append("text")
            .attr("x", zeroX + 40)
            .attr("y", chartHeight + 25)
            .attr("text-anchor", "start")
            .attr("fill", "black")
            .text("PM");
    }

    function computeOriginalProcessed(data) {
        const processed = {};
        furColors.forEach(fur => {
            const furData = data.filter(r => (r["Primary Fur Color"]||"").trim().toLowerCase() === fur.toLowerCase());
            processed[fur] = processAMPMByActivity(furData, allActivities);
        });
        return processed;
    }

    function processAMPMByActivity(data, activities) {
        const counts = {};
        activities.forEach(a => counts[a] = { activity: a, am: 0, pm: 0 });
        data.forEach(r => {
            const shift = String(r['Shift']).trim().toUpperCase();
            activities.forEach(a => {
                if(r[a] === true || r[a] === 1) {
                    if(shift === 'AM') counts[a].am++;
                    else if(shift === 'PM') counts[a].pm++;
                }
            });
        });
        return Object.values(counts);
    }

    function getHighlightedActivities() {
        if (typeof FilterModule !== 'undefined') {
            const behaviorFilters = (FilterModule.getCurrentFilters().behaviors || []);
            if (behaviorFilters.length === 0) return allActivities.slice();
            return behaviorFilters.map(f => f.split(':')[0])
                .filter(a => allActivities.includes(a));
        }
        return allActivities.slice();
    }
    
    function applyNonBehaviorFilters(data) {
        if(typeof FilterModule === 'undefined') return data;
        const current = FilterModule.getCurrentFilters();
        let filtered = data.slice();

        if(current.age?.length) {
            filtered = filtered.filter(r => current.age.some(f => {
                const [col,val] = f.split(':');
                return r[col] === val;
            }));
        }
        if(current.dogs) filtered = filtered.filter(r => r['Dogs'] > 0);
        return filtered;
    }

    function positionTooltip(event, containerNode, tooltipSel) {
        const [mx,my] = d3.pointer(event, containerNode);
        tooltipSel.style("left", `${mx+12}px`).style("top", `${my+12}px`);
    }

    function updateButterflyChart(data) {
        if(lastContainerSelector) createButterflyChart(data, lastContainerSelector);
    }

    return { createButterflyChart, updateButterflyChart };

})();
window.ButterflyChartModule = ButterflyChartModule;
