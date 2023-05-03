let svg = null,
    svgNS = null,
    mx = 20,
    h = 100,
    r = 10,
    dy = 5,
    nb_states,
    spaceBetweenCircles;

function draw_states(states){
    var graph = document.getElementById('graph')
    if (! graph) {
        svg   = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS(null, 'width', window.innerWidth)
        svg.setAttribute('id', 'graph')
        svgNS = svg.namespaceURI;
        document.body.appendChild(svg);
        var svgns = "http://www.w3.org/2000/svg",
            container = document.getElementById( 'graph' );

    } else {
        while(graph.firstChild) {
            graph.deleteChild(svg.firstChild)
        }
    }
    var nb_states = Object.keys(states).length;
    spaceBetweenCircles = window.innerWidth / (nb_states + 1);
    for(var state_id in states){
        var circle = document.createElementNS(svgNS, 'circle');
        var cx = 20 + state_id * spaceBetweenCircles;
        circle.setAttributeNS(null, 'cx', cx);
        circle.setAttributeNS(null, 'cy', 100);
        circle.setAttributeNS(null, 'r', 10);
        circle.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );

        var text = document.createElementNS(svgNS, 'text');
        text.appendChild(document.createTextNode(state_id))
        text.setAttributeNS(null, 'x', 15 + state_id * spaceBetweenCircles);
        text.setAttributeNS(null, 'y', 105);
        text.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );

        svg.appendChild(circle);
        svg.appendChild(text)
    }
}

function draw_line(states, from_id, to, delta){
    var y = h,
        sign = delta > 0 ? 1 : -1
    if(Math.abs(delta) == 1){
        var cx = mx + from_id * spaceBetweenCircles + sign * r,
            dest_x = mx + to[1] * spaceBetweenCircles - sign * r,
            y = h - sign * r / 2,
            d = `M${cx},${y} L${dest_x},${y}`
    }else{
        var cx = mx + from_id * spaceBetweenCircles + r * sign / 2,
            dest_x = mx + to[1] * spaceBetweenCircles - r * sign / 2,
            start_y = h - r * sign,
            y = start_y - dy * delta,
            d = `M${cx},${start_y} L${cx},${y} L${dest_x},${y} L${dest_x},${start_y}`
    }

    var stroke = sign > 0 ? 'blue' : 'red'
    var path = document.createElementNS(svgNS, 'path');
    path.setAttributeNS(null, 'd', d);
    path.setAttributeNS(null, 'style',
        `fill: none; stroke: ${stroke}; stroke-width: 1px;` );
    svg.appendChild(path);

    var path = document.createElementNS(svgNS, 'path');
    var middle = (cx + dest_x) / 2
    d = `M${middle - sign * 5},${y - 5} L${middle},${y} L${middle - sign * 5},${y + 5}`
    path.setAttributeNS(null, 'd', d);
    path.setAttributeNS(null, 'style',
        `fill: none; stroke: ${stroke}; stroke-width: 2px;` );
    svg.appendChild(path);

    var middle = (cx + dest_x) / 2
    var text = document.createElementNS(svgNS, 'text');
    var label = to[0]
    text.appendChild(document.createTextNode(label)) // symbol
    text.setAttributeNS(null, 'x', middle);
    text.setAttributeNS(null, 'y', y + (sign == 1 ? -5 : 12));
    text.setAttributeNS(null, 'style', 
        `fill: none; stroke: ${stroke}; stroke-width: 1px;` );
    svg.appendChild(text);

}

function show(nfa) {
    console.log('show', nfa)
    var states = {},
        lines_from = {},
        lines_to = {},
        nb_states = nfa.end.id
    collect_states(nfa.start, states, lines_to)

    draw_states(states)

    for(var delta = - nb_states; delta < nb_states; delta++){
        for(var state_id in states){
            for(var target of states[state_id]){
                if(target[1] == parseInt(state_id) + delta){
                    draw_line(states, state_id, target, delta)
                }
            }
        }
    }
    return
    show_state(nfa.start, {})
}

function draw_transition(from, to, symbol, dx, dy){
    console.log(symbol, 'from', from.id, 'to', to.id)
    var cx = 20 + from.id * spaceBetweenCircles + dx;
    var dest_x = 20 + to.id * spaceBetweenCircles,
        y = 90 - dy
    var d = `M${cx},90 L${cx},${y} L${dest_x},${y} L${dest_x},90`
    var path = document.createElementNS(svgNS, 'path');
    path.setAttributeNS(null, 'd', d);
    path.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );
    svg.appendChild(path);

    var text = document.createElementNS(svgNS, 'text');
    text.appendChild(document.createTextNode(symbol))
    var middle = 15 + ((from.id + to.id) / 2) * spaceBetweenCircles;
    text.setAttributeNS(null, 'x', middle);
    text.setAttributeNS(null, 'y', y - 5);
    text.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );
    svg.appendChild(text);
}

function add_line(from, to, symbol, lines_from, lines_to){
    lines_from[from.id] = lines_from[from.id] || []
    lines_from[from.id].push([symbol, to.id])
    lines_to[to.id] = lines_to[to.id] || []
    lines_to[to.id].push([symbol, from.id])
}

function addLineTo(target, from, symbol, lines_to) {
    lines_to[target.id] = lines_to[target.id] || []
    lines_to[target.id].push([symbol, from.id])
}

function collect_states(state, visited, lines_to) {
    if(visited[state.id]){
        return
    }
    visited[state.id] = []
    for(var eps of state.epsilonTransitions){
        visited[state.id].push(['ε', eps.id])
        addLineTo(eps, state, 'ε', lines_to)
        collect_states(eps, visited, lines_to)
    }
    for(var symbol in state.transition){
        var target = state.transition[symbol]
        visited[state.id].push([symbol, target.id])
        addLineTo(target, state, symbol, lines_to)
        collect_states(target, visited, lines_to)
    }
}

function show_state(state, visited, dy) {
    if(visited[state.id]){
        return
    }
    if(dy === undefined){
        dy = 10
    }
    var circle = document.createElementNS(svgNS, 'circle');
    var cx = 20 + state.id * spaceBetweenCircles;
    circle.setAttributeNS(null, 'cx', cx);
    circle.setAttributeNS(null, 'cy', 100);
    circle.setAttributeNS(null, 'r', 10);
    circle.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );

    var text = document.createElementNS(svgNS, 'text');
    text.appendChild(document.createTextNode(state.id))
    text.setAttributeNS(null, 'x', 15 + state.id * spaceBetweenCircles);
    text.setAttributeNS(null, 'y', 105);
    text.setAttributeNS(null, 'style', 'fill: none; stroke: blue; stroke-width: 1px;' );

    svg.appendChild(circle);
    svg.appendChild(text)

    visited[state.id] = true
    var dx = 0;
    for(var eps of state.epsilonTransitions){
        draw_transition(state, eps, 'ε', dx, dy)
        dy += 5
        dx += 5
        show_state(eps, visited, dy)
    }
    for(var symbol in state.transition){
        var target = state.transition[symbol]
        draw_transition(state, target, symbol, dx, dy)
        dy += 5
        dx += 5
        show_state(target, visited, dy)
    }
}

export { show }