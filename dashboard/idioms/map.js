const MapModule = (function() {

    let lastContainerSelector = null;
    let lastData = null;
    let tooltip = null;
    // Central Park bounding box
    const pxTL = [0, 0];             // top-left
    const pxTR = [imgWidth, 0];      // top-right
    const pxBL = [0, imgHeight];     // bottom-left
    const pxBR = [imgWidth, imgHeight]; // bottom-right

    // Corresponding geographic coordinates (lon, lat)
    const geoTL = [-73.981807, 40.768107];
    const geoTR = [-73.958198, 40.800565];
    const geoBL = [-73.973071, 40.764324];
    const geoBR = [-73.949338, 40.796945];


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
            .attr("width", width)
            .attr("height", height)
            .node();

        // Get actual image position in SVG
        const bbox = imgNode.getBBox(); // gives x, y, width, height of the image in SVG

        const imgX = bbox.x;
        const imgY = bbox.y;
        const imgWidth = bbox.width;
        const imgHeight = bbox.height;

        function geoToPixelBilinear(lon, lat) {
            // Interpolate along top and bottom edges
            const tx = (lon - geoTL[0]) / (geoTR[0] - geoTL[0]); // fraction along top edge
            const bx = (lon - geoBL[0]) / (geoBR[0] - geoBL[0]); // fraction along bottom edge

            // Interpolate pixel X along top and bottom
            const xTop = pxTL[0] + tx * (pxTR[0] - pxTL[0]);
            const xBottom = pxBL[0] + bx * (pxBR[0] - pxBL[0]);

            // Interpolate along left and right edges
            const ly = (lat - geoBL[1]) / (geoTL[1] - geoBL[1]); // fraction along left edge
            const ry = (lat - geoBR[1]) / (geoTR[1] - geoBR[1]); // fraction along right edge

            // Interpolate pixel Y along left and right
            const yLeft = pxBL[1] + ly * (pxTL[1] - pxBL[1]);
            const yRight = pxBR[1] + ry * (pxTR[1] - pxBR[1]);

            // Average X and Y
            const x = xTop * (1 - ly) + xBottom * ly;
            const y = yLeft * (1 - tx) + yRight * tx;

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
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        }

        function hideTooltip() {
            tooltip.style("opacity", 0);
        }

        // Draw points
        svg.selectAll("circle")
            .data(geojsonData.features)
            .enter()
            .append("circle")
            .attr("cx", d => geoToPixelBilinear(d.geometry.coordinates[0], d.geometry.coordinates[1])[0])
            .attr("cy", d => geoToPixelBilinear(d.geometry.coordinates[0], d.geometry.coordinates[1])[1])
            .attr("r", 2)
            .attr("fill", d => getColorByFur(d.properties.furColor))
            .attr("stroke", "#000")
            .attr("stroke-width", 0.3)
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip);

        console.log("✅ Map rendered with corrected bounding box scaling.");
    }
/* 
    function getColorByFur(fur) {
        return furColors[(fur || "").toLowerCase()] || "#999999";
    }

    function geoToPixel(lon, lat) {
        const x = ((lon - lonMin) / (lonMax - lonMin)) * imgWidth;
        const y = ((latMax - lat) / (latMax - latMin)) * imgHeight; // flip Y
        return [x, y];
    }
    function moveTooltip(event) {
        tooltip.style("top", (event.pageY + 10) + "px")
            .style("left", (event.pageX + 10) + "px");
    }

    function hideTooltip() {
        tooltip.style("opacity", 0);
    }
 */
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
