const MapModule = (function() {

    let lastContainerSelector = null;
    let lastData = null;
    let currentTransform = d3.zoomIdentity;
    let zoom = null;
    let brushLayer = null;
    let mapBrush = null;
    let svg = null;
    let brushMode = false;

    const furColors = {
        gray: "#808080",
        black: "#000000",
        cinnamon: "#d2691e"
    };

    const allActivities = [
        'running', 'climbing', 'chasing', 'eating', 'foraging',
        'kuks', 'quaas', 'tail flags', 'tail twitches',
        'approaches', 'indifferent', 'runs from'
    ];

    const colorScale = d3.scaleOrdinal()
        .domain(allActivities)
        .range(['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b',
                '#e377c2','#7f7f7f','#bcbd22','#17becf','#aec7e8','#ffbb78']);

    const baseRadius = 4.2;
    const baseStroke = 0.3;

    function getColorByFur(fur) {
        return furColors[fur?.toLowerCase()] || "#999999";
    }

    function geoToScreen(lon, lat, width, height) {
        const geoTL = [-73.981807, 40.768107];
        const geoTR = [-73.958198, 40.800565];
        const geoBL = [-73.973071, 40.764324];

        const image_height = height;
        const image_width = (3024 * image_height) / 649;

        const screenTL = [(width - image_width) / 2 + 5, 7];
        const screenTR = [(width - image_width) / 2 + image_width - 5, 7];
        const screenBL = [(width - image_width) / 2, image_height - 7];

        const geoVecX = [geoTR[0] - geoTL[0], geoTR[1] - geoTL[1]];
        const geoVecY = [geoBL[0] - geoTL[0], geoBL[1] - geoTL[1]];

        const dx = lon - geoTL[0];
        const dy = lat - geoTL[1];

        const det = geoVecX[0]*geoVecY[1] - geoVecY[0]*geoVecX[1];
        const a = (dx*geoVecY[1] - dy*geoVecY[0]) / det;
        const b = (dy*geoVecX[0] - dx*geoVecX[1]) / det;

        const x = screenTL[0] + a * (screenTR[0] - screenTL[0]) + b * (screenBL[0] - screenTL[0]);
        const y = screenTL[1] + a * (screenTR[1] - screenTL[1]) + b * (screenBL[1] - screenTL[1]);

        return [x, y];
    }

    function getHighlightedActivities() {
        if (typeof FilterModule !== 'undefined') {
            const behaviorFilters = FilterModule.getCurrentFilters().behaviors || [];
            if (!behaviorFilters.length) return allActivities;
            return behaviorFilters
                .map(f => f.split(':')[0].toLowerCase())
                .filter(a => allActivities.includes(a));
        }
        return allActivities;
    }

    function applyNonBehaviorFilters(features) {
        if (typeof FilterModule === 'undefined') return features;
        const currentFilters = FilterModule.getCurrentFilters();
        let filtered = features.slice();

        if (currentFilters.colors?.length) {
            filtered = filtered.filter(f =>
                currentFilters.colors.some(color => {
                    const fur = f.properties.furColor?.toLowerCase();
                    return (color === 'gray' && fur === 'gray') ||
                           (color === 'cinnamon' && fur === 'cinnamon') ||
                           (color === 'black' && fur === 'black');
                })
            );
        }

        if (currentFilters.age?.length) {
            filtered = filtered.filter(f =>
                currentFilters.age.some(a => f.properties.age === a.split(':')[1])
            );
        }

        if (currentFilters.dogs) {
            filtered = filtered.filter(f => f.properties.dogs === true);
        }

        return filtered;
    }

    function toggleBrushMode() {
        brushMode = !brushMode;
        
        if (svg) {
            svg.style("cursor", brushMode ? "crosshair" : "grab");
            
            if (brushMode) {
                // Enable brush
                brushLayer.style("pointer-events", "all");
            } else {
                // Disable brush (but keep the selection and visual rectangle)
                brushLayer.style("pointer-events", "none");
            }
        }
    }

    function createMap(originalData, containerSelector = ".Map") {
        if (!originalData) return;

        lastContainerSelector = containerSelector;
        lastData = originalData;

        const container = d3.select(containerSelector);
        if (container.empty()) return;
        container.style("position", "relative");

        const width = container.node().offsetWidth || 800;
        const height = container.node().offsetHeight || 600;

        // Create SVG only once
        svg = container.select("svg");
        if (svg.empty()) {
            svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("cursor", "grab");

            const mapGroup = svg.append("g").attr("class", "map-group");

            // Background image
            mapGroup.append("image")
                .attr("href", "../images/central_park_overlay.jpg")
                .attr("opacity", 0.75)
                .attr("width", "100%")
                .attr("height", "100%");

            // Initialize zoom
            zoom = d3.zoom()
                .scaleExtent([1, 8])
                .translateExtent([[0, 0], [width, height]])
                .filter(function(event) {
                    // Only allow wheel zoom, or click+drag when NOT in brush mode
                    if (event.type === "wheel") return true;
                    if (event.type === "mousedown") return !brushMode && event.button === 0;
                    return !brushMode;
                })
                .on("zoom", (event) => {
                    currentTransform = event.transform;
                    mapGroup.attr("transform", currentTransform);

                    mapGroup.selectAll("g.squirrel-dot")
                        .attr("transform", d => {
                            const [x, y] = geoToScreen(d.geometry.coordinates[0], d.geometry.coordinates[1], width, height);
                            const k = 1 / currentTransform.k;
                            return `translate(${x},${y}) scale(${k})`;
                        });
                });

            svg.call(zoom);

            function styleDots(selectedIdsSet) {
                const hasSel = selectedIdsSet && selectedIdsSet.size > 0;
                mapGroup.selectAll("g.squirrel-dot")
                    .classed("selected", d => hasSel && selectedIdsSet.has(d.properties.id))
                    .selectAll("circle,path")
                    .attr("stroke-width", d => (hasSel && selectedIdsSet.has(d.properties.id)) ? 0.8 : baseStroke)
                    .attr("opacity", d => (hasSel && !selectedIdsSet.has(d.properties.id)) ? 0.25 : 1);
            }

            function brushed(event) {
                const sel = event.selection;
                if (!sel) {
                    if (typeof SelectionModule !== 'undefined') {
                        SelectionModule.clear();
                        styleDots(null);
                    }
                    return;
                }
                
                // Transform brush coordinates back to base coordinates
                const [[x0, y0], [x1, y1]] = sel;
                const baseX0 = currentTransform.invertX(x0);
                const baseY0 = currentTransform.invertY(y0);
                const baseX1 = currentTransform.invertX(x1);
                const baseY1 = currentTransform.invertY(y1);

                const ids = [];
                // Use ALL features from original data, not just filtered ones
                const allFeatures = lastData.features;

                allFeatures.forEach(f => {
                    const [sx, sy] = geoToScreen(f.geometry.coordinates[0], f.geometry.coordinates[1], width, height);
                    
                    if (baseX0 <= sx && sx <= baseX1 && baseY0 <= sy && sy <= baseY1) {
                        if (f.properties?.id != null) ids.push(f.properties.id);
                    }
                });

                if (typeof SelectionModule !== 'undefined') {
                    SelectionModule.set(ids);
                    styleDots(SelectionModule.get()?.ids);
                }
            }

            // Brush overlay - must be after mapGroup but INSIDE mapGroup so it transforms with zoom/pan
            brushLayer = mapGroup.append("g")
                .attr("class", "brush-layer")
                .style("pointer-events", "none");

            mapBrush = d3.brush()
                .extent([[0, 0], [width, height]])
                .filter(function(event) {
                    // Only allow brush when in brush mode
                    return brushMode;
                })
                .on("start brush end", brushed);

            brushLayer.call(mapBrush);

            // Listen for 'b' key to toggle brush mode
            d3.select(window).on("keydown.brushtoggle", (event) => {
                if (event.key === 'b' || event.key === 'B') {
                    toggleBrushMode();
                }
            });
        } else {
            svg = container.select("svg");
        }

        const mapGroup = svg.select(".map-group");

        // Tooltip
        let tooltip = container.select(".map-tooltip");
        if (tooltip.empty()) {
            tooltip = container.append("div")
                .attr("class", "map-tooltip")
                .style("position", "absolute")
                .style("background-color", "white")
                .style("border", "1px solid black")
                .style("padding", "5px 10px")
                .style("border-radius", "4px")
                .style("pointer-events", "none")
                .style("opacity", 0);
        }

        function showTooltip(event, d) {
            const props = d.properties;
            tooltip.style("opacity", 1)
                .html(`
                    <b>Squirrel ID:</b> ${props.id}<br>
                    <b>Date:</b> ${props.date}<br>
                    <b>Age:</b> ${props.age}<br>
                    <b>Fur Color:</b> ${props.furColor}
                `);
        }

        function moveTooltip(event) {
            const [x, y] = d3.pointer(event, container.node());
            const tooltipNode = tooltip.node();
            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;
            const containerWidth = container.node().offsetWidth;
            const containerHeight = container.node().offsetHeight;

            let left = x + 10;
            let top = y + 10;
            if (left + tooltipWidth > containerWidth) left = x - tooltipWidth - 10;
            if (top + tooltipHeight > containerHeight) top = y - tooltipHeight - 10;

            tooltip.style("left", `${left}px`).style("top", `${top}px`);
        }

        function hideTooltip() {
            tooltip.style("opacity", 0);
        }

        // Filters
        const highlightedActivities = getHighlightedActivities();
        const hasAnyFilters = highlightedActivities.length < allActivities.length;
        const filteredFeatures = applyNonBehaviorFilters(originalData.features);

        mapGroup.selectAll("g.squirrel-dot").remove();

        // Draw dots
        mapGroup.selectAll("g.squirrel-dot")
            .data(
                filteredFeatures.filter(d =>
                    hasAnyFilters ? highlightedActivities.some(a => d.properties[a] === true) : true
                )
            )
            .enter()
            .append("g")
            .attr("class", "squirrel-dot")
            .attr("transform", d => {
                const [x, y] = geoToScreen(d.geometry.coordinates[0], d.geometry.coordinates[1], width, height);
                const k = 1 / currentTransform.k;
                return `translate(${x},${y}) scale(${k})`;
            })
            .each(function(d) {
                const active = highlightedActivities.filter(a => d.properties[a] === true);
                if (!hasAnyFilters || active.length === 0) {
                    d3.select(this)
                        .append("circle")
                        .attr("r", baseRadius)
                        .attr("fill", getColorByFur(d.properties.furColor))
                        .attr("stroke", "#000")
                        .attr("stroke-width", baseStroke);
                } else {
                    const angleStep = 2 * Math.PI / active.length;
                    active.forEach((activity, i) => {
                        const arcGenerator = d3.arc()
                            .innerRadius(0)
                            .outerRadius(baseRadius)
                            .startAngle(i * angleStep)
                            .endAngle((i + 1) * angleStep);

                        d3.select(this)
                            .append("path")
                            .attr("d", arcGenerator())
                            .attr("fill", colorScale(activity))
                            .attr("stroke", "#000")
                            .attr("stroke-width", baseStroke);
                    });
                }
            })
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip);

        // Restore selection only if there is a selection
        if (typeof SelectionModule !== 'undefined') {
            const selectedIds = SelectionModule.get()?.ids;
            if (selectedIds && selectedIds.size > 0) {
                mapGroup.selectAll("g.squirrel-dot")
                    .classed("selected", d => selectedIds.has(d.properties.id))
                    .selectAll("circle,path")
                    .attr("stroke-width", d => selectedIds.has(d.properties.id) ? 0.8 : baseStroke)
                    .attr("opacity", d => selectedIds.has(d.properties.id) ? 1 : 0.25);
            }
        }

        // Restore zoom
        svg.call(zoom.transform, currentTransform);

        MapModule.clearBrush = function() {
            if (brushLayer && mapBrush) {
                brushLayer.call(mapBrush.move, null);
                if (typeof SelectionModule !== 'undefined') {
                    SelectionModule.clear();
                }
            }
        };
    }

    function updateMap(data) {
        const toUse = data || lastData;
        if (lastContainerSelector && toUse) {
            createMap(toUse, lastContainerSelector);
        }
    }

    return {
        createMap,
        updateMap,
        toggleBrushMode
    };

})();
window.MapModule = MapModule;