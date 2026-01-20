let svg = document.getElementById("canvas");
let shapes = [];
let dragging = null;
let offsetX = 0;
let offsetY = 0;

let edges = [];
let connectForm = null;

let selectedShape = null;

function createSVG(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
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

function addRect() {
    addShape("rect");
}


function addDoubleRect() {
    addShape("double-rect");
}

function addDiamond() {
    addShape("diamond");
}

function addIndentifyingRelationship() {
    addShape("idr");
}

function addCircle() {
    addShape("Cr");
}

function handleConnection(shape) {
    if (!connectForm) {
        connectForm = shape;
    } else {
        edges.push({
            from: connectForm.id,
            to: shape.id,
            fromLabel: "1",
            toLabel: "1"
        });

        connectForm = null;
        render();
    }
}

function startDrag(e) {
    let id = Number(this.getAttribute("data-id"));
    let shape = shapes.find(s => s.id === id);
    selectedShape = shape;
    
    if (e.shiftKey) {
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
})


function editText(shape) {
    let inputText = prompt("Edit text:", shape.text);
    if (inputText !== null) {
        shape.text = inputText;
        render();
    }
}

function editEdge(edge) {
    let fromLabel = prompt("From cardinality (1, N, M):", edge.fromLabel);
    let toLabel = prompt("From cardinality (1, N, M):", edge.toLabel);
    if (from != null) edge.fromLabel = fromLabel;
    if (to != null) edge.toLabel = toLabel;
    render();
}

function render() {
    svg.innerHTML = "";

    edges.forEach(edge => {
        let from = shapes.find(s => s.id === edge.from);
        let to   = shapes.find(s => s.id === edge.to);

        if (!from || !to) return;

        let x1 = from.x + from.w/2;
        let y1 = from.y + from.h/2;
        let x2 = to.x + from.w/2;
        let y2 = to.y + from.h/2;

        let line = createSVG("line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "black");
        line.setAttribute("marker-end", "url(#arrow)");
        line.addEventListener("dblclick", () => editEdge(edge));
        svg.appendChild(line);

        // Cardinality text
        let offset = 12; // distance from the arrow
        let angle = Math.atan2(y2 - y1, x2 - x1);

        // FROM label
        let fx = x1 + Math.cos(angle) * offset - 5;
        let fy = y1 + Math.sin(angle) * offset - 5;
        let t1 = createSVG("text");
        t1.setAttribute("x", fx);
        t1.setAttribute("y", fy);
        t1.setAttribute("font-size", "30");
        t1.setAttribute("fill", "black");
        t1.setAttribute("text-anchor", "middle");
        t1.setAttribute("dominant-baseline", "middle");
        t1.textContent = edge.fromLabel;
        svg.appendChild(t1);

        // TO label
        let tx = x2 - Math.cos(angle) * offset;
        let ty = y2 - Math.sin(angle) * offset;
        let t2 = createSVG("text");
        t2.setAttribute("x", tx);
        t2.setAttribute("y", ty);
        t2.setAttribute("font-size", "30");
        t2.setAttribute("fill", "black");
        t2.setAttribute("text-anchor", "middle");
        t2.setAttribute("dominant-baseline", "middle");
        t2.textContent = edge.toLabel;
        svg.appendChild(t2);
    });

    shapes.forEach(shape => {
        let g = createSVG("g");
        g.classList.add("shape");
        g.setAttribute("data-id", shape.id);
        g.addEventListener("mousedown", startDrag);
        g.addEventListener("dblclick", () => editText(shape));
    
        if (shape.type === "rect") {
            let r = createSVG("rect");
            r.setAttribute("x", shape.x);
            r.setAttribute("y", shape.y);
            r.setAttribute("width", shape.w);
            r.setAttribute("height", shape.h);
            r.setAttribute("fill", "white");
            r.setAttribute("stroke", "black");
            g.appendChild(r);
        }

        if (shape.type == "double-rect") {
            let innerRect = createSVG("rect");
            let outerRect = createSVG("rect");

            innerRect.setAttribute("x", shape.x);
            innerRect.setAttribute("y", shape.y);
            innerRect.setAttribute("width", shape.w);
            innerRect.setAttribute("height", shape.h);

            outerRect.setAttribute("x", shape.x + 5);
            outerRect.setAttribute("y", shape.y + 5);
            outerRect.setAttribute("width", shape.w - 10);
            outerRect.setAttribute("height", shape.h - 10);

            [innerRect, outerRect].forEach(Rect => {
                Rect.setAttribute("fill", "white");
                Rect.setAttribute("stroke", "black");
                g.appendChild(Rect);
            });
        }

        if (shape.type === "diamond") {
            let p = createSVG("polygon");
            let points = `
              ${shape.x + shape.w/2},${shape.y}
              ${shape.x + shape.w},${shape.y + shape.h/2}
              ${shape.x + shape.w/2},${shape.y + shape.h}
              ${shape.x},${shape.y + shape.h/2}
            `;
            p.setAttribute("points", points);
            p.setAttribute("fill", "white");
            p.setAttribute("stroke", "black");
            g.appendChild(p);
        }
    
        if (shape.type === "idr") {
            let innerP = createSVG("polygon");
            let innerPoints = `
              ${shape.x + shape.w/2},${shape.y}
              ${shape.x + shape.w},${shape.y + shape.h/2}
              ${shape.x + shape.w/2},${shape.y + shape.h}
              ${shape.x},${shape.y + shape.h/2}
            `;

            let outerP = createSVG("polygon");
            let outerPoints = `
              ${shape.x + 5 + (shape.w - 10)/2},${shape.y + 5}
              ${shape.x + 5 + (shape.w - 10)},${shape.y + 5 + (shape.h - 10)/2}
              ${shape.x + 5 + (shape.w - 10)/2},${shape.y + 5 + (shape.h - 10)}
              ${shape.x + 5},${shape.y + 5 + (shape.h - 10)/2}
            `;


            innerP.setAttribute("points", innerPoints);
            outerP.setAttribute("points", outerPoints);
            
            [innerP, outerP].forEach(p => {
                p.setAttribute("fill", "white");
                p.setAttribute("stroke", "black");
                g.appendChild(p);
            });
        }

        if (shape.type === "Cr") {
            let c = createSVG("ellipse");
            c.setAttribute("cx", shape.x + shape.w/2);
            c.setAttribute("cy", shape.y + shape.h/2);
            c.setAttribute("rx", shape.w/2);
            c.setAttribute("ry", shape.h/2);
            c.setAttribute("fill", "white");
            c.setAttribute("stroke", "black");
            g.appendChild(c);
        }

        let t = createSVG("text");
        t.setAttribute("x", shape.x + shape.w/2);
        t.setAttribute("y", shape.y + shape.h/2);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("dominant-baseline", "middle");
        t.textContent = shape.text;
        g.appendChild(t);

        svg.appendChild(g);
    });
}

svg.addEventListener("mousemove", e => {
    if (!dragging) return;
    dragging.x = e.clientX - offsetX;
    dragging.y = e.clientY - offsetY;
    render();
});

svg.addEventListener("mouseup", () => dragging = null);
svg.addEventListener("mouseleave", () => dragging = null);