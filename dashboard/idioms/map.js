const MapModule = (function() {

    let lastContainerSelector = null;
    let lastData = null;

    const furColors = {
        gray: "#808080",
        black: "#000000",
        cinnamon: "#d2691e"
    };

    function createMap(geojsonData, containerSelector = ".Map") {
        if (!geojsonData || !geojsonData.features) {
            console.warn("Invalid GeoJSON data");
            return;
        }

        const container = d3.select(containerSelector);
        if (container.empty()) {
            console.warn("Container not found:", containerSelector);
            return;
        }

        container.selectAll("*").remove();
        container.style("position", "relative");

        const width = container.node().offsetWidth || 800;
        const height = container.node().offsetHeight || 600;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const imgNode = svg.append("image")
            .attr("href", "../images/central_park_overlay.jpg")
            .attr("opacity", 0.75)
            .attr("width", "100%")
            .attr("height", "100%")
            .node();

        // Geo bounding box (in lon, lat)
        const geoTL = [-73.981807, 40.768107];
        const geoTR = [-73.958198, 40.800565];
        const geoBL = [-73.973071, 40.764324];
        const geoBR = [-73.949338, 40.796945];

        // The rectangle we want to map it to (screen space)
        const screenTL = [227, 7];
        const screenTR = [1565, 7];
        const screenBL = [227, 280];
        const screenBR = [1565, 280];

        // Given a lon/lat point, map it to screen coordinates
        function geoToScreen(lon, lat) {
            // Step 1: represent as vectors relative to TL corner
            const geoVecX = [geoTR[0] - geoTL[0], geoTR[1] - geoTL[1]];
            const geoVecY = [geoBL[0] - geoTL[0], geoBL[1] - geoTL[1]];
            
            // Step 2: solve for coefficients (a,b) s.t. point = TL + a*vecX + b*vecY
            const dx = lon - geoTL[0];
            const dy = lat - geoTL[1];
            
            const det = geoVecX[0]*geoVecY[1] - geoVecY[0]*geoVecX[1];
            const a = (dx*geoVecY[1] - dy*geoVecY[0]) / det;
            const b = (dy*geoVecX[0] - dx*geoVecX[1]) / det;
            
            // Step 3: map (a,b) to screen rectangle
            const x = screenTL[0] + a * (screenTR[0] - screenTL[0]) + b * (screenBL[0] - screenTL[0]);
            const y = screenTL[1] + a * (screenTR[1] - screenTL[1]) + b * (screenBL[1] - screenTL[1]);
            
            return [x, y];
        }

        // Colors
        const furColors = {
            gray: "#808080",
            black: "#000000",
            cinnamon: "#d2691e"
        };
        const getColorByFur = fur => furColors[fur?.toLowerCase()] || "#999999";

        // Tooltip
        const tooltip = container.append("div")
            .attr("class", "map-tooltip")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid black")
            .style("padding", "5px 10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);

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
            tooltip
                .style("left", (x + 10) + "px")
                .style("top", (y + 10) + "px");
        }

        function hideTooltip() {
            tooltip.style("opacity", 0);
        }

        // Draw points
        svg.selectAll("circle")
            .data(geojsonData.features)
            .enter()
            .append("circle")
            .attr("cx", d => geoToScreen(d.geometry.coordinates[0], d.geometry.coordinates[1])[0])
            .attr("cy", d => geoToScreen(d.geometry.coordinates[0], d.geometry.coordinates[1])[1])
            .attr("r", 3)
            .attr("fill", d => getColorByFur(d.properties.furColor))
            .attr("stroke", "#000")
            .attr("stroke-width", 0.3)
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip)
            .each(d => {
                const [x, y] = geoToScreen(d.geometry.coordinates[0], d.geometry.coordinates[1]);
                console.log(d.geometry.coordinates[0], d.geometry.coordinates[1], "=>", x, y);
            });

        console.log("✅ Map rendered with corrected bounding box scaling.");
    }

    function updateMap(data) {
        const toUse = data || lastData;
        if (lastContainerSelector && toUse) {
            createMap(toUse, lastContainerSelector);
        }
    }

    
    return {
        createMap,
        updateMap
    };

})();

window.MapModule = MapModule;
