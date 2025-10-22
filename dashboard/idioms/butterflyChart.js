const ButterflyChartModule = (function() {

    const allActivities = ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'];

    const colorScale = d3.scaleOrdinal()
        .domain(allActivities)
        .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78']);

    const furColors = ["Gray","Cinnamon","Black"];

    let lastContainerSelector = null;
    let originalProcessedByFur = null;
    let fixedMax = 1;
    let useAbsoluteScale = true;
    let lastData = null;

    function createButterflyChart(data, containerSelector) {
        data = data || lastData;
        if (!data) return;
        lastData = data;
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

        // Active fur colors from filters
        let activeColorSet = new Set();
        if (typeof FilterModule !== 'undefined') {
            const current = FilterModule.getCurrentFilters();
            if (current && current.colors && current.colors.length > 0) {
                activeColorSet = new Set(current.colors.map(c => String(c).toLowerCase()));
            }
        }

        const filteredDataByFur = {};
        const totalsByFur = {};
        furColors.forEach(fur => {
            const furData = filteredData.filter(r => (r["Primary Fur Color"]||"").trim().toLowerCase() === fur.toLowerCase());
            filteredDataByFur[fur] = processAMPMByActivity(furData, allActivities);
            totalsByFur[fur] = computeShiftTotalsForFur(furData);
        });

        // Calculate global max for percentage mode (across all fur colors)
        let globalPercentageMax = 5; // minimum
        if (!useAbsoluteScale) {
            let maxPct = 0;
            furColors.forEach(fur => {
                const processed = filteredDataByFur[fur];
                const totals = totalsByFur[fur];
                const amDen = Math.max(totals?.am || 0, 0);
                const pmDen = Math.max(totals?.pm || 0, 0);
                
                processed.forEach(row => {
                    const amPct = amDen ? (row.am / amDen) * 100 : 0;
                    const pmPct = pmDen ? (row.pm / pmDen) * 100 : 0;
                    maxPct = Math.max(maxPct, amPct, pmPct);
                });
            });
            globalPercentageMax = Math.ceil(maxPct / 5) * 5;
            if (globalPercentageMax === 0) globalPercentageMax = 5;
        }

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

        const chartWidthAvailable = width;
        const sectionWidth = chartWidthAvailable / furColors.length;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw each fur section
        furColors.forEach((fur, i) => {
            const original = originalProcessedByFur[fur];
            const filteredProcessed = filteredDataByFur[fur];
            const shiftTotals = totalsByFur[fur];
            if (!original) return;

            const isActiveColor = activeColorSet.size === 0 || activeColorSet.has(fur.toLowerCase());

            const group = svg.append("g")
                .attr("transform", `translate(${i*sectionWidth},0)`)
                .style("opacity", isActiveColor ? 1 : 0.15);

            drawSingleButterflySection(group, original, filteredProcessed, shiftTotals, sectionWidth, height, fur, highlightedActivities, tooltip, globalPercentageMax);
        });
    }

    function drawSingleButterflySection(svgGroup, originalProcessed, filteredProcessed, shiftTotals, totalWidth, totalHeight, furColor, highlightedActivities, tooltip, globalPercentageMax) {
        const margin = { top: 30, right: 10, bottom: 50, left: 10 };  
        const chartWidth = totalWidth - margin.left - margin.right;
        const chartHeight = totalHeight - margin.top - margin.bottom;

        const chart = svgGroup.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Title
        svgGroup.append("text")
            .attr("x", totalWidth / 2)
            .attr("y", margin.top / 1.5)
            .attr("text-anchor", "middle")
            .text(`${furColor} Squirrels`);

        const yScale = d3.scaleBand()
            .domain(allActivities)
            .range([0, chartHeight])
            .paddingInner(0.25)
            .paddingOuter(0.15);

        const hasAnyBehaviorFilters = highlightedActivities.length < allActivities.length;
        const barHeight = Math.max(10, yScale.bandwidth() / 1.6);

        const amDen = Math.max(shiftTotals?.am || 0, 0);
        const pmDen = Math.max(shiftTotals?.pm || 0, 0);

        // Calculate dynamic max for percentage mode
        let domainMax;
        if (useAbsoluteScale) {
            domainMax = fixedMax;
        } else {
            domainMax = globalPercentageMax; // Use the global max passed from parent
        }

        const labelOffset = 40;
        const zeroX = chartWidth / 2;
        const sideWidth = zeroX - labelOffset;

        const xLeft  = d3.scaleLinear().domain([0, domainMax]).range([sideWidth, 0]);
        const xRight = d3.scaleLinear().domain([0, domainMax]).range([0, sideWidth]);

        // Left (AM) axis
        chart.append("g")
            .attr("class", "x-axis-left")
            .attr("transform", `translate(${zeroX - labelOffset - sideWidth}, ${chartHeight})`)
            .call(d3.axisBottom(xLeft).ticks(4));

        // Right (PM) axis
        chart.append("g")
            .attr("class", "x-axis-right")
            .attr("transform", `translate(${zeroX + labelOffset}, ${chartHeight})`)
            .call(d3.axisBottom(xRight).ticks(4));

        // Activity labels in the middle
        chart.selectAll(".activity-label")
            .data(allActivities)
            .enter()
            .append("text")
            .attr("x", zeroX)
            .attr("y", d => yScale(d) + barHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "black")
            .style("font-size", "12px")
            .style("opacity", d =>
                hasAnyBehaviorFilters
                    ? (highlightedActivities.includes(d) ? 1 : 0.2)
                    : 1
            )
            .text(d => d)
            .on("click", function(event, d) {
                if (typeof FilterModule !== 'undefined') {
                    FilterModule.toggleBehavior(d);
                }
            });

        // Left line (start of AM)
        chart.append("line")
            .attr("x1", zeroX - labelOffset)
            .attr("x2", zeroX - labelOffset)
            .attr("y1", 0)
            .attr("y2", chartHeight)
            .attr("stroke", "#333");

        // Right line (start of PM)
        chart.append("line")
            .attr("x1", zeroX + labelOffset)
            .attr("x2", zeroX + labelOffset)
            .attr("y1", 0)
            .attr("y2", chartHeight)
            .attr("stroke", "#333");

        // Bars
        originalProcessed.forEach((row, idx) => {
            const y = yScale(row.activity);
            const isHighlighted = highlightedActivities.includes(row.activity);
            const baseOpacity = hasAnyBehaviorFilters ? (isHighlighted ? 0.95 : 0.35) : 0.85;
            const filteredRow = filteredProcessed ? filteredProcessed[idx] : { am: 0, pm: 0 };

            const amVal = useAbsoluteScale ? filteredRow.am : (amDen ? (filteredRow.am / amDen) * 100 : 0);
            const pmVal = useAbsoluteScale ? filteredRow.pm : (pmDen ? (filteredRow.pm / pmDen) * 100 : 0);

            // AM bar (left)
            const amWidth = xLeft(0) - xLeft(amVal);
            const amX = (zeroX - labelOffset) - amWidth;
            chart.append("rect")
                .attr("x", amX)
                .attr("y", y)
                .attr("width", amWidth)
                .attr("height", barHeight)
                .attr("fill", colorScale(row.activity))
                .style("opacity", baseOpacity)
                .on("mouseover", function(e) {
                    const pct = useAbsoluteScale ? "" : ` (${amDen ? amVal.toFixed(1) + "%" : "—"})`;
                    tooltip.style("opacity",1).html(`<strong>${row.activity}</strong><br/>AM: ${filteredRow.am}${pct}`);
                    d3.select(this)
                        .style("cursor", "pointer")
                        .style("stroke", "#333")
                        .style("stroke-width", "1.5px");
                })
                .on("mousemove", e => positionTooltip(e, svgGroup.node().parentNode, tooltip))
                .on("mouseleave", function() {
                    tooltip.style("opacity",0);
                    d3.select(this)
                        .style("stroke-width", null)
                        .style("stroke", null);
                })
                .on("click", () => {
                    if (typeof FilterModule !== 'undefined') {
                        FilterModule.toggleBehavior(row.activity);
                    }
                });

            // PM bar (right)
            const pmWidth = xRight(pmVal) - xRight(0);
            const pmX = (zeroX + labelOffset);
            chart.append("rect")
                .attr("x", pmX)
                .attr("y", y)
                .attr("width", pmWidth)
                .attr("height", barHeight)
                .attr("fill", colorScale(row.activity))
                .style("opacity", baseOpacity)
                .on("mouseover", function(e) {
                    const pct = useAbsoluteScale ? "" : ` (${pmDen ? pmVal.toFixed(1) + "%" : "—"})`;
                    tooltip.style("opacity",1).html(`<strong>${row.activity}</strong><br/>PM: ${filteredRow.pm}${pct}`);
                    d3.select(this)
                        .style("cursor", "pointer")
                        .style("stroke", "#333")
                        .style("stroke-width", "1.5px");
                })
                .on("mousemove", e => positionTooltip(e, svgGroup.node().parentNode, tooltip))
                .on("mouseleave", function() {
                    tooltip.style("opacity",0);
                    d3.select(this)
                        .style("stroke-width", null)
                        .style("stroke", null);
                })
                .on("click", () => {
                    if (typeof FilterModule !== 'undefined') {
                        FilterModule.toggleBehavior(row.activity);
                    }
                });
        });

        // AM/PM labels
        chart.append("text")
            .attr("x", zeroX - labelOffset - 5)
            .attr("y", chartHeight + 40)
            .attr("text-anchor", "end")
            .text("AM");

        chart.append("text")
            .attr("x", zeroX + labelOffset + 5)
            .attr("y", chartHeight + 40)
            .attr("text-anchor", "start")
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

    function computeShiftTotalsForFur(furData) {
        let am = 0, pm = 0;
        furData.forEach(r => {
            const s = String(r['Shift']).trim().toUpperCase();
            if (s === 'AM') am++;
            else if (s === 'PM') pm++;
        });
        return { am, pm };
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

    function toggleScale(isChecked) {
        if (typeof isChecked === 'boolean') {
            useAbsoluteScale = isChecked;
        } else {
            useAbsoluteScale = !useAbsoluteScale;
        }
        updateButterflyChart();
    }

    function updateButterflyChart(data) {
        const toUse = (data && data.length) ? data : lastData;
        if (lastContainerSelector && toUse) {
            d3.select(lastContainerSelector).selectAll("*").remove();
            createButterflyChart(toUse, lastContainerSelector);
            lastData = toUse;
        }
    }

    return { createButterflyChart, updateButterflyChart, toggleScale };

})();
window.ButterflyChartModule = ButterflyChartModule;