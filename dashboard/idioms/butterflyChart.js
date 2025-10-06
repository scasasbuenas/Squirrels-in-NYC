const ButterflyChartModule = (function() {

  const colorScale = d3.scaleOrdinal()
    .domain(['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'])
    .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78']);

  const allActivities = ['Running','Climbing','Chasing','Eating','Foraging','Kuks','Quaas','Tail flags','Tail twitches','Approaches','Indifferent','Runs from'];

  let fixedMax = null;
  let lastContainerSelector = null;

  // GLOBAL store of original counts for each fur color
  let originalProcessedByFur = null;

  function createButterflyChart(data, containerSelector) {
    lastContainerSelector = containerSelector;
    const container = d3.select(containerSelector);
    if (container.empty()) return console.warn("Container not found:", containerSelector);

    container.selectAll("*").remove();
    container.style("position", "relative");

    // Compute original processed counts once if not already done
    if (!originalProcessedByFur) {
      computeOriginalProcessed(data);
    }

    // Activity filters only affect opacity
    const highlightedActivities = getHighlightedActivities();

    const furColors = ["Gray","Cinnamon","Black"];
    const width  = container.node().offsetWidth || 900;
    const height = container.node().offsetHeight || 500;
    const sectionWidth = width / furColors.length;

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

    // Draw each fur color using ORIGINAL processed counts
    furColors.forEach((fur, i) => {
      const processed = originalProcessedByFur[fur];
      if (!processed || processed.length === 0) return;

      const group = svg.append("g")
        .attr("transform", `translate(${i*sectionWidth},0)`);

      drawSingleButterflySection(group, processed, sectionWidth, height, fur, highlightedActivities, tooltip);
    });
  }

  function computeOriginalProcessed(data) {
    const furColors = ["Gray","Cinnamon","Black"];
    originalProcessedByFur = {};
    furColors.forEach(fur => {
      const furData = data.filter(r => (r["Primary Fur Color"]||"").toLowerCase() === fur.toLowerCase());
      originalProcessedByFur[fur] = processAMPMByActivity(furData, allActivities);
    });
    fixedMax = d3.max(Object.values(originalProcessedByFur).flat(), d => Math.max(d.am,d.pm)) || 1;
  }

  function drawSingleButterflySection(svgGroup, processed, totalWidth, totalHeight, furColor, highlightedActivities, tooltip) {
    const margin = { top: 30, right: 20, bottom: 40, left: 20 };
    const chartWidth = totalWidth - margin.left - margin.right;
    const chartHeight = totalHeight - margin.top - margin.bottom;

    const chart = svgGroup.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svgGroup.append("text")
      .attr("x", totalWidth/2)
      .attr("y", margin.top/1.5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(`${furColor} Squirrels`);

    const yScale = d3.scaleBand()
      .domain(processed.map(d=>d.activity))
      .range([0, chartHeight])
      .paddingInner(0.25)
      .paddingOuter(0.15);

    const xScale = d3.scaleLinear()
      .domain([-fixedMax, fixedMax])
      .range([0, chartWidth]);

    const zeroX = xScale(0);
    chart.append("line")
      .attr("x1", zeroX)
      .attr("x2", zeroX)
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "#333");

    const hasAnyFilters = highlightedActivities.length < allActivities.length;
    const barHeight = Math.max(10, yScale.bandwidth()/1.6);

    processed.forEach(row => {
      const y = yScale(row.activity);
      const isHighlighted = highlightedActivities.includes(row.activity);
      const baseOpacity = hasAnyFilters ? (isHighlighted ? 0.95 : 0.35) : 0.85;

      // AM bar
      const amX1 = xScale(-row.am);
      chart.append("rect")
        .attr("x", Math.min(zeroX, amX1))
        .attr("y", y)
        .attr("width", Math.abs(zeroX - amX1))  // NEVER recalc width based on filters
        .attr("height", barHeight)
        .attr("fill", colorScale(row.activity))
        .style("opacity", baseOpacity)
        .on("mouseover", (e)=>tooltip.style("opacity",1).html(`<strong>${row.activity}</strong><br/>AM: ${row.am}`))
        .on("mousemove", (e)=>positionTooltip(e, svgGroup.node().parentNode, tooltip))
        .on("mouseleave", ()=>tooltip.style("opacity",0));

      // PM bar
      const pmX1 = xScale(row.pm);
      chart.append("rect")
        .attr("x", Math.min(zeroX, pmX1))
        .attr("y", y)
        .attr("width", Math.abs(zeroX - pmX1))  // NEVER recalc width based on filters
        .attr("height", barHeight)
        .attr("fill", colorScale(row.activity))
        .style("opacity", baseOpacity)
        .on("mouseover", (e)=>tooltip.style("opacity",1).html(`<strong>${row.activity}</strong><br/>PM: ${row.pm}`))
        .on("mousemove", (e)=>positionTooltip(e, svgGroup.node().parentNode, tooltip))
        .on("mouseleave", ()=>tooltip.style("opacity",0));
    });

    // Activity labels
    chart.selectAll(".activity-label")
      .data(processed)
      .enter()
      .append("text")
      .attr("class","activity-label")
      .attr("x", zeroX)
      .attr("y", d => yScale(d.activity) + barHeight/1.3)
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .style("font-size", "10px")
      .text(d => d.activity);

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

  function processAMPMByActivity(data, allActivities) {
    const counts = {};
    allActivities.forEach(a => counts[a] = { activity: a, am: 0, pm: 0 });
    data.forEach(r => {
      const shift = String(r['Shift']).trim().toUpperCase();
      allActivities.forEach(a => {
        if(r[a] === true || r[a] === 1) {
          if(shift === 'AM') counts[a].am++;
          else if(shift === 'PM') counts[a].pm++;
        }
      });
    });
    return Object.values(counts);
  }

  function applyNonBehaviorFilters(data) {
    if(typeof FilterModule === 'undefined') return data;
    const current = FilterModule.getCurrentFilters();
    let filtered = data.slice();

    if(current.colors?.length) {
      filtered = filtered.filter(r => current.colors.some(color => {
        const fur = (r['Primary Fur Color'] || '').toLowerCase();
        return (color === 'gray' && fur === 'gray') ||
               (color === 'cinnamon' && fur === 'cinnamon') ||
               (color === 'black' && fur === 'black');
      }));
    }
    if(current.age?.length) {
      filtered = filtered.filter(r => current.age.some(f => {
        const [col,val] = f.split(':');
        return r[col] === val;
      }));
    }
    if(current.dogs) filtered = filtered.filter(r => r['Dogs'] > 0);
    return filtered;
  }

  function getHighlightedActivities() {
    if(typeof FilterModule !== 'undefined') {
      const behaviorFilters = (FilterModule.getCurrentFilters().behaviors || []);
      if(behaviorFilters.length === 0) return allActivities.slice();
      return behaviorFilters.map(f => f.split(':')[0]).filter(a => allActivities.includes(a));
    }
    return allActivities.slice();
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
