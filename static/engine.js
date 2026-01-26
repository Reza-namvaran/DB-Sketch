const svg = document.getElementById("canvas");
svg.style.width = "100vw";
svg.style.height = "100vh";

let viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
svg.appendChild(viewport);

const GRID_SIZE = 20;

let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

let panning = false;
let panStart = {x: 0, y: 0};
let spaceDown = false;

document.addEventListener("keydown", key => {
    if (key.code === "Space") spaceDown = true;
});
document.addEventListener("keyup", key => {
    if (key.code === "Space") spaceDown = false;
});

let shapes = [];
let edges = [];
let dragging = null;
let offsetX = 0;
let offsetY = 0;
let connectForm = null;
let selectedShape = null;
let editing = false;

let selectionStart = null;
let selectionRect = null;
let selectedShapes = [];
let selectedEdges = [];

let undoStack = [];
function saveState() {
    undoStack.push({
        shapes: JSON.parse(JSON.stringify(shapes)),
        edges: JSON.parse(JSON.stringify(edges))
    });
    if (undoStack.length > 50) undoStack.shift();
}
document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (undoStack.length > 0) {
            const state = undoStack.pop();
            shapes = JSON.parse(JSON.stringify(state.shapes));
            edges = JSON.parse(JSON.stringify(state.edges));
            render();
        }
    }
});

function updateCamera() {
    viewport.setAttribute("transform", `translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`);
}

function snap(val) {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function createSVG(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function getSVGCoords(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function saveDiagram() {
    let data = { shapes, edges };
    let json = JSON.stringify(data, null, 2);
    let blob = new Blob([json], { type: "application/json"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadDiagram() {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = () => {
            let data = JSON.parse(reader.result);
            shapes = data.shapes || [];
            edges = data.edges || [];
            render();
        };
        reader.readAsText(file);
    };
    input.click();
}

function findShapeByText(text) {
    return shapes.find(s => s.text === text);
}

function validCardinality(cardinality) {
    return cardinality === "M" || cardinality === "N" || cardinality === "1";
}

function parseSyntax() {
    let lines = document.getElementById("syntax").value.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));

    lines.forEach(line => {
        let parts = line.split(" ");

        if (parts[0] === "entity") {
            let name = parts[1];
            let [x, y] = extractPos(line);
            addShapeFromSyntax("rect", name, x, y);
        }

        if (parts[0] === "weak_entity") {
            let name = parts[1];
            let [x, y] = extractPos(line);
            addShapeFromSyntax("double-rect", name, x, y);
        }

        if (parts[0] === "relationship") {
            let name = parts[1];
            let [x, y] = extractPos(line);
            addShapeFromSyntax("diamond", name, x, y);
        }

        if (parts[0] === "idr") {
            let name = parts[1];
            let [x, y] = extractPos(line);
            addShapeFromSyntax("idr", name, x, y);
        }

        if (parts[0] === "circle") {
            let name = parts[1];
            let [x, y] = extractPos(line);
            addShapeFromSyntax("Cr", name, x, y);
        }

        if (parts[0] === "attribute") {
            let name = parts[1];
            let owner = parts[3];
            let target = findShapeByText(owner);
            if (!target) return;

            let x = target.x - 100;
            let y = target.y;
            addShapeFromSyntax("attribute", name, x, y);

            let attr = findShapeByText(name);
            edges.push({
                from: attr.id,
                to: target.id,
                fromLabel: "",
                toLabel: "",
                participation: "partial"
            });
        }

        if (parts[0] === "connect") {
            let from = findShapeByText(parts[1]);
            let to   = findShapeByText(parts[2]);
            if (!from || !to) return;

            fromLabel = validCardinality(parts[3]) ? parts[3] : "";
            toLabel = validCardinality(parts[4]) ? parts[4] : "";
            let participation = parts[5] || "partial";

            edges.push({
                from: from.id,
                to: to.id,
                fromLabel,
                toLabel,
                participation 
            });
        }
    });

    render();
}

function extractPos(line) {
    let match = line.match(/\((\d+),\s*(\d+)\)/);
    if (!match) return [100, 100];
    return [parseInt(match[1]), parseInt(match[2])];
}

function addShapeFromSyntax(type, text, x, y) {
    let shape = {
        id: Date.now() + Math.random(),
        type,
        x,
        y,
        w:
          type === "attribute" ? 80 : type === "Cr" ? 30 : 120,
        h:
          type === "attribute" ? 40 : type === "Cr" ? 30 : 60,
        text
      };
      shapes.push(shape);
}

function addShape(type) {
    saveState();
    let shape = {
        id: Date.now(),
        type,
        x: 100,
        y: 100,
        w: type === "Cr" ? 30 : 120,
        h: type === "Cr" ? 30 : 60,
        text: type.toUpperCase()
    };
    shapes.push(shape);
    render();
}
function addRect() { addShape("rect"); }
function addDoubleRect() { addShape("double-rect"); }
function addDiamond() { addShape("diamond"); }
function addIndentifyingRelationship() { addShape("idr"); }
function addCircle() { addShape("Cr"); }
function addAttribute() { addShape("attribute"); }

function handleConnection(shape) {
    if (!connectForm) {
        connectForm = shape;
        shape._highlight = true;
        render();
    } else {
        let exists = edges.some(e => 
            (e.from === connectForm.id && e.to === shape.id) || 
            (e.from === shape.id && e.to === connectForm.id)
        );
        if (!exists) {
            saveState();
            edges.push({
                from: connectForm.id,
                to: shape.id,
                fromLabel: "1",
                toLabel: "1",
                participation: "partial"
            });
        }
        connectForm._highlight = false;
        shape._highlight = false;
        connectForm = null;
        render();
    }
}

function startDrag(e) {
    if (editing) return;
    let id = Number(this.getAttribute("data-id"));
    let shape = shapes.find(s => s.id === id);
    selectedShape = shape;

    if (e.button === 2) {
        handleConnection(shape);
        return;
    }

    const p = getSVGCoords(e);

    dragging = {
        shape: selectedShape.length ? selectedShape : [shape],
        startMouse: p,
        startPosition: (selectedShape.length ? selectedShape : [shape]).map(s => ({
            s,
            x: s.x,
            y: s.y
        })) 
    };
}

function deleteShape(shapeID) {
    saveState();
    shapes = shapes.filter(s => s.id !== shapeID);
    edges = edges.filter(edge => edge.from !== shapeID && edge.to !== shapeID);
    selectedShape = null;
    render();
}
document.addEventListener("keydown", k => {
    if (k.key === "Delete") {
        if (selectedShapes.length > 0) {
            saveState();
            selectedShapes.forEach(s => {
                shapes = shapes.filter(shape => shape.id !== s.id);
                edges = edges.filter(edge => edge.from !== s.id && edge.to !== s.id);
            });
            selectedShapes = [];
            selectedEdges = [];
            render();
        } else if (selectedShape) {
            deleteShape(selectedShape.id);
        }
    }
});

function editText(shape) {
    let inputText = prompt("Edit text:", shape.text);
    if (inputText !== null) {
        saveState();
        shape.text = inputText;
        render();
    }
}
function editEdge(edge) {
    saveState();
    let participation = prompt("Participation (partial/total)", edge.participation);
    if (participation === "total" || participation === "partial") edge.participation = participation;
    render();
}

function isNotEntity(shape) { return shape.type !== "rect" && shape.type !== "double-rect"; }

function inlineEditText(svgText, edge, side) {
    const bbox = svgText.getBoundingClientRect();
    let input = document.createElement("input");
    input.value = svgText.textContent;
    input.style.position = "absolute";
    input.style.left = bbox.left + "px";
    input.style.top = bbox.top + "px";
    input.style.width = Math.max(40, svgText.textContent.length * 10) + "px";
    input.style.fontSize = "16px";
    input.style.textAlign = "center";
    input.style.zIndex = 1000;
    document.body.appendChild(input);
    input.focus();
    input.select();
    editing = true;

    let committed = false;
    function commit() {
        if (committed) return;
        committed = true;
        saveState();
        if (side === "from") edge.fromLabel = input.value;
        if (side === "to") edge.toLabel = input.value;
        document.body.removeChild(input);
        editing = false;
        render();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
            document.body.removeChild(input);
            editing = false;
        }
    });
}

function createCardinalityText(x, y, edge, side) {
    let t = createSVG("text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("font-size", "16");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.style.cursor = "text";
    t.style.pointerEvents = "all"; 
    t.textContent = side === "from" ? edge.fromLabel : edge.toLabel;
    t.addEventListener("click", e => {
        e.stopPropagation();
        if (!editing) inlineEditText(t, edge, side);
    });
    viewport.appendChild(t);
}

function shouldShowCardinality(from, to) {
    const relTypes = ["diamond", "idr"];
    const entTypes = ["rect", "double-rect"];
    return (relTypes.includes(from.type) && entTypes.includes(to.type)) ||
           (relTypes.includes(to.type) && entTypes.includes(from.type));
}

function drawGrid() {
    const extent = 5000;
    
    for (let x = -extent; x <= extent; x += GRID_SIZE) {
        let v = createSVG("line");
        v.setAttribute("x1", x); v.setAttribute("y1", -extent);
        v.setAttribute("x2", x); v.setAttribute("y2", extent);
        v.setAttribute("stroke", "#eee"); v.setAttribute("pointer-events", "none");
        viewport.appendChild(v);
    }
    for (let y = -extent; y <= extent; y += GRID_SIZE) {
        let h = createSVG("line");
        h.setAttribute("x1", -extent); h.setAttribute("y1", y);
        h.setAttribute("x2", extent); h.setAttribute("y2", y);
        h.setAttribute("stroke", "#eee"); h.setAttribute("pointer-events", "none");
        viewport.appendChild(h);
    }
}

function render() {
    svg.innerHTML = `<defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="black"/>
        </marker>
    </defs>`;

    viewport = createSVG("g");
    svg.appendChild(viewport);
    updateCamera();

    drawGrid();

    // Edges
    edges.forEach(edge => {
        let from = shapes.find(s => s.id === edge.from);
        let to   = shapes.find(s => s.id === edge.to);
        if (!from || !to) return;

        let x1 = from.x + from.w/2;
        let y1 = from.y + from.h/2;
        let x2 = to.x + to.w/2;
        let y2 = to.y + to.h/2;

        // line
        let line = createSVG("line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", 2);
        line.setAttribute("data-id", edge.from + "-" + edge.to);
        line.setAttribute("cursor", "pointer");
        line.setAttribute("pointer-events","stroke"); 
        line.setAttribute("fill","none");
        line.setAttribute("marker-end", "url(#arrow)");

        line.addEventListener("mouseenter", () => line.setAttribute("stroke", "blue"));
        line.addEventListener("mouseleave", () => line.setAttribute("stroke", "black"));
        line.addEventListener("dblclick", () => editEdge(edge));

        viewport.appendChild(line);

        // total participation double line
        if (edge.participation === "total") {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx*dx + dy*dy);
            const nx = -dy / len;
            const ny = dx / len;
            const offset = 4;
            let line2 = createSVG("line");
            line2.setAttribute("x1", x1 + nx * offset);
            line2.setAttribute("y1", y1 + ny * offset);
            line2.setAttribute("x2", x2 + nx * offset);
            line2.setAttribute("y2", y2 + ny * offset);
            line2.setAttribute("stroke", "black");
            viewport.appendChild(line2);
        }
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const offset = 18;
        
        if (shouldShowCardinality(from, to)) {
            let fromAnchor = isNotEntity(from) ? { x: x1, y: y1 } : { x: (x1+x2)/2, y: (y1+y2)/2 };
            let toAnchor   = isNotEntity(to)   ? { x: x2, y: y2 } : { x: (x1+x2)/2, y: (y1+y2)/2 };
        
            createCardinalityText(fromAnchor.x + Math.cos(angle)*offset, fromAnchor.y + Math.sin(angle)*offset, edge, "from");
            createCardinalityText(toAnchor.x - Math.cos(angle)*offset, toAnchor.y - Math.sin(angle)*offset, edge, "to");
        }        
    });

    // Shapes
    shapes.forEach(shape => {
        let g = createSVG("g");
        g.classList.add("shape");
        g.setAttribute("data-id", shape.id);
        g.addEventListener("mousedown", startDrag);
        g.addEventListener("dblclick", () => editText(shape));

        let strokeColor = shape._highlight ? "blue" : "black";
        let strokeWidth = shape._highlight ? 2 : 1;

        if (shape.type === "rect") {
            let r = createSVG("rect");
            r.setAttribute("x", shape.x); r.setAttribute("y", shape.y);
            r.setAttribute("width", shape.w); r.setAttribute("height", shape.h);
            r.setAttribute("fill", "white");
            r.setAttribute("stroke", strokeColor);
            r.setAttribute("stroke-width", strokeWidth);
            g.appendChild(r);
        }

        if (shape.type === "double-rect") {
            let innerRect = createSVG("rect");
            let outerRect = createSVG("rect");
            innerRect.setAttribute("x", shape.x); innerRect.setAttribute("y", shape.y);
            innerRect.setAttribute("width", shape.w); innerRect.setAttribute("height", shape.h);
            outerRect.setAttribute("x", shape.x+5); outerRect.setAttribute("y", shape.y+5);
            outerRect.setAttribute("width", shape.w-10); outerRect.setAttribute("height", shape.h-10);
            [innerRect, outerRect].forEach(r => {
                r.setAttribute("fill","white");
                r.setAttribute("stroke",strokeColor);
                r.setAttribute("stroke-width",strokeWidth);
                g.appendChild(r);
            });
        }

        if (shape.type === "diamond" || shape.type === "idr") {
            let innerP = createSVG("polygon");
            let outerP = shape.type==="idr" ? createSVG("polygon") : null;
            let innerPoints = `${shape.x+shape.w/2},${shape.y} ${shape.x+shape.w},${shape.y+shape.h/2} ${shape.x+shape.w/2},${shape.y+shape.h} ${shape.x},${shape.y+shape.h/2}`;
            innerP.setAttribute("points", innerPoints);
            innerP.setAttribute("fill","white");
            innerP.setAttribute("stroke",strokeColor);
            innerP.setAttribute("stroke-width",strokeWidth);
            g.appendChild(innerP);
            if (outerP) {
                let outerPoints = `${shape.x+5+(shape.w-10)/2},${shape.y+5} ${shape.x+5+(shape.w-10)},${shape.y+5+(shape.h-10)/2} ${shape.x+5+(shape.w-10)/2},${shape.y+5+(shape.h-10)} ${shape.x+5},${shape.y+5+(shape.h-10)/2}`;
                outerP.setAttribute("points", outerPoints);
                outerP.setAttribute("fill","white");
                outerP.setAttribute("stroke",strokeColor);
                outerP.setAttribute("stroke-width",strokeWidth);
                g.appendChild(outerP);
            }
        }

        if (shape.type === "Cr") {
            let c = createSVG("ellipse");
            c.setAttribute("cx", shape.x+shape.w/2); c.setAttribute("cy", shape.y+shape.h/2);
            c.setAttribute("rx", shape.w/2); c.setAttribute("ry", shape.h/2);
            c.setAttribute("fill","white");
            c.setAttribute("stroke",strokeColor);
            c.setAttribute("stroke-width",strokeWidth);
            g.appendChild(c);
        }

        if (shape.type === "attribute") {
            let oval = createSVG("ellipse");
            oval.setAttribute("cx", shape.x + shape.w/2);
            oval.setAttribute("cy", shape.y + shape.h/2);
            oval.setAttribute("rx", shape.w/2);
            oval.setAttribute("ry", shape.h/2);
            oval.setAttribute("fill", "#fff8dc"); // light color for attribute
            oval.setAttribute("stroke", strokeColor);
            oval.setAttribute("stroke-width", strokeWidth);
            g.appendChild(oval);
        }

        let t = createSVG("text");
        t.setAttribute("x", shape.x+shape.w/2);
        t.setAttribute("y", shape.y+shape.h/2);
        t.setAttribute("text-anchor","middle");
        t.setAttribute("dominant-baseline","middle");
        t.textContent = shape.text;
        g.appendChild(t);



        viewport.appendChild(g);
    });
}

svg.addEventListener("mousemove", e => {
    const p = getSVGCoords(e);
    if (dragging) {
        const dx = p.x - dragging.startMouse.x;
        const dy = p.y - dragging.startMouse.y;

        dragging.startPosition.forEach(o => {
            o.s.x = snap(o.x + dx);
            o.s.y = snap(o.y + dy);
        });

        render();
    }
});

svg.addEventListener("mouseup", e => {
    if (selectionStart) {
        selectedShapes = shapes.filter(s => {
            const sx = s.x, sy = s.y, sw = s.w, sh = s.h;
            const rx = parseFloat(selectionRect.getAttribute("x"));
            const ry = parseFloat(selectionRect.getAttribute("y"));
            const rw = parseFloat(selectionRect.getAttribute("width"));
            const rh = parseFloat(selectionRect.getAttribute("height"));
            return sx + sw > rx && sx < rx + rw && sy + sh > ry && sy < ry + rh;
        });

        shapes.forEach(s => s._highlight = selectedShapes.includes(s));

        selectedEdges = edges.filter(edge => {
            const from = shapes.find(s => s.id === edge.from);
            const to   = shapes.find(s => s.id === edge.to);
            if (!from || !to) return false;
            const x1 = from.x + from.w/2;
            const y1 = from.y + from.h/2;
            const x2 = to.x + to.w/2;
            const y2 = to.y + to.h/2;
            const rx = parseFloat(selectionRect.getAttribute("x"));
            const ry = parseFloat(selectionRect.getAttribute("y"));
            const rw = parseFloat(selectionRect.getAttribute("width"));
            const rh = parseFloat(selectionRect.getAttribute("height"));
            const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
            return maxX > rx && minX < rx + rw && maxY > ry && minY < ry + rh;
        });

        selectionStart = null;
        if (selectionRect) {
            svg.removeChild(selectionRect);
            selectionRect = null;
        }
        render();
    }
    dragging = null;
});
svg.addEventListener("mouseleave", () => dragging = null);
svg.addEventListener("contextmenu", e => e.preventDefault());
svg.addEventListener("mousedown", e => {
    if (!e.shiftKey) {
        shapes.forEach(s => s._highlight = false);
        selectedShapes = [];
        selectedEdges = [];
    }
    
    if (e.target === svg && e.button === 0) {
        const coords = getSVGCoords(e);
        selectionStart = { x: coords.x, y: coords.y };
        selectionRect = createSVG("rect");
        selectionRect.setAttribute("fill", "rgba(0,0,255,0.1)");
        selectionRect.setAttribute("stroke", "blue");
        selectionRect.setAttribute("stroke-dasharray", "4");
        svg.appendChild(selectionRect);
    }
});

svg.addEventListener("wheel", key => {
    if (!key.ctrlKey) return;

    key.preventDefault();

    const zoomFactor = 1.1;
    const mouse = getSVGCoords(key);

    const oldZoom = camera.zoom;
    camera.zoom *= key.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    camera.zoom = Math.min(Math.max(camera.zoom, 0.2), 5);

    camera.x = (mouse.x * camera.zoom - mouse.x * oldZoom);
    camera.y = (mouse.y * camera.zoom - mouse.y * oldZoom);

    updateCamera();
});

svg.addEventListener("mousedown", key => {
    if (key.button === 1 || (key.button === 0 && spaceDown)) {
        panning = true;
        panStart = {x: key.clientX, y: key.clientY};
    }
});

svg.addEventListener("mousemove", e => {
    if (!panning) return;

    camera.x = (e.clientX - panStart.x);
    camera.y = (e.clientY - panStart.y);

    panStart = { x: e.clientX, y: e.clientY };
    
    updateCamera();
});

svg.addEventListener("mouseup", () => panning = false);
svg.addEventListener("mouseup", () => dragging = null);
svg.addEventListener("mouseleave", () => panning = false);

