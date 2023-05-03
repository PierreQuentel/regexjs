/*
  Thompson NFA Construction and Search.
*/

/*
  A state in Thompson's NFA can either have
   - a single symbol transition to a state
    or
   - up to two epsilon transitions to another states
  but not both.
*/

import { isDigit } from './tester.js'
import { show } from './visualize.js'

let state_id = {value: 0}

function createState(isEnd) {
    return {
        isEnd,
        transition: {},
        epsilonTransitions: [],
        id: state_id.value++,
        groups: groupStack.slice()
    }
}

function addEpsilonTransition(from, to) {
    from.epsilonTransitions.push(to);
}

/*
  Thompson's NFA state can have only one transition to another state for a given symbol.
*/
function addTransition(from, to, symbol) {
    from.transition[symbol] = to;
}

function addBackReference(from, to, groupNum){
    from.backReference = {groupNum, to}
}

/*
  Construct an NFA that recognizes only the empty string.
*/
function fromEpsilon() {
    const start = createState(false);
    const end = createState(true);
    addEpsilonTransition(start, end);

    return { start, end };
}

/*
   Construct an NFA that recognizes only a single character string.
*/
function fromSymbol(symbol) {
    const start = createState(false);
    const end = createState(true);
    addTransition(start, end, symbol);

    return { start, end };
}

/*
   Construct an NFA that recognizes a back reference.
*/
function fromBackReference(groupNum) {
    const start = createState(false);
    const end = createState(true);
    addBackReference(start, end, groupNum);

    return { start, end };
}

/*
   Concatenates two NFAs.
*/
function concat(first, second) {
    addEpsilonTransition(first.end, second.start);
    first.end.isEnd = false;

    return { start: first.start, end: second.end };
}

/*
   Unions two NFAs.
*/
function union(first, second) {
    const start = createState(false);
    addEpsilonTransition(start, first.start);
    addEpsilonTransition(start, second.start);

    const end = createState(true);

    addEpsilonTransition(first.end, end);
    first.end.isEnd = false;
    addEpsilonTransition(second.end, end);
    second.end.isEnd = false;

    return { start, end };
}


/*
   Apply Closure (Kleene's Star) on an NFA.
*/
function closure(nfa) {
    const start = createState(false);
    // mark closure start to evaluate group value
    nfa.start.closureStart = true;
    const end = createState(true);

    addEpsilonTransition(start, end);
    addEpsilonTransition(start, nfa.start);

    addEpsilonTransition(nfa.end, end);
    addEpsilonTransition(nfa.end, nfa.start);
    nfa.end.isEnd = false;

    return { start, end };
}

/*
    Zero-or-one of an NFA.
*/

function zeroOrOne(nfa) {
    const start = createState(false);
    const end = createState(true);

    addEpsilonTransition(start, end);
    addEpsilonTransition(start, nfa.start);

    addEpsilonTransition(nfa.end, end);
    nfa.end.isEnd = false;

    return { start, end };
}

/*
    One on more of an NFA.
*/

function oneOrMore(nfa) {
    const start = createState(false);
    const end = createState(true);
    nfa.start.closureStart = true;

    addEpsilonTransition(start, nfa.start);
    addEpsilonTransition(nfa.end, end);
    addEpsilonTransition(nfa.end, nfa.start);
    nfa.end.isEnd = false;

    return { start, end };
}

/*
  Converts a postfix regular expression into a Thompson NFA.
*/
function toNFA(postfixExp) {
    if (postfixExp === '') {
        return fromEpsilon();
    }

    const stack = [];

    for (const token of postfixExp) {
        if (token === '*') {
            stack.push(closure(stack.pop()));
        } else if (token === "?") {
            stack.push(zeroOrOne(stack.pop()));
        } else if (token === "+") {
            stack.push(oneOrMore(stack.pop()));
        } else if (token === '|') {
            const right = stack.pop();
            const left = stack.pop();
            stack.push(union(left, right));
        } else if (token === '.') {
            const right = stack.pop();
            const left = stack.pop();
            stack.push(concat(left, right));
        } else {
            stack.push(fromSymbol(token));
        }
    }

    return stack.pop();
}

/*
  Regex to NFA construction using a parse tree.
*/
import { toParseTree } from './parser2.js';

let groupNum = 0

const groupFromState = {}
const groupStack = []

function toNFAfromParseTree(root) {
    if (root.label === 'Expr') {
        const term = toNFAfromParseTree(root.children[0]);
        if (root.children.length === 3){ // Expr -> Term '|' Expr
            return union(term, toNFAfromParseTree(root.children[2]));
        }
        return term; // Expr -> Term
    }

    if (root.label === 'Term') {
        const factor = toNFAfromParseTree(root.children[0]);
        if (root.children.length === 2) // Term -> Factor Term
            return concat(factor, toNFAfromParseTree(root.children[1]));

        return factor; // Term -> Factor
    }

    if (root.label === 'Factor') {
        const atom = toNFAfromParseTree(root.children[0]);
        if (root.children.length === 2) { // Factor -> Atom MetaChar
            const meta = root.children[1].label;
            if (meta === '*')
                return closure(atom);
            if (meta === '+')
                return oneOrMore(atom);
            if (meta === '?')
                return zeroOrOne(atom);
        }

        return atom; // Factor -> Atom
    }

    if (root.label === 'Atom') {
        if (root.children.length === 3){ // Atom -> '(' Expr ')'
            // push new group number on top of groupStack
            // all the states created in this stage will have it in their
            // attribute .groups
            groupStack.push(++groupNum);
            const result = toNFAfromParseTree(root.children[1]);
            groupStack.pop();
            return result;
        }
        return toNFAfromParseTree(root.children[0]); // Atom -> Char
    }

    if (root.label === 'Char') {
        if (root.children.length === 2)  {// Char -> '\' AnyChar
            const label = root.children[1].label
            if (label.match(/^\d+$/)) {
                return fromBackReference(label)
            } else if (label == 'd') {
                return fromSymbol('\\' + label)
            }
            return fromSymbol(root.children[1].label);
        }
        return fromSymbol(root.children[0].label); // Char -> AnyCharExceptMeta
    }

    throw new Error('Unrecognized node label ' + root.label);
}

function toNFAFromInfixExp(infixExp) {
    if (infixExp === '')
        return fromEpsilon();
    groupNum = 0
    for(var key in groupFromState) {
        delete groupFromState[key]
    }
    var nfa = toNFAfromParseTree(toParseTree(infixExp));
    return nfa;
}

/*
  Process a string through an NFA by recurisively (depth-first) traversing all the possible paths until finding a matching one.

  The NFA has N states, from each state it can go to at most N possible states, yet there might be at most 2^N possible paths,
  therefore, worst case it'll end up going through all of them until it finds a match (or not), resulting in very slow runtimes.
*/
function recursiveBacktrackingSearch(state, visited, input, position) {
    if (visited.includes(state)) {
        return false;
    }

    visited.push(state);

    if (position === input.length) {
        if (state.isEnd) {
            return true;
        }

        if (state.epsilonTransitions.some(s => recursiveBacktrackingSearch(s, visited, input, position))) {
            return true;
        }
    } else {
        const nextState = state.transition[input[position]];

        if (nextState) {
            if (recursiveBacktrackingSearch(nextState, [], input, position + 1)) {
                return true;
            }
        } else {
            if (state.epsilonTransitions.some(s => recursiveBacktrackingSearch(s, visited, input, position))) {
                return true;
            }
        }

        return false;
    }
}

/*
   Follows through the epsilon transitions of a state until reaching
   a state with a symbol transition which gets added to the set of next states.
*/
function addNextState(state, nextStates, visited) {
    if (state.epsilonTransitions.length) {
        for (const st of state.epsilonTransitions) {
            if (!visited.find(vs => vs === st)) {
                visited.push(st);
                addNextState(st, nextStates, visited);
            }
        }
    } else {
        nextStates.push(state);
    }
}

function Path(state, pos, from){
    this.state = state
    this.pos = pos
    this.from = from
}

function MatchObject(lastPath, string, pos){
    this.lastPath = lastPath
    this.string = string
    this.pos = pos
}

MatchObject.prototype.groups = function(){
    var path = this.lastPath,
        groups = {},
        trans = []
    while(path.pos >= 0){
        if(path.from.state === undefined){
            console.log('no from', path)
        }
        var origin = path.from,
            isClosureStart = origin.state.closureStart
        for(var gr of path.from.state.groups){
            if(groups[gr] === undefined){
                groups[gr] = {start: path.pos, end: path.pos}
            }else if(! groups[gr].freeze){
                groups[gr].start = path.pos
                if(isClosureStart){
                    // freeze group at the last repetition
                    groups[gr].freeze = true
                }
            }
        }
        path = path.from
    }
    var result = []
    for(var group in groups){
        result.push(this.string.substring(groups[group].start, groups[group].end + 1))
    }
    return result
}

MatchObject.prototype.toString = function(){
    return `<re.MatchObject; span=(${this.pos}, ${this.lastPath.pos});` +
        ` match='${this.string.substring(this.pos, this.lastPath.pos + 1)}'>`
}

/*
  Process a string through an NFA. For each input symbol it transitions into in multiple states at the same time.
  The string is matched if after reading the last symbol, is has transitioned into at least one end state.

  For an NFA with N states in can be at at most N states at a time. This algorighm finds a match by processing the input word once.
*/
function search(nfa, word, start, endpos) {
    show(nfa);
    let currentStates = [];
    let currentPaths = []
    if(start === undefined){
        start = 0;
    }
    if(endpos === undefined){
        endpos = word.length
    }
    let firstStatePos = new Path(nfa.start, -1);

    /* The initial set of current states is either the start state or
       the set of states reachable by epsilon transitions from the start state */
    var visited = []
    addNextState(nfa.start, currentStates, visited);
    console.log('initial', nfa.start.id)
    console.log('states', currentStates.map(x => x.id), 'visited', visited.map(x => x.id))
    for(var i = 0, len = currentStates.length; i < len; i++){
        currentPaths.push(new Path(currentStates[i], pos, firstStatePos))
    }

    for (var pos = start; pos < endpos; pos++) {
        const symbol = word[pos]
        const nextStates = [];
        const nextPaths = [];
        let rank = -1;

        for (const state of currentStates) {
            console.log('symbol', symbol, 'at pos', pos, 'state', state.id)
            rank++
            const statePos = currentPaths[rank]
            if (state.backref) {
                if (pos < state.end) {
                    nextStates.push(state);
                    nextPaths.push(statePos);
                }else{
                    const nextState = state.next,
                          visited = []
                    addNextState(nextState, nextStates, visited);
                    console.log('visited', visited)
                    for(var i = before, len = nextStates.length; i < len; i++){
                        nextPaths.push(new Path(nextStates[i], pos, statePos))
                    }
                }
            }else{
                var nextState = state.transition[symbol];
                if (! nextState ) {
                    if (state.transition['\\d'] && isDigit(symbol) ){
                        nextState = state.transition['\\d']
                        console.log(symbol, 'isDigit')
                    }
                }
                if (nextState) {
                    var before = nextStates.length,
                        visited = []
                    addNextState(nextState, nextStates, visited);
                    console.log('nextState', nextState.id, 'visited', visited.map(x => x.id))
                    for(var i = before, len = nextStates.length; i < len; i++){
                        nextPaths.push(new Path(nextStates[i], pos, statePos))
                    }
                } else if (state.backReference) {
                    var groupNum = state.backReference.groupNum
                    var path = currentPaths[currentStates.indexOf(state)],
                        mo = new MatchObject(path, word),
                        groups = mo.groups()
                    if (groups[groupNum] !== undefined) {
                        if(groups[groupNum] == word.substr(pos, groups[groupNum].length)){
                            var backRefState = {
                                backref: groupNum,
                                start: pos,
                                end: pos + groups[groupNum].length - 1,
                                next: state.backReference.to,
                                groups: state.groups
                            }
                            nextStates.push(backRefState)
                            nextPaths.push(new Path(backRefState, pos, statePos))
                        }
                    }
                }
            }
        }
        if(nextStates.length == 0){
            break
        }
        currentStates = nextStates;
        currentPaths = nextPaths;
        console.log('after symbol', symbol, 'at', pos, 'states', currentStates.map(x => x.id))
    }

    let finalStates = currentStates.filter(s => s.isEnd)
    if( finalStates.length > 0 ) {
        for(var finalState of finalStates){
            var ix = currentStates.indexOf(finalState);
            var mo = new MatchObject(currentPaths[ix], word, start);
            console.log('mo', mo, 'groups', mo.groups())
        }
        return mo
    }else{
        return false;
    }
}

function recognize(nfa, word) {
    // return recursiveBacktrackingSearch(nfa.start, [], word, 0);
    return search(nfa, word);
}

import { createMatcher } from './regex.js';

const re = {
    match: function(pattern, word){
        const nfa = toNFAFromInfixExp(pattern);
        return search(nfa, word)
    },
    search: function(pattern, word){
        const nfa = toNFAFromInfixExp(pattern);
        for(var pos = 0, len = word.length; pos < len; pos++){
            var mo = search(nfa, word, pos)
            if(mo){
                console.log('search ok at pos', pos)
                return mo
            }
        }
        return false
    }
}

export {
    toNFA,
    toNFAFromInfixExp,
    recognize,
    re
};
