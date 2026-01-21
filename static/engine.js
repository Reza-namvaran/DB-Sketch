const svg = document.getElementById("canvas");
const GRID_SIZE = 20;

let shapes = [];
let edges = [];
let dragging = null;
let offsetX = 0;
let offsetY = 0;
let connectForm = null;
let selectedShape = null;
let editing = false;

function snap(val) {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
}
function createSVG(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
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

function addShape(type) {
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

function handleConnection(shape) {
    if (!connectForm) {
        connectForm = shape;
        shape._highlight = true;
        render();
    } else {
        edges.push({
            from: connectForm.id,
            to: shape.id,
            fromLabel: "1",
            toLabel: "1",
            participation: "partial"
        });
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

    dragging = shape;
    offsetX = e.clientX - dragging.x;
    offsetY = e.clientY - dragging.y;
}

function deleteShape(shapeID) {
    shapes = shapes.filter(s => s.id !== shapeID);
    edges = edges.filter(edge => edge.from !== shapeID && edge.to !== shapeID);
    selectedShape = null;
    render();
}
document.addEventListener("keydown", k => {
    if (k.key === "Delete" && selectedShape) {
        deleteShape(selectedShape.id);
    }
});

function editText(shape) {
    let inputText = prompt("Edit text:", shape.text);
    if (inputText !== null) {
        shape.text = inputText;
        render();
    }
}
function editEdge(edge) {
    let fromLabel = prompt("From cardinality (1, N, M):", edge.fromLabel);
    let toLabel = prompt("To cardinality (1, N, M):", edge.toLabel);
    let participation = prompt("Participation (partial/total)", edge.participation);
    if (fromLabel != null) edge.fromLabel = fromLabel;
    if (toLabel != null) edge.toLabel = toLabel;
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
    t.style.pointerEvents = "all"; // ensure clickable
    t.textContent = side === "from" ? edge.fromLabel : edge.toLabel;
    t.addEventListener("click", e => {
        e.stopPropagation();
        if (!editing) inlineEditText(t, edge, side);
    });
    svg.appendChild(t);
}

function render() {
    svg.innerHTML = `<defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="black"/>
        </marker>
    </defs>`;

    // Grid
    for (let x = 0; x < window.innerWidth; x += GRID_SIZE) {
        let v = createSVG("line");
        v.setAttribute("x1", x); v.setAttribute("y1", 0);
        v.setAttribute("x2", x); v.setAttribute("y2", window.innerHeight);
        v.setAttribute("stroke", "#eee"); v.setAttribute("pointer-events", "none");
        svg.appendChild(v);
    }
    for (let y = 0; y < window.innerHeight; y += GRID_SIZE) {
        let h = createSVG("line");
        h.setAttribute("x1", 0); h.setAttribute("y1", y);
        h.setAttribute("x2", window.innerWidth); h.setAttribute("y2", y);
        h.setAttribute("stroke", "#eee"); h.setAttribute("pointer-events", "none");
        svg.appendChild(h);
    }

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
        line.setAttribute("marker-end", "url(#arrow)");
        line.addEventListener("dblclick", () => editEdge(edge));
        svg.appendChild(line);

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
            svg.appendChild(line2);
        }

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const offset = 18;
        let fromAnchor = isNotEntity(from) ? { x: x1, y: y1 } : { x: (x1+x2)/2, y: (y1+y2)/2 };
        let toAnchor = isNotEntity(to) ? { x: x2, y: y2 } : { x: (x1+x2)/2, y: (y1+y2)/2 };

        createCardinalityText(fromAnchor.x + Math.cos(angle)*offset, fromAnchor.y + Math.sin(angle)*offset, edge, "from");
        createCardinalityText(toAnchor.x - Math.cos(angle)*offset, toAnchor.y - Math.sin(angle)*offset, edge, "to");
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

        let t = createSVG("text");
        t.setAttribute("x", shape.x+shape.w/2);
        t.setAttribute("y", shape.y+shape.h/2);
        t.setAttribute("text-anchor","middle");
        t.setAttribute("dominant-baseline","middle");
        t.textContent = shape.text;
        g.appendChild(t);

        svg.appendChild(g);
    });
}

svg.addEventListener("mousemove", e => {
    if (!dragging) return;
    dragging.x = snap(e.clientX - offsetX);
    dragging.y = snap(e.clientY - offsetY);
    render();
});
svg.addEventListener("mouseup", () => dragging = null);
svg.addEventListener("mouseleave", () => dragging = null);
svg.addEventListener("contextmenu", e => e.preventDefault());
